import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faArrowTrendUp, faArrowTrendDown, faMinus } from "@fortawesome/free-solid-svg-icons";
import { fetchLeaderboard } from "../../services/api";
import "./Leaderboard.css";

export default function Leaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch leaderboard:", err);
        setError("Could not load leaderboard. Is the server running?");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="leaderboard-root">
        <div className="loading-state">Loading Hall of Fame...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-root">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  // Mocking more data if length < 3 for the podium
  let topPlayers = data.slice(0, 3);
  let otherPlayers = data.slice(3);

  if (data.length === 0) {
      topPlayers = [
        { rank: 1, user: "tourist", score: 3799, country: "BY", trend: "up" },
        { rank: 2, user: "Benq", score: 3687, country: "US", trend: "same" },
        { rank: 3, user: "ecnerwala", score: 3651, country: "US", trend: "same" }
      ];
      otherPlayers = [
        { rank: 4, user: "Um_nik", score: 3598, country: "UA", trend: "down" },
        { rank: 5, user: "ksun48", score: 3571, country: "CA", trend: "up" },
        { rank: 6, user: "Petr", score: 3556, country: "CZ", trend: "same" }
      ];
  }

  const renderTrendIcon = (trend) => {
      if (trend === 'up') return <FontAwesomeIcon icon={faArrowTrendUp} className="trend-up" />;
      if (trend === 'down') return <FontAwesomeIcon icon={faArrowTrendDown} className="trend-down" />;
      return <FontAwesomeIcon icon={faMinus} className="trend-same" />;
  }

  return (
    <div className="leaderboard-root">
      <div className="leaderboard-header">
        <div className="pre-heading">GLOBAL RANKINGS</div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Hall of <span className="text-yellow">Fame</span>
        </motion.h1>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="leaderboard-content"
      >
        {/* Podium for Top 3 */}
        {topPlayers.length >= 3 && (
            <div className="podium-container">
                <div className="podium-item podium-2">
                    <div className="avatar avatar-silver">{topPlayers[1].user.charAt(0).toUpperCase()}</div>
                    <div className="podium-name">{topPlayers[1].user}</div>
                    <div className="podium-score">{topPlayers[1].score}</div>
                    <div className="podium-block block-silver">2</div>
                </div>
                
                <div className="podium-item podium-1">
                    <FontAwesomeIcon icon={faTrophy} className="podium-trophy" />
                    <div className="avatar avatar-gold">{topPlayers[0].user.charAt(0).toUpperCase()}</div>
                    <div className="podium-name">{topPlayers[0].user}</div>
                    <div className="podium-score">{topPlayers[0].score}</div>
                    <div className="podium-block block-gold">1</div>
                </div>

                <div className="podium-item podium-3">
                    <div className="avatar avatar-bronze">{topPlayers[2].user.charAt(0).toUpperCase()}</div>
                    <div className="podium-name">{topPlayers[2].user}</div>
                    <div className="podium-score">{topPlayers[2].score}</div>
                    <div className="podium-block block-bronze">3</div>
                </div>
            </div>
        )}

        {/* List for the rest */}
        <div className="ranking-list">
            {otherPlayers.map((entry, i) => (
                <div className="ranking-row" key={i}>
                    <div className="rank-num">{entry.rank}</div>
                    <div className="rank-avatar">{entry.user.charAt(0).toUpperCase()}</div>
                    <div className="rank-name">
                        {entry.user} <span className="rank-country">{entry.country || "UN"}</span>
                    </div>
                    <div className="rank-trend">
                        {renderTrendIcon(entry.trend)} <span className="rank-score">{entry.score}</span>
                    </div>
                </div>
            ))}
        </div>

      </motion.div>
    </div>
  );
}
