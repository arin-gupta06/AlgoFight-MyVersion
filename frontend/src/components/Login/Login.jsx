import React, {useState, useEffect} from "react";
import { Link } from 'react-router-dom';
import "./Login.css";
import { motion } from 'framer-motion';
import GoogleImage from './Google.png';
import GithubImage from './Github.png';
import { googleSignIn, githubSignIn } from '../../firebaseConfig.js';
import {useNavigate} from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useNotification } from '../../contexts/NotificationContext.jsx';

function Login(){
    const [userName, setUserName] = useState("");
    const [userPass, setUserPass] = useState("");
    const [userNameError, setUserNameError] = useState("");
    const [userPassError, setUserPassError] = useState("");
    const navigate = useNavigate();
    const { user } = useAuth();
  const { notify } = useNotification();

    // If already logged in, redirect to home
    useEffect(() => {
      if (user) navigate("/home");
    }, [user, navigate]);
    
    const handleSubmit = (event) =>{
        event.preventDefault();
        
        setUserNameError("");  
        setUserPassError("");  
        
        let isValid = true; 

        if(userName.trim() === ""){
            setUserNameError("Username cannot be empty");
            isValid = false;
        }
        if(userPass.trim() === ""){
            setUserPassError("Password cannot be empty");
            isValid = false;
        }
        if(!isValid){
            return;
        }

        console.log(userName, userPass);
        setUserName("");
        setUserPass("");
        notify({
          type: "info",
          title: "Use Social Sign-In",
          message: "Username and password login is not wired yet. Please continue with Google or GitHub.",
        });
        // Note: username/password login is not yet wired to a backend endpoint.
        // Use Google or GitHub sign-in for now.
    }
    const googleAuthHandler = async() => {
        try {
          const result = await googleSignIn();
          if (result?.notice) notify(result.notice);

          const signedUser = result ? result.user : null;
          if(signedUser) {
            navigate("/home");
          }
        } catch (error) {
          notify({
            type: "error",
            title: "Sign-In Failed",
            message: "Something went wrong while signing in with Google.",
          });
        }
      }
    
      const githubAuthHandler = async() => {
        try {
          const result = await githubSignIn();
          if (result?.notice) notify(result.notice);

          const signedUser = result ? result.user : null;
          if(signedUser) {
            navigate("/home");
          }
        } catch (error) {
          notify({
            type: "error",
            title: "Sign-In Failed",
            message: "Something went wrong while signing in with GitHub.",
          });
        }
      }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96, x: -40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: 40 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
            <div className="login-page">
            <form className="Login-Container" onSubmit={handleSubmit}>
                
                <div className="Login-Header">
                    <h2>Welcome to Algo Fight</h2>
                
                </div>

                <div className="input-group">
                  <input 
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Username"
                  />
                  <p className="error-message">{userNameError || '\u00A0'}</p>
                </div>

                <div className="input-group">
                  <input 
                  type="password"
                  value={userPass}
                  onChange={(e) => setUserPass(e.target.value)}
                  placeholder="Password"
                  />
                  <p className="error-message">{userPassError || '\u00A0'}</p>
                </div>
                <p>Don't have an account?</p>
                <Link to="/signup" className="signup-link">Sign Up</Link>
                <div className="Login-Separator">OR</div>

                <div className="Login-Social-Options">
                <button className="social-btn google"
                type="button"
                onClick={googleAuthHandler}
                
                >
                    <img src={GoogleImage} alt="Google" />
                </button>

                <button className="social-btn github"
                type="button"
                onClick={githubAuthHandler}
                >
                    <img src={GithubImage} alt="GitHub" />
                </button>

                
                </div>
                
                 
                <button type="submit">Login</button>
            </form>
            </div>
        </motion.div>
    );
}

export default Login;
export {GoogleImage, GithubImage};