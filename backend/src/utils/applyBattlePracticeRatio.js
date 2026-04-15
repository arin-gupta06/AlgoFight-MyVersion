require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('../models/Problem');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'algofight' });

    const backfillResult = await Problem.updateMany(
        {
            $or: [
                { mode: { $exists: false } },
                { mode: null }
            ]
        },
        { $set: { mode: 'battle' } }
    );

    let datasetProblems = await Problem.find({ source: 'dataset100' })
        .select('_id importOrder createdAt title')
        .sort({ importOrder: 1, createdAt: 1, title: 1 })
        .lean();

    let usedFallbackPool = false;
    if (datasetProblems.length === 0) {
        datasetProblems = await Problem.find({ isBattleReady: false })
            .select('_id importOrder createdAt title')
            .sort({ createdAt: 1, title: 1 })
            .lean();
        usedFallbackPool = true;
    }

    if (datasetProblems.length === 0) {
        console.log('No candidate problems found. Nothing to rebalance.');
        await mongoose.disconnect();
        return;
    }

    const total = datasetProblems.length;
    const battleCount = Math.max(1, Math.floor(total * 0.8));

    const battleIds = datasetProblems.slice(0, battleCount).map((p) => p._id);
    const practiceIds = datasetProblems.slice(battleCount).map((p) => p._id);

    const battleResult = await Problem.updateMany(
        { _id: { $in: battleIds } },
        { $set: { mode: 'battle', isBattleReady: true } }
    );

    let practiceResult = { modifiedCount: 0 };
    if (practiceIds.length > 0) {
        practiceResult = await Problem.updateMany(
            { _id: { $in: practiceIds } },
            { $set: { mode: 'practice', isBattleReady: false } }
        );
    }

    if (usedFallbackPool) {
        const writeOrderOps = datasetProblems.map((problem, idx) => ({
            updateOne: {
                filter: { _id: problem._id },
                update: {
                    $set: {
                        source: 'dataset100',
                        importOrder: idx + 1
                    }
                }
            }
        }));
        await Problem.bulkWrite(writeOrderOps, { ordered: false });
    }

    console.log(`Rebalanced target problems. Battle: ${battleIds.length}, Practice: ${practiceIds.length}`);
    console.log(`Pool mode: ${usedFallbackPool ? 'fallback-non-battle-ready' : 'dataset100-source'}`);
    console.log(`Backfilled legacy mode docs: ${backfillResult.modifiedCount}`);
    console.log(`Updated battle docs: ${battleResult.modifiedCount}, practice docs: ${practiceResult.modifiedCount}`);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Rebalance failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
    }
    process.exit(1);
});
