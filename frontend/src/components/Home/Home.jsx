import React, { useState, useEffect } from 'react';
import './Home.css'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faArrowRight, faBolt, faUsers, faTrophy, faBrain, faClock, faShieldHalved, faCalendar, faCircle, faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from 'react-router-dom';
import BackgroundPaths from '../BackgroundPaths/BackgroundPaths';
import '../BackgroundPaths/BackgroundPaths.css';
import { fetchPracticeProblems } from '../../services/api';



const featureCards = [
    {
        title: 'Real-time Battles',
        copy: 'Compete head-to-head with developers worldwide in timed algorithmic duels.',
        icon: faBolt,
    },
    {
        title: 'Team Contests',
        copy: 'Form squads and compete in collaborative coding championships.',
        icon: faUsers,
    },
    {
        title: 'Global Rankings',
        copy: 'Climb the leaderboard and earn your place among the elite.',
        icon: faTrophy,
    },
    {
        title: 'AI-Powered Learning',
        copy: 'Personalized problem recommendations based on your skill gaps and growth trajectory.',
        icon: faBrain,
    },
    {
        title: 'Speed Rounds',
        copy: 'Five-minute sprints to test your instincts and sharpen your execution speed.',
        icon: faClock,
    },
    {
        title: 'Anti-Cheat System',
        copy: 'Fair play guaranteed through robust detection and secure judging pipelines.',
        icon: faShieldHalved,
    },
];

function Home() {
    const navigate = useNavigate();
    const [featuredProblems, setFeaturedProblems] = useState([]);

    useEffect(() => {
        const getProblems = async () => {
            try {
                // Fetch problems and pick 3 at random
                const data = await fetchPracticeProblems({ limit: 50, mode: 'practice' });
                const problemsList = data?.problems || [];
                const shuffled = [...problemsList].sort(() => 0.5 - Math.random());
                setFeaturedProblems(shuffled.slice(0, 3));
            } catch (err) {
                console.error("Error fetching featured problems:", err);
            }
        };
        getProblems();
    }, []);

    return (
        <BackgroundPaths>
            <div className="home-container"> 
                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-left">
                        <div className="pre-heading">COMPETITIVE PROGRAMMING REDEFINED</div>
                        <h1 className="hero-heading">
                            <span className="text-white" style={{ textShadow: '0 0 25px rgba(0, 229, 255, 0.7)' }}>CODE</span>
                            <span className="text-purple">BATTLE</span>
                            <span className="text-white" style={{ textShadow: '0 0 25px rgba(0, 229, 255, 0.7)' }}>DOMINATE</span>
                        </h1>
                        <p className="hero-description">
                            Join 50,000+ developers competing in real-time algorithmic battles. Climb the ranks. Prove your skills.
                        </p>
                        <div className="hero-buttons">
                            <button className="btn-primary" onClick={() => navigate("/battle")}>
                                Start Competing <FontAwesomeIcon icon={faArrowRight} className="btn-icon"/>
                            </button>
                            <button className="btn-secondary" onClick={() => navigate("/about")}>
                                <FontAwesomeIcon icon={faUsers} className="btn-icon-left"/> About Us
                            </button>
                        </div>
                    </div>
                    
                    <div className="hero-right">
                        <div className="stat-card-glass">
                            <div className="stat-block">
                                <h2 className="stat-number stat-pink">50K+</h2>
                                <p className="stat-label">Active Coders</p>
                            </div>
                            <div className="stat-block">
                                <h2 className="stat-number stat-cyan">2M+</h2>
                                <p className="stat-label">Problems Solved</p>
                            </div>
                            <div className="stat-block">
                                <h2 className="stat-number stat-yellow">500+</h2>
                                <p className="stat-label">Daily Contests</p>
                            </div>
                        </div>
                    </div>
                </div>

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
                                    <span className={`comp-tag diff-${(problem.difficulty || "medium").toLowerCase()}`} style={{ display: 'inline-block', fontWeight: 'bold' }}>{(problem.difficulty || "Medium").toUpperCase()}</span>
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
                </section>

                {/* Features Section */}
                <section className="features-section home-panel">
                    <div className="pre-heading">PLATFORM FEATURES</div>
                    <h2 className="home-section-title">Built For <span className="text-cyan-gradient">Champions</span></h2>
                    
                    <div className="features-grid">
                        {featureCards.map((feature) => (
                            <article key={feature.title} className="feature-card">
                                <div className="feature-icon"><FontAwesomeIcon icon={feature.icon} /></div>
                                <h3>{feature.title}</h3>
                                <p>{feature.copy}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="cta-section"> 
                    <div className="cta-glass">
                        <h2 className="cta-heading">Ready to <span className="text-purple">Level Up?</span></h2>
                        <p className="cta-description">Join thousands of developers who are sharpening their skills and climbing the ranks every day.</p>
                        <div className="cta-buttons">
                            <button className="btn-primary" onClick={() => navigate('/signup')}>Create Free Account <FontAwesomeIcon icon={faArrowRight} style={{marginLeft: "8px"}}/></button>
                            <button className="btn-dark" onClick={() => navigate('/practice')}>Explore Problems</button>
                        </div>
                        <p className="cta-subtext">No credit card required. Start solving problems in minutes.</p>
                    </div>
                </section>

            </div>
            
            {/* Footer */}
            <footer className="footer-home">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h2>{'<'}/{'>'} AlgoFight</h2>
                        <p>The ultimate platform for competitive programming and technical interviews.</p>
                    </div>
                    <div className="footer-links">
                        <div className="link-col">
                            <h4>Platform</h4>
                            <a href="/practice">Problems</a>
                            <a href="/battle">Contests</a>
                            <a href="/leaderboard">Leaderboard</a>
                        </div>
                        <div className="link-col">
                            <h4>Resources</h4>
                            <a href="/about">Learn</a>
                            <a href="/rewards">Rewards</a>
                            <a href="/profile">Profile</a>
                        </div>
                        <div className="link-col">
                            <h4>Company</h4>
                            <a href="/about">About</a>
                            <a href="/leaderboard">Hall of Fame</a>
                            <a href="/battle">Events</a>
                        </div>
                        <div className="link-col">
                            <h4>Legal</h4>
                            <a href="/terms">Terms</a>
                            <a href="/privacy">Privacy</a>
                            <a href="/cookies">Cookies</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2024 AlgoFight. All rights reserved.</p>
                    <div className="social-icons">
                        <a href="/developer">Krish</a>
                        <a href="/developer">Arin</a>
                    </div>
                </div>
            </footer>
        </BackgroundPaths>
    );
}

export default Home;
