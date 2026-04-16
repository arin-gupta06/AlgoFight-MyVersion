import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ResultPopup from "./ResultPopup.jsx";
import { useAuth } from "../../contexts/AuthContext";
import { fetchUserProfile } from "../../services/api";
import { normalizeUserStats } from "../../utils/playerMetrics";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faBullseye, faBolt, faMagnifyingGlass, faCrosshairs } from "@fortawesome/free-solid-svg-icons";
import "./BattleArena.css";

export default function BattleArena() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [resultBox, setResultBox] = useState(null);
  const [profile, setProfile] = useState(null);

  // Fetch profile stats from backend
  useEffect(() => {
    if (user?.uid) {
      fetchUserProfile(user.uid)
        .then((data) => { if (data) setProfile(data); })
        .catch((err) => console.error("Failed to fetch profile:", err));
    }
  }, [user]);

  // Re-fetch stats when returning from a battle (location.state changes)
  useEffect(() => {
    if (location.state && location.state.result) {
      setResultBox(location.state.result);
      window.history.replaceState({}, document.title);
      // Refresh stats after battle
      if (user?.uid) {
        fetchUserProfile(user.uid)
          .then((data) => { if (data) setProfile(data); })
          .catch(() => {});
      }
    }
  }, [location.state]);

  const { rating, matchesWon, winRate } = normalizeUserStats(profile || {});

  const startMatchmaking = () => {
    navigate("/battle/live");
  };

  return (
    <div className="arena-root">
      <div className="arena-inner">
        <motion.h1
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="arena-title"
        >
          <FontAwesomeIcon icon={faCrosshairs} style={{marginRight: '12px'}}/> 
          Battle Arena
        </motion.h1>

        <section className="arena-stats">
          <div className="stat-card green">
            <div className="stat-icon"><FontAwesomeIcon icon={faTrophy} /></div>
            <div className="stat-number">{rating}</div>
            <div className="stat-label">Rating</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon"><FontAwesomeIcon icon={faBullseye} /></div>
            <div className="stat-number">{matchesWon}</div>
            <div className="stat-label">Battles Won</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon"><FontAwesomeIcon icon={faBolt} /></div>
            <div className="stat-number">{winRate}%</div>
            <div className="stat-label">Win Rate</div>
          </div>
        </section>

        <section className="opponents-section">
          <h2 className="section-title">Ready to Code?</h2>
          <p className="challenge-text">
            Click below to find a real opponent and battle in a live coding challenge. Matchmaking is based on your current global rating.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <motion.button
              className="challenge-btn challenge-btn-large"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startMatchmaking}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{marginRight: "12px"}} /> Find Match
            </motion.button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {resultBox && (
          <ResultPopup
            result={resultBox}
            onClose={() => setResultBox(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
