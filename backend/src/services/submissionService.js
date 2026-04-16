const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Submission = require('../models/Submission');
const Match = require('../models/Match');
const Problem = require('../models/Problem');
const logger = require('../config/logger');

const TEMP_DIR = path.join(__dirname, '../../../executor/temp');
const CASE_VISIBILITY = Object.freeze({
    SAMPLE: 'sample',
    HIDDEN: 'hidden',
    EDGE: 'edge'
});

const normalizeVisibility = (value, fallback = CASE_VISIBILITY.HIDDEN) => {
    if (!value) return fallback;
    const normalized = String(value).toLowerCase();

    if (['sample', 'public', 'example'].includes(normalized)) return CASE_VISIBILITY.SAMPLE;
    if (['edge', 'edgecase', 'edge_case', 'corner', 'cornercase'].includes(normalized)) return CASE_VISIBILITY.EDGE;
    if (['hidden', 'private', 'secret'].includes(normalized)) return CASE_VISIBILITY.HIDDEN;

    return fallback;
};

const resolveExpectedValue = (testCase = {}) => {
    if (Object.prototype.hasOwnProperty.call(testCase, 'expected')) return testCase.expected;
    if (Object.prototype.hasOwnProperty.call(testCase, 'expectedOutput')) return testCase.expectedOutput;
    return undefined;
};

const normalizeTestCase = (testCase, defaultVisibility) => {
    if (!testCase || typeof testCase !== 'object') return null;

    const expected = resolveExpectedValue(testCase);
    if (typeof expected === 'undefined') return null;

    const visibility = normalizeVisibility(
        testCase.visibility || testCase.caseType || testCase.category || testCase.type || (testCase.isHidden ? 'hidden' : undefined),
        defaultVisibility
    );

    return {
        input: testCase.input,
        expected,
        visibility
    };
};

const normalizeCaseList = (list, defaultVisibility) => {
    if (!Array.isArray(list)) return [];
    return list.map((testCase) => normalizeTestCase(testCase, defaultVisibility)).filter(Boolean);
};

const dedupeCases = (cases) => {
    const seen = new Set();
    const output = [];

    for (const testCase of cases) {
        const key = JSON.stringify([testCase.input, testCase.expected, testCase.visibility]);
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(testCase);
    }

    return output;
};

const buildSubmissionSuites = (problem) => {
    const primaryCases = normalizeCaseList(problem?.testCases, CASE_VISIBILITY.HIDDEN);
    const sampleFromSeparate = normalizeCaseList(problem?.sampleTestCases, CASE_VISIBILITY.SAMPLE);
    const hiddenFromSeparate = normalizeCaseList(problem?.hiddenTestCases, CASE_VISIBILITY.HIDDEN);
    const edgeFromSeparate = normalizeCaseList(problem?.edgeTestCases, CASE_VISIBILITY.EDGE);
    const edgeFromAlias = normalizeCaseList(problem?.edgeCases, CASE_VISIBILITY.EDGE);

    const hasSeparateBuckets =
        sampleFromSeparate.length > 0 ||
        hiddenFromSeparate.length > 0 ||
        edgeFromSeparate.length > 0 ||
        edgeFromAlias.length > 0;

    const primarySamples = primaryCases.filter((testCase) => testCase.visibility === CASE_VISIBILITY.SAMPLE);
    const primaryHidden = primaryCases.filter((testCase) => testCase.visibility === CASE_VISIBILITY.HIDDEN);
    const primaryEdge = primaryCases.filter((testCase) => testCase.visibility === CASE_VISIBILITY.EDGE);

    let sampleCases = [];
    let hiddenCases = [];
    let edgeCases = [];

    if (hasSeparateBuckets) {
        sampleCases = dedupeCases([...sampleFromSeparate, ...primarySamples]);
        hiddenCases = dedupeCases([...hiddenFromSeparate, ...primaryHidden]);
        edgeCases = dedupeCases([...edgeFromSeparate, ...edgeFromAlias, ...primaryEdge]);
    } else if (primarySamples.length > 0 || primaryEdge.length > 0) {
        sampleCases = dedupeCases(primarySamples);
        hiddenCases = dedupeCases(primaryHidden);
        edgeCases = dedupeCases(primaryEdge);
    } else {
        // Legacy fallback: first two become sample, the rest hidden.
        sampleCases = primaryCases
            .slice(0, Math.min(2, primaryCases.length))
            .map((testCase) => ({ ...testCase, visibility: CASE_VISIBILITY.SAMPLE }));
        hiddenCases = primaryCases
            .slice(sampleCases.length)
            .map((testCase) => ({ ...testCase, visibility: CASE_VISIBILITY.HIDDEN }));
        edgeCases = [];
    }

    return {
        sampleCases,
        hiddenCases,
        edgeCases,
        submissionCases: dedupeCases([...sampleCases, ...hiddenCases, ...edgeCases])
    };
};

