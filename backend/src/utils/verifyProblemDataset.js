require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('../models/Problem');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'algofight' });

    const total = await Problem.countDocuments();
    const stats = await Problem.aggregate([
        {
            $project: {
                visibleCount: {
                    $size: {
                        $filter: {
                            input: '$testCases',
                            as: 'tc',
                            cond: {
                                $or: [
                                    { $eq: ['$$tc.hidden', false] },
                                    { $eq: ['$$tc.visibility', 'sample'] }
                                ]
                            }
                        }
                    }
                },
                hiddenCount: {
                    $size: {
                        $filter: {
                            input: '$testCases',
                            as: 'tc',
                            cond: {
                                $or: [
                                    { $eq: ['$$tc.hidden', true] },
                                    {
                                        $and: [
                                            { $ne: ['$$tc.visibility', null] },
                                            { $ne: ['$$tc.visibility', 'sample'] }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        {
            $group: {
                _id: null,
                minVisible: { $min: '$visibleCount' },
                minHidden: { $min: '$hiddenCount' }
            }
        }
    ]);

    console.log('Problem count:', total);
    console.log('Dataset minimums:', stats[0] || { minVisible: 0, minHidden: 0 });
    console.log('Battle-ready count:', await Problem.countDocuments({ isBattleReady: true }));
    const practiceCount = await Problem.countDocuments({ mode: 'practice' });
    const explicitBattleCount = await Problem.countDocuments({ mode: 'battle' });
    const missingModeCount = await Problem.countDocuments({
        $or: [
            { mode: { $exists: false } },
            { mode: null }
        ]
    });

    console.log('Mode distribution:', {
        battle: explicitBattleCount,
        practice: practiceCount,
        missingMode: missingModeCount,
        battleEffective: explicitBattleCount + missingModeCount
    });

    const offenders = await Problem.aggregate([
        {
            $project: {
                title: 1,
                visibleCount: {
                    $size: {
                        $filter: {
                            input: '$testCases',
                            as: 'tc',
                            cond: {
                                $or: [
                                    { $eq: ['$$tc.hidden', false] },
                                    { $eq: ['$$tc.visibility', 'sample'] }
                                ]
                            }
                        }
                    }
                },
                hiddenCount: {
                    $size: {
                        $filter: {
                            input: '$testCases',
                            as: 'tc',
                            cond: {
                                $or: [
                                    { $eq: ['$$tc.hidden', true] },
                                    {
                                        $and: [
                                            { $ne: ['$$tc.visibility', null] },
                                            { $ne: ['$$tc.visibility', 'sample'] }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        {
            $match: {
                $or: [
                    { visibleCount: { $lt: 2 } },
                    { hiddenCount: { $lt: 3 } }
                ]
            }
        },
        { $limit: 10 }
    ]);

    console.log('First violating problems:', offenders);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Verification failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
    }
    process.exit(1);
});
