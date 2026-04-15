const fs = require('fs');
const filepath = 'd:/AlgoFight/frontend/src/components/Home/Home.jsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace("import React from 'react';", "import React, { useState, useEffect } from 'react';");
content = content.replace("import '../BackgroundPaths/BackgroundPaths.css';", "import '../BackgroundPaths/BackgroundPaths.css';\nimport { fetchPracticeProblems } from '../../services/api';");

content = content.replace(/const competitions = \[[\s\S]*?\];/m, '');

const funcStart = 'function Home() {\n    const navigate = useNavigate();';
const newFuncStart = 'function Home() {\n    const navigate = useNavigate();\n    const [featuredProblems, setFeaturedProblems] = useState([]);\n\n    useEffect(() => {\n        const getProblems = async () => {\n            try {\n                const data = await fetchPracticeProblems({ limit: 50 });\n                const problemsList = data?.problems || [];\n                const shuffled = [...problemsList].sort(() => 0.5 - Math.random());\n                setFeaturedProblems(shuffled.slice(0, 3));\n            } catch (err) {\n                console.error("Error fetching featured problems:", err);\n            }\n        };\n        getProblems();\n    }, []);';

content = content.replace(funcStart, newFuncStart);

const oldSectionRegex = /\{\/\* Live Competitions Section \*\/\}[\s\S]*?<\/section>/m;
const newSection = 
                {/* Featured Problems Section */}
                <section className="competitions-section home-panel">
                    <div className="comp-header-row">
                        <div>
                            <div className="pre-heading">HANDPICKED CHALLENGES</div>
                            <h2 className="home-section-title">Prove Your <span className="text-yellow-gradient">Skills</span></h2>
                        </div>
                        <button className="btn-dark btn-view-all" onClick={() => navigate('/practice')}>
                            <FontAwesomeIcon icon={faCodeBranch} /> View All Problems
                        </button>
                    </div>
                    
                    <div className="comp-grid" style={{ minHeight: '260px' }}>
                        {featuredProblems.length > 0 ? featuredProblems.map((problem) => (
                            <article key={problem._id} className="comp-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                <h3 className="comp-title">{problem.title}</h3>
                                <div style={{ marginBottom: '1rem', marginTop: '0.4rem' }}>
                                    <span className={"comp-tag "} style={{ display: 'inline-block' }}>{problem.difficulty || "Medium"}</span>
                                </div>

                                <div className="comp-details" style={{ flexGrow: 1, marginBottom: '1.5rem', color: '#a0a0a0', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                    {problem.description ? problem.description.substring(0, 100) + '...' : 'Challenge your algorithmic thinking with this classic problem designed to test your limits.'}
                                </div>

                                <button
                                    className="btn-primary w-100"
                                    onClick={() => navigate('/practice/' + problem._id)}
                                >
                                    Solve Problem
                                </button>
                            </article>
                        )) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: '#888' }}>
                                <div className="loader" style={{ fontSize: '1rem', marginBottom: '1rem' }}>...</div>
                                <p>Loading challenges...</p>
                            </div>
                        )}
                    </div>
                </section>;

content = content.replace(oldSectionRegex, newSection.trim());
content = content.replace("faCircle } from", "faCircle, faCodeBranch } from");

fs.writeFileSync(filepath, content, 'utf8');
console.log('Script finish');