// Helper to execute code in Docker
const executeCode = async (code, language, inputStr) => {
    const runId = uuidv4();
    const isPython = language === 'python';
    const isCpp = language === 'cpp';
    const fileName = isPython ? 'main.py' : (isCpp ? 'main.cpp' : 'main.js');
    
    const runDir = path.join(TEMP_DIR, runId);
    const filePath = path.join(runDir, fileName);
    const inputPath = path.join(runDir, 'input.txt');

    try {
        await fs.mkdir(runDir, { recursive: true });
        
        let fileContent = code;
        let command = '';

        if (isPython) {
            command = `docker run --rm -v "${runDir}":/code --net none --memory=256m --cpus=1 algofight-executor bash -c "timeout 2s python3 /code/main.py < /code/input.txt"`;
        } else if (isCpp) {
            command = `docker run --rm -v "${runDir}":/code --net none --memory=256m --cpus=1 algofight-executor bash -c "g++ /code/main.cpp -o /code/main.out && timeout 2s /code/main.out < /code/input.txt"`;
        } else {
            // Assume Javascript
            command = `docker run --rm -v "${runDir}":/code --net none --memory=256m --cpus=1 algofight-executor bash -c "timeout 2s node /code/main.js < /code/input.txt"`;
        }

        await fs.writeFile(filePath, fileContent);
        // Input string from problem.testCases (which might be an array or object in MongoDB)
        // Convert to string safely if it's an object/array, else stringify primitive
        const finalInput = typeof inputStr === 'string' ? inputStr : JSON.stringify(inputStr);
        await fs.writeFile(inputPath, finalInput);

        const startTime = Date.now();
        const { stdout, stderr } = await new Promise((resolve, reject) => {
            exec(command, { timeout: 3000 }, (error, stdout, stderr) => {
                if (error) {
                    if (error.code === 124 || error.killed) reject(new Error('Time Limit Exceeded'));
                    else reject(error || new Error(stderr));
                } else resolve({ stdout, stderr });
            });
        });
        const executionTime = Date.now() - startTime;
        
        await fs.rm(runDir, { recursive: true, force: true });
        return { output: stdout.trim(), executionTime, error: null };
    } catch (err) {
        await fs.rm(runDir, { recursive: true, force: true }).catch(() => {});
        return { 
            output: null, 
            executionTime: err.message === 'Time Limit Exceeded' ? 2000 : 0, 
            error: err.message === 'Time Limit Exceeded' ? 'TLE' : 'Runtime Error' 
        };
    }
};
const processSubmission = async (userId, matchId, code, language, problemId, io) => {
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'active') throw new Error('Match not active or not found');

    const normalizedUserId = String(userId);
    const isParticipant =
        String(match.player1 || '') === normalizedUserId ||
        String(match.player2 || '') === normalizedUserId;

    if (!isParticipant) {
        throw new Error('User is not a participant in this match');
    }

    const problem = await Problem.findById(problemId);
    if (!problem) throw new Error('Problem not found');

    const suites = buildSubmissionSuites(problem);
    const submissionCases = suites.submissionCases;
    if (submissionCases.length === 0) {
        throw new Error('No test cases configured for this problem');
    }

    let passedCases = 0;
    let totalTime = 0;
    let finalVerdict = 'Accepted';
    let testResultsData = [];

    // Run against complete suite (sample + hidden + edge) before accepting submission.
    for (const tc of submissionCases) {
        const { output, executionTime, error } = await executeCode(code, language, tc.input);
        totalTime += executionTime;

        const expectedValue = resolveExpectedValue(tc);
        const expectedStr = String(expectedValue).trim();
        const caseVisibility = normalizeVisibility(tc.visibility, CASE_VISIBILITY.HIDDEN);
        const revealCaseDetails = caseVisibility === CASE_VISIBILITY.SAMPLE;
        const safeInput = revealCaseDetails ? String(tc.input) : `[${caseVisibility} testcase]`;
        const safeExpected = revealCaseDetails ? expectedStr : '[hidden]';

        if (error === 'TLE') {
            finalVerdict = 'Time Limit Exceeded';
            testResultsData.push({
                input: safeInput,
                expectedOutput: safeExpected,
                actualOutput: revealCaseDetails ? 'N/A' : '[hidden]',
                passed: false
            });
            break;
        } else if (error) {
            finalVerdict = 'Runtime Error';
            testResultsData.push({
                input: safeInput,
                expectedOutput: safeExpected,
                actualOutput: revealCaseDetails ? 'ERROR' : '[hidden]',
                passed: false
            });
            break;
        } else if (output !== expectedStr) {
            finalVerdict = 'Wrong Answer';
            testResultsData.push({
                input: safeInput,
                expectedOutput: safeExpected,
                actualOutput: revealCaseDetails ? output : '[hidden]',
                passed: false
            });
            break;
        }
        
        passedCases++;
        testResultsData.push({
            input: safeInput,
            expectedOutput: safeExpected,
            actualOutput: revealCaseDetails ? output : '[hidden]',
            passed: true
        });
    }

    const isAccepted = finalVerdict === 'Accepted';
    const failedCases = testResultsData
        .filter((testResult) => !testResult.passed && !String(testResult.input).startsWith('['))
        .map((testResult) => ({
            input: testResult.input,
            output: testResult.expectedOutput,
            got: testResult.actualOutput
        }));

    const submission = await Submission.create({
        matchId,
        userId,
        code,
        language,
        status: isAccepted ? 'passed' : 'failed',
        executionTime: totalTime,
        verdict: finalVerdict,
        testResults: testResultsData,
        passedCases,
        totalCases: submissionCases.length
    });

    match.submissions.push(submission._id);
    await match.save();

    // Real-Time Socket Updates
    if (io) {
        io.to(matchId).emit('submission_result', {
            userId,
            verdict: finalVerdict,
            passedCases,
            totalCases: submissionCases.length
        });
    }

    // Checking Winner logic inline here 
    if (isAccepted) {
        // Did anyone else pass before me?
        const priorWinner = await Submission.findOne({ matchId, status: 'passed', userId: { $ne: userId } });
        
        if (!priorWinner && match.status === 'active') {
            match.winner = userId;
            match.status = 'completed';
            match.endTime = new Date();
            await match.save();

            if (io) {
                io.to(matchId).emit('battle_result', {
                    winner: userId,
                    reason: 'Correct solution submitted fastest'
                });
            }
            logger.info(`Match ${matchId} completed. Winner: ${userId}`);
        }
    }

    return {
        passed: isAccepted,
        totalTestCases: submissionCases.length,
        passedTestCases: passedCases,
        failedCases,
        testCasesPassed: passedCases,
        executionTime: totalTime,
        verdict: finalVerdict
    };
};

module.exports = { processSubmission, executeCode };
