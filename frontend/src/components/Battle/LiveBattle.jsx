import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { connectSocket, disconnectSocket } from "../../services/socket";
import { useAuth } from "../../contexts/AuthContext";
import "./LiveBattle.css";

export default function LiveBattle() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState("connecting"); // connecting | waiting | matched | finished
  const [problem, setProblem] = useState(null);
  const [opponentName, setOpponentName] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const username = user?.displayName || user?.email || "Player";

    socket.on("connect", () => {
      setStatus("waiting");
      // Automatically start matchmaking — send uid so backend can find us in MongoDB
      socket.emit("find_match", { username, uid: user?.uid });
    });

    socket.on("waiting_for_opponent", () => {
      setStatus("waiting");
    });

    socket.on("match_found", (data) => {
      const { roomId: rid, problem: prob, players } = data;
      setRoomId(rid);
      setProblem(prob);
      setCode(prob.starterCode || "// write your solution here");
      // Opponent is the other player
      const opp = players.find((p) => p !== username) || "Opponent";
      setOpponentName(opp);
      setStatus("matched");
    });

    socket.on("code_result", ({ result }) => {
      setRunning(false);
      setOutput(result.output);
    });

    socket.on("battle_over", ({ winner }) => {
      const youWin = winner === username;
      setBattleResult({
        winner: youWin ? "You" : winner,
        message: youWin ? "Victory! Battle won." : `Defeat — ${winner} solved it first.`,
      });
      setStatus("finished");
    });
    socket.on("opponent_disconnected", () => {
      setBattleResult({
        winner: "You",
        message: "Your opponent disconnected. You win!",
      });
      setStatus("finished");
    });
    socket.on("error", (msg) => {
      setOutput(`Error: ${msg}`);
    });

    return () => {
      socket.off("connect");
      socket.off("waiting_for_opponent");
      socket.off("match_found");
      socket.off("code_result");
      socket.off("battle_over");
      socket.off("opponent_disconnected");
      socket.off("error");
      disconnectSocket();
    };
  }, [user]);

  const onSubmitCode = () => {
    if (!roomId) return;
    setRunning(true);
    setOutput("Testing against hidden and edge cases...");
    socketRef.current.emit("submit_code", { code, roomId });
  };

  const goBack = () => {
    navigate("/battle", {
      state: battleResult ? { result: battleResult } : undefined,
    });
  };

  // --- Waiting / Matchmaking screen ---
  if (status === "connecting" || status === "waiting") {
    return (
      <div className="live-root">
        <div className="live-topbar">
          <h2>{status === "connecting" ? "Connecting to server..." : "Waiting for opponent..."}</h2>
          <div className="live-controls">
            <button className="finish-btn" onClick={() => navigate("/battle")}>Cancel</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", color: "#aaa", fontSize: "1.2rem" }}>
          <div className="loader">Searching for an opponent...</div>
        </div>
      </div>
    );
  }

  // --- Battle or finished screen ---
  return (
    <div className="live-root">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="live-topbar">
        <h2>Live Battle — vs {opponentName}</h2>
        <div className="live-controls">
          <button className="finish-btn" onClick={goBack}>
            {status === "finished" ? "Back to Arena" : "Leave Battle"}
          </button>
        </div>
      </motion.div>

      {status === "finished" && battleResult && (
        <div style={{ textAlign: "center", padding: "1.5rem", background: battleResult.winner === "You" ? "#1a3a1a" : "#3a1a1a", margin: "0.5rem 1rem", borderRadius: "8px" }}>
          <h2 style={{ color: battleResult.winner === "You" ? "#4f4" : "#f44" }}>{battleResult.message}</h2>
        </div>
      )}

      <div className="live-grid">
        <div className="panel problem-panel">
          <h3>Problem</h3>
          <div className="problem-scroll">
            <h4>{problem?.title}</h4>
            <p>{problem?.description}</p>
            <pre className="example">{problem?.example}</pre>
            <p className="note">Time Limit: 1s | Memory: 256MB</p>
          </div>
        </div>

        <div className="panel editor-panel">
          <h3>Solution</h3>
          <textarea
            className="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            disabled={status === "finished"}
          />
        </div>

        <div className="panel compile-panel">
          <h3>Submit Solution</h3>
          <div className="compile-area">
            <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
              <button
                className="run-btn"
                style={{ flex: 1, backgroundColor: "#00e5ff", color: "#000" }} 
                onClick={() => {
                  if (!roomId || !socketRef.current) return;
                  setRunning(true);
                  setOutput("Testing against sample cases...");
                  socketRef.current.emit("test_code", { code, roomId });
                }}
                disabled={running || status === "finished"}
              >
                {running ? "Testing..." : "Test (Sample)"}
              </button>
              <button
                className="run-btn"
                style={{ flex: 1 }}
                onClick={onSubmitCode}
                disabled={running || status === "finished"}
              >
                {running ? "Submitting..." : "Submit (All)"}
              </button>
            </div>
            <div className="output-box">
              {running ? (
                <div className="loader">• • •</div>
              ) : (
                <pre>{output || "Output will appear here"}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
