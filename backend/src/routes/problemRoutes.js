const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');

const toPublicProblem = (problemDoc) => {
    const source = typeof problemDoc.toObject === 'function' ? problemDoc.toObject() : problemDoc;
    const visibleTestCases = (source.testCases || []).filter((testCase) => testCase.hidden === false || testCase.visibility === 'sample');

    return {
        _id: source._id,
        title: source.title,
        description: source.description,
        constraints: source.constraints || '',
        examples: source.examples || [],
        starterCode: source.starterCode || { javascript: '', python: '' },
        testCases: visibleTestCases.map((testCase) => ({
            input: String(testCase.input),
            output: String(testCase.output ?? testCase.expected ?? testCase.expectedOutput ?? '')
        })),
        difficulty: source.difficulty,
        mode: source.mode || 'battle',
        tags: source.tags || [],
        createdAt: source.createdAt
    };
};

/**
 * @desc    Get all problems (paginated)
 * @route   GET /api/problems
 * @access  Public
 */
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const difficulty = req.query.difficulty;
        const mode = req.query.mode;
        const tags = req.query.tags;
        const battleReady = req.query.battleReady;

        const filter = {};
        if (difficulty) {
            filter.difficulty = difficulty;
        }
        if (mode) {
            filter.mode = mode;
        }
        if (typeof battleReady !== 'undefined') {
            filter.isBattleReady = String(battleReady).toLowerCase() === 'true';
        }
        if (tags) {
            const tagList = String(tags)
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
            if (tagList.length > 0) {
                filter.tags = { $in: tagList };
            }
        }

        const [problems, total] = await Promise.all([
            Problem.find(filter)
                .select('title difficulty mode tags timeLimit createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Problem.countDocuments(filter)
        ]);

        res.json({
            problems,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @desc    Get single problem by ID
 * @route   GET /api/problems/:id
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
    try {
        const problem = await Problem.findById(req.params.id);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        res.json(toPublicProblem(problem));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
