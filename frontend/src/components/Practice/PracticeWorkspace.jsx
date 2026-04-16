import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faFlask, faForward } from "@fortawesome/free-solid-svg-icons";
import { evaluatePracticeCode, fetchProblemById, recordPracticeProgress } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import "../Battle/LiveBattle.css";

const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
];

const JS_FALLBACK_STARTER = [
  "function solution(input) {",
  "  // TODO: implement solution",
  "  return input;",
  "}",
].join("\n");

const CPP_FALLBACK_STARTER = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "",
  "int main() {",
  "    // TODO: implement solution",
  "    return 0;",
  "}",
].join("\n");

function getStarterCodeForLanguage(problem, language) {
  const starterCodeByLanguage =
    problem && typeof problem.starterCode === "object" ? problem.starterCode : {};

  const rawStarter =
    starterCodeByLanguage?.[language] ||
    (language === "cpp" ? CPP_FALLBACK_STARTER : JS_FALLBACK_STARTER);

  const normalizedStarter = String(rawStarter || "");
  if (language !== "javascript") {
    return normalizedStarter;
  }

  return normalizedStarter.replace(
    /\n?\s*module\.exports\s*=\s*\{?\s*solution\s*\}?\s*;?\s*$/m,
    ""
  );
}

export default function PracticeWorkspace() {
  const navigate = useNavigate();
  const { problemId } = useParams();
  const { notify } = useNotification();
  const { user } = useAuth();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [runMode, setRunMode] = useState("idle");

  const sampleCases = useMemo(
    () => (Array.isArray(problem?.testCases) ? problem.testCases.slice(0, 2) : []),
    [problem]
  );

  useEffect(() => {
    let active = true;

    const loadProblem = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const data = await fetchProblemById(problemId);
        if (!active) return;

        setProblem(data);
        setCode(getStarterCodeForLanguage(data, "javascript"));
      } catch (error) {
        if (!active) return;
        const message = error?.message || "Unable to load the practice problem.";
        setLoadError(message);
        notify({
          type: "error",
          title: "Problem Load Failed",
          message,
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProblem();

    return () => {
      active = false;
    };
  }, [notify, problemId]);

  useEffect(() => {
    if (!problem) return;
    setCode(getStarterCodeForLanguage(problem, selectedLanguage));
    setOutput("");
    setLastResult(null);
  }, [problem, selectedLanguage]);

  const evaluateCode = async (mode) => {
    if (!problem || !code.trim()) return;

    setRunning(true);
    setRunMode(mode);
    setOutput(
      mode === "test"
        ? `Testing ${selectedLanguage === "cpp" ? "C++" : "JavaScript"} against sample cases...`
        : `Submitting ${selectedLanguage === "cpp" ? "C++" : "JavaScript"} to balanced practice suite...`
    );

    try {
      const result = await evaluatePracticeCode({
        problemId,
        code,
        language: selectedLanguage,
        mode,
      });

      const passed = Boolean(result?.passed);

      setLastResult(result);
      setOutput(
        mode === "submit"
          ? `${result?.output || "Submission finished."}\n\nPractice submit uses a balanced suite: sample + limited hidden/edge checks.`
          : result?.output || "Test run completed."
      );

      if (mode === "submit") {
        setSubmissionCount((prev) => prev + 1);

        try {
          if (user?.uid) {
            const progressResult = await recordPracticeProgress({
              uid: user.uid,
              problemId,
              passed,
            });

            const backendSubmissionCount = Number(progressResult?.progress?.practiceSubmissionCount);
            if (Number.isFinite(backendSubmissionCount)) {
              setSubmissionCount(backendSubmissionCount);
            }

            if (passed && progressResult?.newlySolved) {
              notify({
                type: "success",
                title: "Problem Counted",
                message: "Solved practice problem added to your profile progress.",
                duration: 2300,
              });
            } else if (passed) {
              notify({
                type: "info",
                title: "Already Counted",
                message: "This problem was already counted in your practice progress.",
                duration: 2300,
              });
            }
          }
        } catch {
          notify({
            type: "warning",
            title: "Progress Not Synced",
            message: "Code was evaluated, but profile progress could not be updated right now.",
          });
        }
      } else if (passed) {
        notify({
          type: "success",
          title: "Sample Tests Passed",
          message: `Passed ${result?.passedTestCases ?? 0}/${result?.totalTestCases ?? 0} test case(s).`,
          duration: 2200,
        });
      }
    } catch (error) {
      setOutput(`Runtime Error: ${error?.message || "Unable to execute code."}`);
      notify({
        type: "error",
        title: "Execution Failed",
        message: error?.message || "Unable to execute your code.",
      });
    } finally {
      setRunning(false);
      setRunMode("idle");
    }
  };

  if (loading) {
    return (
      <div className="livebattle-page">
        <section className="livebattle-header-card">
          <div className="livebattle-header-copy">
            <div className="livebattle-pre">PRACTICE</div>
            <h1>Practice</h1>
            <p>Loading selected problem and preparing workspace...</p>
          </div>

          <button className="livebattle-leave-btn" onClick={() => navigate("/practice")}>Back to Problems</button>
        </section>

        <section className="livebattle-wait-panel">
          <div className="livebattle-loader">Preparing workspace...</div>
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="livebattle-page">
        <section className="livebattle-header-card">
          <div className="livebattle-header-copy">
            <div className="livebattle-pre">PRACTICE</div>
            <h1>Practice</h1>
            <p>{loadError}</p>
          </div>

          <button className="livebattle-leave-btn" onClick={() => navigate("/practice")}>Back to Problems</button>
        </section>
      </div>
    );
  }

  return (
    <div className="livebattle-page">
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="livebattle-header-card">
        <div className="livebattle-header-copy">
          <div className="livebattle-pre">PRACTICE</div>
          <h1>Practice</h1>
          <p>
            {problem?.title || "Selected Problem"} • Solve, test, and submit in practice mode.
          </p>
        </div>

        <div className="livebattle-header-right">
          <span className="livebattle-status active">Practice Mode</span>
          <button className="livebattle-leave-btn" onClick={() => navigate("/practice")}>
            Back to Problems
          </button>
        </div>
      </motion.section>

      <div className="livebattle-grid">
        <section className="livebattle-panel livebattle-problem-panel">
          <div className="livebattle-panel-head">
            <h3>Problem</h3>
            <div className="livebattle-problem-meta">
              <span>{problem?.difficulty || "Mixed"}</span>
            </div>
          </div>

          <div className="livebattle-problem-scroll">
            <h4>{problem?.title || "Selected Problem"}</h4>
            <p>{problem?.description || "No description available."}</p>

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
              <pre className="livebattle-example-fallback">No sample case available.</pre>
            )}

            <p className="livebattle-problem-note">
              Practice Test uses sample cases. Practice Submit uses a balanced suite with limited hidden/edge checks.
            </p>
          </div>
        </section>

        <section className="livebattle-panel livebattle-editor-panel">
          <div className="livebattle-panel-head">
            <h3>Solution</h3>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <span className="livebattle-chip">{selectedLanguage === "cpp" ? "C++" : "JavaScript"}</span>
              <select
                className="livebattle-language-select"
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value)}
                disabled={running}
              >
                {LANGUAGE_OPTIONS.map((languageOption) => (
                  <option key={languageOption.value} value={languageOption.value}>
                    {languageOption.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            className="livebattle-code-editor"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck="false"
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
                onClick={() => evaluateCode("test")}
                disabled={running}
              >
                <FontAwesomeIcon icon={faFlask} />
                {running && runMode === "test" ? "Testing..." : "Test (Sample)"}
              </button>

              <button
                className="livebattle-action-btn submit-btn"
                onClick={() => evaluateCode("submit")}
                disabled={running}
              >
                <FontAwesomeIcon icon={faForward} />
                {running && runMode === "submit" ? "Submitting..." : "Submit (Balanced)"}
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

            {submissionCount > 0 ? (
              <div className="livebattle-submission-meta">
                <FontAwesomeIcon icon={faClock} />
                <span>Submission Attempts: {submissionCount}</span>
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
