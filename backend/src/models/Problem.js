const mongoose = require('mongoose');

const ExampleSchema = new mongoose.Schema({
    input: {
        type: String,
        required: true,
        trim: true
    },
    output: {
        type: String,
        required: true,
        trim: true
    }
}, { _id: false });

const StarterCodeSchema = new mongoose.Schema({
    javascript: {
        type: String,
        default: ''
    },
    python: {
        type: String,
        default: ''
    }
}, { _id: false });

const TestCaseSchema = new mongoose.Schema({
    input: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    output: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    expected: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    expectedOutput: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    visibility: {
        type: String,
        enum: ['sample', 'hidden', 'edge'],
        default: 'hidden'
    },
    caseType: {
        type: String,
        enum: ['sample', 'hidden', 'edge'],
        default: undefined
    },
    isHidden: {
        type: Boolean,
        default: undefined
    },
    hidden: {
        type: Boolean,
        default: undefined
    }
}, { _id: false });

const ProblemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    constraints: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    mode: {
        type: String,
        enum: ['battle', 'practice'],
        default: 'battle'
    },
    source: {
        type: String,
        default: 'manual'
    },
    importOrder: {
        type: Number,
        default: null
    },
    starterCode: {
        type: StarterCodeSchema,
        default: () => ({ javascript: '', python: '' })
    },
    examples: {
        type: [ExampleSchema],
        default: []
    },
    example: {
        type: String
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    testCases: {
        type: [TestCaseSchema],
        required: true,
        validate: {
            validator: (v) => Array.isArray(v) && v.length > 0 && v.every((tc) => (
                Object.prototype.hasOwnProperty.call(tc, 'expected') ||
                Object.prototype.hasOwnProperty.call(tc, 'expectedOutput') ||
                Object.prototype.hasOwnProperty.call(tc, 'output')
            )),
            message: 'At least one test case is required'
        }
    },
    timeLimit: {
        type: Number,
        default: 3000
    },
    isBattleReady: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ProblemSchema.pre('validate', function normalizeProblem() {
    if (typeof this.starterCode === 'string') {
        const jsStarter = this.starterCode;
        this.starterCode = {
            javascript: jsStarter,
            python: 'def solution(*args):\n    # Write code here\n    pass\n'
        };
    }

    if (Array.isArray(this.testCases)) {
        for (const testCase of this.testCases) {
            if (typeof testCase.output === 'undefined') {
                if (typeof testCase.expected !== 'undefined') {
                    testCase.output = testCase.expected;
                } else if (typeof testCase.expectedOutput !== 'undefined') {
                    testCase.output = testCase.expectedOutput;
                }
            }

            if (typeof testCase.expected === 'undefined' && typeof testCase.output !== 'undefined') {
                testCase.expected = testCase.output;
            }

            if (typeof testCase.expectedOutput === 'undefined' && typeof testCase.output !== 'undefined') {
                testCase.expectedOutput = testCase.output;
            }

            if (typeof testCase.hidden === 'undefined') {
                if (typeof testCase.isHidden === 'boolean') {
                    testCase.hidden = testCase.isHidden;
                } else if (testCase.visibility === 'sample') {
                    testCase.hidden = false;
                } else {
                    testCase.hidden = true;
                }
            }

            if (!testCase.visibility) {
                testCase.visibility = testCase.hidden ? 'hidden' : 'sample';
            }
        }
    }

    if ((!this.examples || this.examples.length === 0) && this.example) {
        const [left = '', right = ''] = String(this.example).split('->').map((x) => x.trim());
        if (left || right) {
            this.examples = [{ input: left || 'N/A', output: right || 'N/A' }];
        }
    }

});

ProblemSchema.index({ title: 1 }, { unique: true });
ProblemSchema.index({ difficulty: 1, tags: 1 });
ProblemSchema.index({ mode: 1, isBattleReady: 1, importOrder: 1 });

module.exports = mongoose.model('Problem', ProblemSchema);
