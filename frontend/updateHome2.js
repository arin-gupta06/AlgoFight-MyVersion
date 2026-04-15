const fs = require('fs');
const filepath = 'd:/AlgoFight/frontend/src/components/Home/Home.jsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/const competitions = \[[\s\S]*?\];/m, '');

fs.writeFileSync(filepath, content, 'utf8');
console.log('Script finish');
