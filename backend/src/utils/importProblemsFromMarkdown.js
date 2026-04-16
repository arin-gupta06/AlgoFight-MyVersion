const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const Problem = require('../models/Problem');

const DEFAULT_SOURCE_PATH = path.join(__dirname, '../../../algofight_100_questions.md');

const getArgValue = (name) => {
    const arg = process.argv.find((item) => item.startsWith(`${name}=`));
    if (!arg) return null;
    return arg.slice(name.length + 1).trim();
};

const hasFlag = (flag) => process.argv.includes(flag);

const toSlug = (value) => {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const normalizeTitle = (rawTitle) => {
    return String(rawTitle || '')
        .replace(/^\d+\.\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const parseCategory = (line) => {
    const clean = line
        .replace(/^##\s*/, '')
        .replace(/[🟢🟡🟠🔴⚫️⚔️]/g, '')
        .trim();

    const match = clean.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (!match) {
        return {
            name: clean,
            rangeStart: null,
            rangeEnd: null
        };
    }

    const name = match[1].trim();
    const rangeToken = match[2].replace(/[–—]/g, '-');
    const [startStr, endStr] = rangeToken.split('-').map((x) => x.trim());

    return {
        name,
        rangeStart: Number.isFinite(Number(startStr)) ? Number(startStr) : null,
        rangeEnd: Number.isFinite(Number(endStr)) ? Number(endStr) : null
    };
};

const splitCaseNotes = (noteLine) => {
    return String(noteLine || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const deriveDifficulty = (problemNumber) => {
    if (problemNumber <= 35) return 'easy';
    if (problemNumber <= 70) return 'medium';
    return 'hard';
};

const buildStarterCode = () => ({
    javascript: [
        'function solution(input) {',
        '  // TODO: implement solution',
        '  return input;',
        '}'
    ].join('\n'),
    python: [
        'def solution(input_data):',
        '    # TODO: implement solution',
        '    return input_data'
    ].join('\n'),
    cpp: [
        '#include <bits/stdc++.h>',
        'using namespace std;',
        '',
        'int main() {',
        '    // TODO: implement solution',
        '    return 0;',
        '}'
    ].join('\n')
});

const buildConstraints = (difficulty) => {
    if (difficulty === 'easy') {
        return '1 <= n <= 1e4. Optimize for clarity and correctness.';
    }
    if (difficulty === 'medium') {
        return '1 <= n <= 1e5. Expected near-linear or n log n solutions.';
    }
    return '1 <= n <= 2e5. Requires optimized data structures and careful edge-case handling.';
};

const createTestCase = (note, hidden, categoryHint) => {
    const normalizedNote = String(note || 'general case').trim();
    const io = `Case: ${normalizedNote}`;
    const expected = `Expected behavior: handle ${normalizedNote} correctly`;

    const visibility = hidden
        ? (normalizedNote.toLowerCase().includes('edge') ? 'edge' : 'hidden')
        : 'sample';

    return {
        input: io,
        output: expected,
        expected,
        expectedOutput: expected,
        hidden,
        visibility,
        caseType: visibility,
        tags: categoryHint ? [categoryHint] : []
    };
};

const ensureMinCases = (visibleCases, hiddenCases, categorySlug) => {
    const outputVisible = [...visibleCases];
    const outputHidden = [...hiddenCases];

    while (outputVisible.length < 2) {
        const idx = outputVisible.length + 1;
        outputVisible.push(createTestCase(`baseline visible case ${idx}`, false, categorySlug));
    }

    while (outputHidden.length < 3) {
        const idx = outputHidden.length + 1;
        outputHidden.push(createTestCase(`hidden robustness case ${idx}`, true, categorySlug));
    }

    return {
        visible: outputVisible,
        hidden: outputHidden
    };
};

const buildTags = (categoryName, title) => {
    const categoryTags = String(categoryName || '')
        .split(/[&/,]/)
        .map((x) => toSlug(x))
        .filter(Boolean);

    const titleTags = String(title || '')
        .split(/\s+/)
        .map((x) => toSlug(x))
        .filter((x) => x.length >= 3)
        .slice(0, 3);

    return Array.from(new Set([...categoryTags, ...titleTags]));
};

const parseProblemsFromMarkdown = (markdown) => {
    const lines = markdown.split(/\r?\n/);

    let currentCategory = { name: 'General', rangeStart: null, rangeEnd: null };
    let currentProblem = null;
    const problems = [];

    const flushCurrent = () => {
        if (!currentProblem) return;
        problems.push(currentProblem);
        currentProblem = null;
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('## ')) {
            flushCurrent();
            currentCategory = parseCategory(trimmed);
            continue;
        }

        const problemMatch = trimmed.match(/^###\s+(\d+)\.\s+(.+)$/);
        if (problemMatch) {
            flushCurrent();
            currentProblem = {
                number: Number(problemMatch[1]),
                title: normalizeTitle(problemMatch[2]),
                category: currentCategory.name,
                edgeLine: '',
                hiddenLine: ''
            };
            continue;
        }

        if (!currentProblem) continue;

        const edgeMatch = trimmed.match(/^-\s*Edge\s*:\s*(.+)$/i);
        if (edgeMatch) {
            currentProblem.edgeLine = edgeMatch[1].trim();
            continue;
        }

        const hiddenMatch = trimmed.match(/^-\s*Hidden\s*:\s*(.+)$/i);
        if (hiddenMatch) {
            currentProblem.hiddenLine = hiddenMatch[1].trim();
            continue;
        }
    }

    flushCurrent();

    return problems;
};

const buildProblemDocument = (entry, options = {}) => {
    const { battleReady = null } = options;
    const difficulty = deriveDifficulty(entry.number);
    const categorySlug = toSlug(entry.category);
    const mode = entry.number <= 80 ? 'battle' : 'practice';
    const isBattleReady = typeof battleReady === 'boolean' ? battleReady : mode === 'battle';
    const edgeCases = splitCaseNotes(entry.edgeLine);
    const hiddenCases = splitCaseNotes(entry.hiddenLine);

    const visibleTestCases = edgeCases.map((note) => createTestCase(note, false, categorySlug));
    const hiddenTestCases = [
        ...hiddenCases.map((note) => createTestCase(note, true, categorySlug)),
        ...edgeCases.map((note) => createTestCase(`edge stress: ${note}`, true, categorySlug))
    ];

    const ensured = ensureMinCases(visibleTestCases, hiddenTestCases, categorySlug);

    const examples = ensured.visible.slice(0, 2).map((testCase) => ({
        input: String(testCase.input),
        output: String(testCase.output)
    }));

    return {
        title: entry.title,
        difficulty,
        mode,
        source: 'dataset100',
        importOrder: entry.number,
        description: `${entry.title} challenge in ${entry.category}. Solve correctly and handle all edge and hidden scenarios.`,
        constraints: buildConstraints(difficulty),
        tags: buildTags(entry.category, entry.title),
        starterCode: buildStarterCode(),
        examples,
        testCases: [...ensured.visible, ...ensured.hidden],
        createdAt: new Date(),
        isBattleReady,
        example: examples[0] ? `${examples[0].input} -> ${examples[0].output}` : undefined,
        timeLimit: 3000
    };
};

const validateProblemDocument = (problemDoc) => {
    const errors = [];

    if (!problemDoc.title) {
        errors.push('title is required');
    }

    if (!Array.isArray(problemDoc.testCases) || problemDoc.testCases.length < 5) {
        errors.push('at least 5 test cases are required');
    }

    const visibleCount = (problemDoc.testCases || []).filter((tc) => tc.hidden === false).length;
    const hiddenCount = (problemDoc.testCases || []).filter((tc) => tc.hidden === true).length;

    if (visibleCount < 2) {
        errors.push('at least 2 visible test cases are required');
    }

    if (hiddenCount < 3) {
        errors.push('at least 3 hidden test cases are required');
    }

    return errors;
};

const ensureUniqueTitles = (problems) => {
    const seen = new Map();

    return problems.map((problem) => {
        const title = String(problem.title || '').trim();
        const count = seen.get(title) || 0;
        seen.set(title, count + 1);

        if (count === 0) {
            return problem;
        }

        const suffixTag = (problem.tags && problem.tags[0]) ? problem.tags[0] : 'variant';
        return {
            ...problem,
            title: `${title} (${suffixTag}-${count + 1})`
        };
    });
};

const run = async () => {
    const sourcePath = getArgValue('--source') || DEFAULT_SOURCE_PATH;
    const dryRun = hasFlag('--dry-run');
    const replaceExisting = hasFlag('--replace-existing');
    const battleReady = hasFlag('--battle-ready') ? true : null;

    const markdown = await fs.readFile(sourcePath, 'utf8');
    const parsed = parseProblemsFromMarkdown(markdown);

    if (parsed.length === 0) {
        throw new Error('No problems were parsed from dataset file');
    }

    const built = parsed.map((entry) => buildProblemDocument(entry, { battleReady }));
    const unique = ensureUniqueTitles(built);

    if (unique.length !== 100) {
        console.warn(`Warning: Expected 100 unique problems, parsed ${unique.length}`);
    }

    const validationErrors = [];
    for (const problemDoc of unique) {
        const errors = validateProblemDocument(problemDoc);
        if (errors.length > 0) {
            validationErrors.push({ title: problemDoc.title, errors });
        }
    }

    if (validationErrors.length > 0) {
        console.error('Validation failed for one or more problems:');
        for (const issue of validationErrors) {
            console.error(`- ${issue.title}: ${issue.errors.join('; ')}`);
        }
        process.exit(1);
    }

    if (dryRun) {
        console.log(`Dry run successful. Parsed ${unique.length} valid problems from ${sourcePath}`);
        process.exit(0);
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI not found in environment');
    }

    await mongoose.connect(process.env.MONGO_URI, { dbName: 'algofight' });

    const operations = unique.map((problemDoc) => ({
        updateOne: {
            filter: { title: problemDoc.title },
            update: replaceExisting
                ? { $set: problemDoc }
                : { $setOnInsert: problemDoc },
            upsert: true
        }
    }));

    const writeResult = await Problem.bulkWrite(operations, { ordered: false });
    const insertedCount = writeResult.upsertedCount || 0;
    const modifiedCount = writeResult.modifiedCount || 0;
    const matchedCount = writeResult.matchedCount || 0;

    if (!replaceExisting) {
        console.log(`Inserted ${insertedCount} new problems into algofight.problems`);
        console.log(`Skipped ${matchedCount} existing problems with duplicate titles`);
    } else {
        console.log(`Inserted ${insertedCount} and updated ${modifiedCount} problems in algofight.problems`);
    }

    await mongoose.disconnect();
    process.exit(0);
};

run().catch(async (error) => {
    console.error(`Import failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
    }
    process.exit(1);
});
