const { processSubmission } = require('../services/submissionService');
const Submission = require('../models/Submission');
const Match = require('../models/Match');
const logger = require('../config/logger');

/**
 * @desc    Submit code for a match
 * @route   POST /api/submit
 * @access  Private
 */
exports.submitCode = async (req, res, next) => {
    try {
        // Allow fallback to generic body vars so legacy calls matching problemId/userId work as well
        const { matchId, code, language, problemId } = req.body;
        
        // Grab io reference from app so it can push updates over socket
        const io = req.app.get('io');
        const userId = req.user._id;

        const submissionResult = await processSubmission(
            userId,
            matchId,
            code,
            language,
            problemId,
            io
        );

        res.status(201).json(submissionResult);
    } catch (error) {
        // Handle known business errors with 400
        if (error.message.includes('not found') ||
            error.message.includes('not active') ||
            error.message.includes('not a participant') ||
            error.message.includes('expired')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * @desc    Get submissions for a match
 * @route   GET /api/submit/:matchId
 * @access  Private
 */
exports.getSubmissions = async (req, res, next) => {
    try {
        const match = await Match.findById(req.params.matchId)
            .select('player1 player2');

        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        const requesterId = String(req.user._id);
        const isParticipant =
            String(match.player1 || '') === requesterId ||
            String(match.player2 || '') === requesterId;

        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not a participant in this match' });
        }

        const submissions = await Submission.find({ matchId: req.params.matchId })
            .populate('userId', 'username')
            .sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (error) {
        next(error);
    }
};
