const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Submission = require('../models/Submission');
const Match = require('../models/Match');
const Problem = require('../models/Problem');
const logger = require('../config/logger');

const TEMP_DIR = path.join(__dirname, '../../../executor/temp');

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

    const problem = await Problem.findById(problemId);
    if (!problem) throw new Error('Problem not found');

    let passedCases = 0;
    let totalTime = 0;
    let finalVerdict = 'Accepted';
    let testResultsData = [];

    // Run against all hidden test cases
    for (const tc of problem.testCases) {
        const { output, executionTime, error } = await executeCode(code, language, tc.input);
        totalTime += executionTime;

        // Verify output exactly
        // MongoDB might store integer expected values, convert to String explicitly
        const expectedStr = String(tc.expected).trim();

        if (error === 'TLE') {
            finalVerdict = 'Time Limit Exceeded';
            testResultsData.push({ input: String(tc.input), expectedOutput: expectedStr, actualOutput: 'N/A', passed: false });
            break;
        } else if (error) {
            finalVerdict = 'Runtime Error';
            testResultsData.push({ input: String(tc.input), expectedOutput: expectedStr, actualOutput: 'ERROR', passed: false });
            break;
        } else if (output !== expectedStr) {
            finalVerdict = 'Wrong Answer';
            testResultsData.push({ input: String(tc.input), expectedOutput: expectedStr, actualOutput: output, passed: false });
            break;
        }
        
        passedCases++;
        testResultsData.push({ input: String(tc.input), expectedOutput: expectedStr, actualOutput: output, passed: true });
    }

    const isAccepted = finalVerdict === 'Accepted';

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
        totalCases: problem.testCases.length
    });

    match.submissions.push(submission._id);
    await match.save();

    // Real-Time Socket Updates
    if (io) {
        io.to(matchId).emit('submission_result', {
            userId,
            verdict: finalVerdict,
            passedCases,
            totalCases: problem.testCases.length
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
        testCasesPassed: passedCases,
        totalTestCases: problem.testCases.length,
        executionTime: totalTime,
        verdict: finalVerdict
    };
};

module.exports = { processSubmission, executeCode };
