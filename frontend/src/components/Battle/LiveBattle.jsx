import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { connectSocket, disconnectSocket } from "../../services/socket";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faCode,
  faFlask,
  faForward,
  faShieldHalved,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import "./LiveBattle.css";

export default function LiveBattle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();

  const [status, setStatus] = useState("connecting"); // connecting | waiting | matched | finished
  const [problem, setProblem] = useState(null);
  const [opponentName, setOpponentName] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  useEffect(() => {
    if (problem && problem.starterCode && typeof problem.starterCode === "object") {
      const isDefaultCode = !code || Object.values(problem.starterCode).includes(code) || code === "// write your solution here";
      if (isDefaultCode) {
         setCode(problem.starterCode[language] || "// write your solution here");
      }
    } else if (problem && typeof problem.starterCode === "string") {
       if (!code || code === "// write your solution here") setCode(problem.starterCode);
    }
  }, [language, problem]);
  const [output, setOutput] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [submissionMeta, setSubmissionMeta] = useState(null);
  const [running, setRunning] = useState(false);
  const [runMode, setRunMode] = useState("idle"); // idle | test | submit
  const [roomId, setRoomId] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const socketRef = useRef(null);
  const username = user?.displayName || user?.email || "Player";

  const sampleCases = Array.isArray(problem?.testCases) ? problem.testCases.slice(0, 2) : [];

  useEffect(() => {
    let cancelled = false;
    let socket = null;

    const setupSocket = async () => {
      const token = user ? await user.getIdToken().catch(() => null) : null;
      if (cancelled) return;

      socket = connectSocket(token, user?.uid || null);
      socketRef.current = socket;

      socket.on("connect", () => {
        setStatus("waiting");
        notify({
          type: "info",
          title: "Connected",
          message: "Connected to battle server. Looking for an opponent...",
          duration: 2600,
        });
        socket.emit("find_match", { username });
      });

      socket.on("waiting_for_opponent", () => {
        setStatus("waiting");
      });

      socket.on("match_found", (data) => {
      const { roomId: rid, problem: prob, players } = data;
      setRoomId(rid);
      setProblem(prob);
      const defaultLanguage = prob.starterCode && prob.starterCode["javascript"] !== undefined ? "javascript" : "cpp";
      setLanguage("javascript");
      if (typeof prob.starterCode === "object") {
        setCode(prob.starterCode["javascript"] || "// write your solution here");
      } else {
        setCode(prob.starterCode || "// write your solution here");
      }
      setOutput("");
      setLastResult(null);
      setSubmissionMeta(null);
      // Opponent is the other player
      const opp = players.find((p) => p !== username) || "Opponent";
      setOpponentName(opp);
      setStatus("matched");
      notify({
        type: "success",
        title: "Match Found",
        message: `You are now battling ${opp}.`,
        duration: 3000,
      });
    });

      socket.on("code_result", ({ result }) => {
      setRunning(false);
      setRunMode("idle");
      setLastResult(result || null);
      setOutput(result?.output || "No output returned.");

      if (result?.passed) {
        notify({
          type: "success",
          title: "Execution Passed",
          message: `Passed ${result.passedTestCases ?? 0}/${result.totalTestCases ?? 0} test cases.`,
          duration: 2200,
        });
      }
    });

      socket.on("submission_result", (result) => {
        setSubmissionMeta(result || null);
      });

      socket.on("battle_over", ({ winner }) => {
      const youWin = winner === username;
      setBattleResult({
        winner: youWin ? "You" : winner,
        message: youWin ? "Victory! Battle won." : `Defeat — ${winner} solved it first.`,
      });
      setStatus("finished");

      notify({
        type: youWin ? "success" : "warning",
        title: youWin ? "Victory" : "Battle Finished",
        message: youWin ? "You won the live battle." : `${winner} solved it first.`,
        duration: 3600,
      });
    });

      socket.on("opponent_disconnected", () => {
      setBattleResult({
        winner: "You",
        message: "Your opponent disconnected. You win!",
      });
      setStatus("finished");

      notify({
        type: "warning",
        title: "Opponent Disconnected",
        message: "The opponent left the battle. You are awarded the win.",
        duration: 3600,
      });
    });

      socket.on("error", (msg) => {
      setOutput(`Error: ${msg}`);
      setRunning(false);
      setRunMode("idle");
      notify({
        type: "error",
        title: "Battle Error",
        message: String(msg || "Unexpected battle error occurred."),
      });
    });

    };

    setupSocket();

    return () => {
      cancelled = true;
      if (!socketRef.current) {
        return;
      }

      const activeSocket = socketRef.current;
      activeSocket.off("connect");
      activeSocket.off("waiting_for_opponent");
      activeSocket.off("match_found");
      activeSocket.off("code_result");
      activeSocket.off("submission_result");
      activeSocket.off("battle_over");
      activeSocket.off("opponent_disconnected");
      activeSocket.off("error");
      disconnectSocket();
    };
  }, [notify, user?.uid, username]);

  const onTestCode = () => {
    if (!roomId || !socketRef.current) return;
    setRunning(true);
    setRunMode("test");
    setOutput("Testing against sample cases...");
    socketRef.current.emit("test_code", { code, language, roomId });
  };

  const onSubmitCode = () => {
    if (!roomId || !socketRef.current) return;
    setRunning(true);
    setRunMode("submit");
    setOutput("Testing against hidden and edge cases...");
    socketRef.current.emit("submit_code", { code, language, roomId });
  };

  const goBack = () => {
    navigate("/battle", {
      state: battleResult ? { result: battleResult } : undefined,
    });
  };

  const resultToneClass = battleResult?.winner === "You" ? "livebattle-result-win" : "livebattle-result-loss";

  // --- Waiting / Matchmaking screen ---
  if (status === "connecting" || status === "waiting") {
    return (
      <div className="livebattle-page">
        <section className="livebattle-header-card">
          <div className="livebattle-header-copy">
            <div className="livebattle-pre">LIVE BATTLE</div>
            <h1>{status === "connecting" ? "Connecting to server" : "Finding your opponent"}</h1>
            <p>Matchmaking uses your rating and recent performance to find a fair challenge.</p>
          </div>

          <button className="livebattle-leave-btn" onClick={() => navigate("/battle")}>Cancel</button>
        </section>

        <section className="livebattle-wait-panel">
          <div className="livebattle-loader">Searching for an opponent...</div>

          <div className="livebattle-wait-steps">
            <article>
              <FontAwesomeIcon icon={faUsers} />
              <h3>Queue</h3>
              <p>Scanning available coders near your rating.</p>
            </article>
            <article>
              <FontAwesomeIcon icon={faShieldHalved} />
              <h3>Match Integrity</h3>
              <p>Verifying battle room and fair-play checks.</p>
            </article>
            <article>
              <FontAwesomeIcon icon={faCode} />
              <h3>Problem Setup</h3>
              <p>Preparing starter code and evaluation suite.</p>
            </article>
          </div>
        </section>
      </div>
    );
  }

  // --- Battle or finished screen ---
  return (
    <div className="livebattle-page">
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="livebattle-header-card">
        <div className="livebattle-header-copy">
          <div className="livebattle-pre">LIVE BATTLE</div>
          <h1>vs {opponentName}</h1>
          <p>
            {status === "finished"
              ? "Battle completed. Review your result and return to arena."
              : `Room ${roomId || "-"} • Submit your best solution first.`}
          </p>
        </div>

        <div className="livebattle-header-right">
          <span className={`livebattle-status ${status === "finished" ? "finished" : "active"}`}>
            {status === "finished" ? "Finished" : "In Progress"}
          </span>
          <button className="livebattle-leave-btn" onClick={goBack}>
            {status === "finished" ? "Back to Arena" : "Leave Battle"}
          </button>
        </div>
      </motion.section>

      {status === "finished" && battleResult && (
        <section className={`livebattle-result-banner ${resultToneClass}`}>
          <h2>{battleResult.message}</h2>
          <p>Winner: {battleResult.winner}</p>
        </section>
      )}

      <div className="livebattle-grid">
        <section className="livebattle-panel livebattle-problem-panel">
          <div className="livebattle-panel-head">
            <h3>Problem</h3>
            <div className="livebattle-problem-meta">
              <span>{problem?.difficulty || "Mixed"}</span>
            </div>
          </div>

          <div className="livebattle-problem-scroll">
            <h4>{problem?.title || "Loading problem..."}</h4>
            <p>{problem?.description || "Waiting for problem statement."}</p>

            {sampleCases.length > 0 ? (
              <div className="livebattle-samples">
                {sampleCases.map((sample, index) => (
                  <article key={`${sample.input}-${index}`}>
                    <h5>Sample {index + 1}</h5>
                    <pre>{`Input: ${sample.input}\nExpected: ${sample.output}`}</pre>
                  </article>
                ))}
              </div>
            ) : (
              <pre className="livebattle-example-fallback">{problem?.example || "No sample case available."}</pre>
            )}

            <p className="livebattle-problem-note">Time Limit: 1s | Memory: 256MB</p>
          </div>
        </section>

          <section className="livebattle-panel livebattle-editor-panel">
          <div className="livebattle-panel-head">
            <h3>Solution</h3>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="livebattle-chip"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', outline: 'none' }}
              disabled={status === "finished" || running}
            >
              <option value="javascript" style={{ background: '#111' }}>JavaScript</option>
              <option value="cpp" style={{ background: '#111' }}>C++</option>
              <option value="python" style={{ background: '#111' }}>Python</option>
            </select>
          </div>

          <textarea
            className="livebattle-code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            disabled={status === "finished"}
          />
        </section>

        <section className="livebattle-panel livebattle-submit-panel">
          <div className="livebattle-panel-head">
            <h3>Submit Solution</h3>
          </div>

          <div className="livebattle-submit-body">
            <div className="livebattle-actions-row">
              <button
                className="livebattle-action-btn test-btn"
                onClick={onTestCode}
                disabled={running || status === "finished"}
              >
                <FontAwesomeIcon icon={faFlask} />
                {running && runMode === "test" ? "Testing..." : "Test (Sample)"}
              </button>

              <button
                className="livebattle-action-btn submit-btn"
                onClick={onSubmitCode}
                disabled={running || status === "finished"}
              >
                <FontAwesomeIcon icon={faForward} />
                {running && runMode === "submit" ? "Submitting..." : "Submit (All)"}
              </button>
            </div>

            {lastResult ? (
              <div className="livebattle-result-meta">
                <div>
                  <span>Verdict</span>
                  <strong className={lastResult.passed ? "pass" : "fail"}>{lastResult.passed ? "Passed" : "Failed"}</strong>
                </div>
                <div>
                  <span>Tests</span>
                  <strong>
                    {lastResult.passedTestCases ?? 0}/{lastResult.totalTestCases ?? 0}
                  </strong>
                </div>
                <div>
                  <span>Time</span>
                  <strong>{lastResult.executionTime ?? 0} ms</strong>
                </div>
              </div>
            ) : null}

            {submissionMeta ? (
              <div className="livebattle-submission-meta">
                <FontAwesomeIcon icon={faClock} />
                <span>Submission Attempts: {submissionMeta.submissions ?? 0}</span>
              </div>
            ) : null}

            <div className="livebattle-output-box">
              {running ? (
                <div className="livebattle-loader livebattle-inline-loader">Evaluating...</div>
              ) : (
                <pre>{output || "Output will appear here."}</pre>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
