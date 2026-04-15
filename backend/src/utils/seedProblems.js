const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Problem = require('../models/Problem');

const problems = [
    {
        title: 'Two Sum',
        description: `Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].`,
        difficulty: 'easy',
        testCases: [
            { input: '[2,7,11,15]\n9', expected: '[0,1]', visibility: 'sample' },
            { input: '[3,2,4]\n6', expected: '[1,2]', visibility: 'hidden' },
            { input: '[3,3]\n6', expected: '[0,1]', visibility: 'edge' }
        ],
        timeLimit: 3000
    },
    {
        title: 'FizzBuzz',
        description: `Given an integer n, return a string array answer where:
- answer[i] == "FizzBuzz" if i is divisible by 3 and 5
- answer[i] == "Fizz" if i is divisible by 3
- answer[i] == "Buzz" if i is divisible by 5
- answer[i] == i (as a string) otherwise

Example:
Input: n = 5
Output: ["1","2","Fizz","4","Buzz"]`,
        difficulty: 'easy',
        testCases: [
            { input: '5', expected: '["1","2","Fizz","4","Buzz"]', visibility: 'sample' },
            { input: '3', expected: '["1","2","Fizz"]', visibility: 'hidden' },
            { input: '15', expected: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]', visibility: 'edge' }
        ],
        timeLimit: 3000
    },
    {
        title: 'Palindrome Check',
        description: `Given a string s, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.

Example:
Input: s = "A man, a plan, a canal: Panama"
Output: true

Input: s = "race a car"
Output: false`,
        difficulty: 'easy',
        testCases: [
            { input: 'A man, a plan, a canal: Panama', expected: 'true', visibility: 'sample' },
            { input: 'race a car', expected: 'false', visibility: 'hidden' },
            { input: ' ', expected: 'true', visibility: 'edge' }
        ],
        timeLimit: 3000
    },
    {
        title: 'Reverse String',
        description: `Write a function that reverses a string. The input string is given as an array of characters s.

You must do this by modifying the input array in-place with O(1) extra memory.

Example:
Input: ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]`,
        difficulty: 'easy',
        testCases: [
            { input: '["h","e","l","l","o"]', expected: '["o","l","l","e","h"]', visibility: 'sample' },
            { input: '["H","a","n","n","a","h"]', expected: '["h","a","n","n","a","H"]', visibility: 'edge' }
        ],
        timeLimit: 3000
    },
    {
        title: 'Find Maximum in Array',
        description: `Given an array of integers, find and return the maximum value.

Example:
Input: [3, 1, 4, 1, 5, 9, 2, 6]
Output: 9

Input: [-1, -5, -3]
Output: -1`,
        difficulty: 'easy',
        testCases: [
            { input: '[3,1,4,1,5,9,2,6]', expected: '9', visibility: 'sample' },
            { input: '[-1,-5,-3]', expected: '-1', visibility: 'hidden' },
            { input: '[42]', expected: '42', visibility: 'edge' }
        ],
        timeLimit: 3000
    }
];

const seedProblems = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing problems
        await Problem.deleteMany({});
        console.log('Cleared existing problems');

        // Insert seed problems
        const inserted = await Problem.insertMany(problems);
        console.log(`Seeded ${inserted.length} problems successfully`);

        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error.message);
        process.exit(1);
    }
};

seedProblems();
