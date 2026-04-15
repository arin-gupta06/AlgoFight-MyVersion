import React, { useState } from 'react';
import './Navbar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import Logo from './Logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <img src={Logo} alt="Company Logo" className="logo-img" />
        </div>

        <div className={`navbar-links ${isOpen ? 'open' : ''}`}>
          <ul>
            <li><Link to="/home">Home</Link></li>
            <li><Link to="/battle">Battle</Link></li>
            <li><Link to="/practice">Practice</Link></li>
            <li><Link to="/leaderboard">Leaderboard</Link></li>
            <li><Link to="/rewards">Rewards</Link></li>
            <li><Link to="/profile">Profile</Link></li>
            <li><Link to="/about">About</Link></li>
          </ul>
        </div>
        <div className='log-in-button'>
          {user ? (
            <button onClick={handleLogout} style={{ background: "none", border: "1px solid #aaa", color: "#fff", padding: "0.4rem 1rem", borderRadius: "6px", cursor: "pointer" }}>
              Logout
            </button>
          ) : (
            <Link to="/">Login</Link>
          )}
        </div>
        <div className="navbar-toggle" onClick={toggleNavbar}>
          {isOpen ? (
            <FontAwesomeIcon icon={faXmark} className="toggle-icon" />
          ) : (
            <FontAwesomeIcon icon={faBars} className="toggle-icon" />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
export {Logo};