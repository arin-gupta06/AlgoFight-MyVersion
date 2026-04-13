import React from 'react';
import './Home.css'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTerminal, faRankingStar, faComments, faCommentDots } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from 'react-router-dom';
import BackgroundPaths from '../BackgroundPaths/BackgroundPaths';
import '../BackgroundPaths/BackgroundPaths.css';

function Home() {
    const navigate = useNavigate();
    return (
        <BackgroundPaths>
            <div className="home-container"> 
            
            <div className="hero-section">
               
                <div className="main-title">
                    <span className="algo-fight-text">Algo</span><span className="algo-fight-text fight-part">Fight</span>
                </div>
                
                <h1 className="hero-subtitle tagline-bold">Fight for Code Glory</h1>                
                <button className="enter-arena-btn"
                    onClick={() => navigate("/battle")}
                >Enter the Arena

                </button>
            </div>

            
            <div className="features-section">
                <h2 className="section-heading">Why Choose AlgoFight?</h2>
                <div className="features-grid">
                    
                    <div className="feature-item">
                        <FontAwesomeIcon icon={faTerminal} className="toggle-icon feature-icon"/>
                        <h3>Real-time Coding
                           
                        </h3>
                        <p>Battle against coders worldwide in live coding challenges</p>
                    </div>
                    
                    <div className="feature-item">
                        <FontAwesomeIcon icon={faRankingStar} className="toggle-icon feature-icon"/>
                        <h3>Competitive Rankings</h3>
                        <p>Climb the leaderboards and earn your place among the elite</p>
                    </div>
                    
                    <div className="feature-item">
                        <FontAwesomeIcon icon={faComments} className="toggle-icon feature-icon"/>
                        <h3>Global Community</h3>
                        <p>Join thousands of developers in the ultimate coding arena</p>
                    </div>
                    
                    <div className="feature-item">
                        <FontAwesomeIcon icon={faCommentDots} className="toggle-icon feature-icon"/>
                        <h3>Instant Feedback</h3>
                        <p>Get immediate results and learn from every battle</p>
                    </div>
                </div>
            </div>

           
            <div className="cta-section"> 
                <h2 className="cta-heading">Ready to Prove Your Skills?</h2>
                <p className="cta-description">Join the ultimate coding battleground and show the world what you're made of</p>
                <div className="cta-buttons">
                    <button className="get-started-btn">Get Started</button>
                    <button className="learn-more-btn">Learn More</button>
                </div>
            </div>
        </div>
        </BackgroundPaths>
    );
}

export default Home;