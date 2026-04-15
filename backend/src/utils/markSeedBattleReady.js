require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('../models/Problem');

const seedTitles = [
    'Sum of Two Numbers',
    'Reverse String',
    'Is Palindrome',
    'Find Maximum',
    'Count Vowels'
];

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'algofight' });
    const result = await Problem.updateMany(
        { title: { $in: seedTitles } },
        { $set: { isBattleReady: true } }
    );
    console.log(`Marked ${result.modifiedCount} seed problems as battle-ready`);
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Failed to mark seed problems:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
    }
    process.exit(1);
});
