import React from 'react';
import './Navbar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode } from '@fortawesome/free-solid-svg-icons';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoIcon from '../../assets/algofight-logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active-link' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/home" className="navbar-brand">
          <img src={logoIcon} alt="AlgoFight Logo" className="brand-logo-img" />
        </Link>

        <div className="navbar-links">
          <ul className="nav-menu">
            <li><Link to="/practice" className={isActive('/practice')}>Practice</Link></li>
            <li><Link to="/battle" className={isActive('/battle')}>Battle</Link></li>
            <li><Link to="/leaderboard" className={isActive('/leaderboard')}>Leaderboard</Link></li>
            <li><Link to="/rewards" className={isActive('/rewards')}>Rewards</Link></li>
            <li><Link to="/about" className={isActive('/about')}>About</Link></li>
            <li><Link to="/developer" className={isActive('/developer')}>Developers</Link></li>
          </ul>
        </div>
        
        <div className='navbar-actions'>
          {user ? (
             <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
               <Link to="/profile" style={{color: '#888', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500}}>Profile</Link>
               <button onClick={handleLogout} className="btn-nav-outline">
                 Logout
               </button>
             </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/" className="nav-sign-in">Sign In</Link>
              <Link to="/signup" className="nav-get-started">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;