require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('../models/Problem');

const normalizeVisibility = (testCase) => {
    if (typeof testCase.hidden === 'boolean') {
        return testCase.hidden ? 'hidden' : 'sample';
    }
    if (testCase.visibility) {
        return testCase.visibility;
    }
    return 'hidden';
};

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'algofight' });

    const problems = await Problem.find({}).lean();
    let updatedCount = 0;

    for (const problem of problems) {
        if (!Array.isArray(problem.testCases) || problem.testCases.length === 0) {
            continue;
        }

        const testCases = problem.testCases.map((testCase) => ({ ...testCase }));

        while (testCases.length < 5) {
            const seedCase = testCases[0] || {
                input: 'Case: fallback',
                output: 'Expected behavior: fallback',
                expected: 'Expected behavior: fallback',
                expectedOutput: 'Expected behavior: fallback'
            };

            testCases.push({
                ...seedCase,
                input: `${seedCase.input} (auto-added ${testCases.length + 1})`,
                hidden: true,
                visibility: 'hidden'
            });
        }

        for (const testCase of testCases) {
            if (typeof testCase.output === 'undefined') {
                testCase.output = typeof testCase.expected !== 'undefined'
                    ? testCase.expected
                    : testCase.expectedOutput;
            }
            if (typeof testCase.expected === 'undefined') {
                testCase.expected = testCase.output;
            }
            if (typeof testCase.expectedOutput === 'undefined') {
                testCase.expectedOutput = testCase.output;
            }

            const visibility = normalizeVisibility(testCase);
            testCase.visibility = visibility;
            testCase.hidden = visibility !== 'sample';
        }

        let visibleIndices = testCases
            .map((testCase, idx) => ({ idx, isVisible: testCase.visibility === 'sample' || testCase.hidden === false }))
            .filter((entry) => entry.isVisible)
            .map((entry) => entry.idx);

        if (visibleIndices.length < 2) {
            for (let i = 0; i < testCases.length && visibleIndices.length < 2; i += 1) {
                if (!visibleIndices.includes(i)) {
                    testCases[i].hidden = false;
                    testCases[i].visibility = 'sample';
                    visibleIndices.push(i);
                }
            }
        }

        let hiddenIndices = testCases
            .map((testCase, idx) => ({ idx, isHidden: testCase.hidden === true || testCase.visibility !== 'sample' }))
            .filter((entry) => entry.isHidden)
            .map((entry) => entry.idx);

        if (hiddenIndices.length < 3) {
            for (let i = testCases.length - 1; i >= 0 && hiddenIndices.length < 3; i -= 1) {
                if (!hiddenIndices.includes(i)) {
                    testCases[i].hidden = true;
                    testCases[i].visibility = 'hidden';
                    hiddenIndices.push(i);
                }
            }
        }

        const currentVisible = testCases.filter((testCase) => testCase.hidden === false || testCase.visibility === 'sample').length;
        const currentHidden = testCases.filter((testCase) => testCase.hidden === true || testCase.visibility !== 'sample').length;

        if (currentVisible >= 2 && currentHidden >= 3) {
            await Problem.updateOne(
                { _id: problem._id },
                { $set: { testCases } }
            );
            updatedCount += 1;
        }
    }

    console.log(`Normalized testcase visibility for ${updatedCount} problems`);
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Normalization failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
    }
    process.exit(1);
});
