const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        unique: true,
        sparse: true
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        minlength: 3
    },
    displayName: {
        type: String,
        default: 'New Player'
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        minlength: 6
    },
    photoURL: {
        type: String
    },
    rating: {
        type: Number,
        default: 1200
    },
    matchesPlayed: {
        type: Number,
        default: 0
    },
    matchesWon: {
        type: Number,
        default: 0
    },
    practiceSolvedCount: {
        type: Number,
        default: 0
    },
    practiceSubmissionCount: {
        type: Number,
        default: 0
    },
    practiceSolvedProblemIds: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Only hash password if it exists and was modified
UserSchema.pre('save', async function () {
    if (!this.password || !this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
