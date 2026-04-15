import React, { useState, useEffect } from "react";
import "./Signup.css";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { googleSignIn, githubSignIn } from '../../firebaseConfig.js';
import { GoogleImage, GithubImage } from "../Login/Login.jsx";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext.jsx";

function Signup() {
  const [userName, setUserName] = useState("");
  const [userPass, setUserPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [userNameError, setUserNameError] = useState("");
  const [userPassError, setUserPassError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();

  useEffect(() => {
    if (user) navigate("/home");
  }, [user, navigate]);

  const handleSignUpSubmit = (e) => {
    e.preventDefault();

    setUserNameError("");
    setUserPassError("");
    setIsSubmitted(true);

    let isValid = true;

    if (userName.trim() === "") {
      setUserNameError("Username cannot be empty");
      isValid = false;
    }
    if (userPass.trim() === "") {
      setUserPassError("Password cannot be empty");
      isValid = false;
    }
    if (userPass !== confirmPass) {
      setUserPassError("Password doesn't match");
      isValid = false;
    }
    if (!isValid) return;

    console.log(userName, userPass, confirmPass);
    setUserName("");
    setUserPass("");
    setConfirmPass("");

    notify({
      type: "info",
      title: "Use Social Sign-Up",
      message: "Direct username and password signup is not active yet. Please continue with Google or GitHub.",
    });
  };
  
   const googleAuthHandler = async() => {
    try {
      const result = await googleSignIn();
      if (result?.notice) notify(result.notice);

      const signedUser = result ? result.user : null;
      if(signedUser) {
        navigate("/home");
        setIsSubmitted(true);
      }
    } catch (error) {
      notify({
        type: "error",
        title: "Sign-Up Failed",
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
        setIsSubmitted(true);
      }
    } catch (error) {
      notify({
        type: "error",
        title: "Sign-Up Failed",
        message: "Something went wrong while signing in with GitHub.",
      });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -40 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="signup-page"
    >
      <form className="Signup-Container" onSubmit={handleSignUpSubmit}>

        <div className="Signup-Header">
            <h1>Create Account</h1>
        </div>


        <div className="Signup-Form-Options">
          <div className="input-group">
            <input
              type="text"
              placeholder="Username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <p className="error-text">{userNameError || '\u00A0'}</p>
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={userPass}
              onChange={(e) => setUserPass(e.target.value)}
            />
            <p className="error-text">{userPassError || '\u00A0'}</p>
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
            <p className="error-text">
              {(isSubmitted && confirmPass === "") ? "Confirm password cannot be empty" : 
               (isSubmitted && confirmPass !== userPass && confirmPass !== "") ? "Passwords do not match" : '\u00A0'}
            </p>
          </div>

        <p>Already have an account?</p>
        <Link to="/" className="Login-link">Login</Link>

        <div className="Signup-Separator">OR</div>

        <div className="Signup-Social-Options">
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

        

          <button
            type="submit"
            disabled={confirmPass !== userPass || !userPass || !userName}
          >
            Sign Up
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default Signup;

