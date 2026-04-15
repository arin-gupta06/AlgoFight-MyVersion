import React, { useEffect, useMemo, useState } from "react";
import { fetchPracticeProblems, fetchProblemById } from "../../services/api";
import "./Practice.css";

const DIFFICULTY_OPTIONS = ["all", "easy", "medium", "hard"];

export default function Practice() {
  const [difficulty, setDifficulty] = useState("all");
  const [problems, setProblems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadProblems = async () => {
      try {
        setLoadingList(true);
        setError("");
        const data = await fetchPracticeProblems({
          page: 1,
          limit: 100,
          difficulty: difficulty === "all" ? "" : difficulty,
        });

        const list = Array.isArray(data?.problems) ? data.problems : [];
        if (!active) return;

        setProblems(list);
        if (list.length > 0) {
          setSelectedId((prev) => prev || list[0]._id);
        } else {
          setSelectedId("");
          setSelectedProblem(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "Unable to load practice problems");
      } finally {
        if (active) {
          setLoadingList(false);
        }
      }
    };

    loadProblems();
    return () => {
      active = false;
    };
  }, [difficulty]);

  useEffect(() => {
    let active = true;
    if (!selectedId) return () => {
      active = false;
    };

    const loadProblem = async () => {
      try {
        setLoadingDetails(true);
        setError("");
        const data = await fetchProblemById(selectedId);
        if (!active) return;
        setSelectedProblem(data);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Unable to load selected problem");
      } finally {
        if (active) {
          setLoadingDetails(false);
        }
      }
    };

    loadProblem();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const selectedMeta = useMemo(() => {
    if (!selectedProblem) return null;
    return {
      testCaseCount: Array.isArray(selectedProblem.testCases) ? selectedProblem.testCases.length : 0,
      tags: Array.isArray(selectedProblem.tags) ? selectedProblem.tags : [],
    };
  }, [selectedProblem]);

  return (
    <div className="practice-root">
      <div className="practice-header">
        <h1>Practice Zone</h1>
        <p>
          Individual training mode powered by the 20% practice pool. Hidden tests remain secure and are checked
          when you submit in coding battles.
        </p>
      </div>

      <div className="practice-toolbar">
        <label htmlFor="practice-difficulty">Difficulty</label>
        <select
          id="practice-difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="practice-select"
        >
          {DIFFICULTY_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {level.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="practice-error">{error}</div> : null}

      <div className="practice-grid">
        <aside className="practice-list card-hud">
          <h2>Practice Problems</h2>
          {loadingList ? <p>Loading problems...</p> : null}
          {!loadingList && problems.length === 0 ? <p>No practice problems found.</p> : null}
          <ul>
            {problems.map((problem) => (
              <li key={problem._id}>
                <button
                  type="button"
                  className={selectedId === problem._id ? "problem-item active" : "problem-item"}
                  onClick={() => setSelectedId(problem._id)}
                >
                  <span className="problem-title">{problem.title}</span>
                  <span className={`problem-difficulty difficulty-${problem.difficulty || "easy"}`}>
                    {(problem.difficulty || "easy").toUpperCase()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="practice-details card-hud">
          {loadingDetails ? <p>Loading problem details...</p> : null}
          {!loadingDetails && !selectedProblem ? <p>Select a problem to start practicing.</p> : null}

          {!loadingDetails && selectedProblem ? (
            <>
              <div className="practice-title-row">
                <h2>{selectedProblem.title}</h2>
                <span className={`problem-difficulty difficulty-${selectedProblem.difficulty || "easy"}`}>
                  {(selectedProblem.difficulty || "easy").toUpperCase()}
                </span>
              </div>

              <p className="practice-description">{selectedProblem.description}</p>

              <div className="practice-meta">
                <div>
                  <h3>Constraints</h3>
                  <p>{selectedProblem.constraints || "No constraints specified."}</p>
                </div>
                <div>
                  <h3>Visible Testcases</h3>
                  <p>{selectedMeta?.testCaseCount || 0} sample cases available in practice view.</p>
                </div>
              </div>

              <div className="practice-tags">
                {(selectedMeta?.tags || []).map((tag) => (
                  <span key={tag} className="tag-hud">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="practice-cases">
                <h3>Sample Cases</h3>
                <ul>
                  {(selectedProblem.testCases || []).slice(0, 6).map((testCase, idx) => (
                    <li key={`${selectedProblem._id}-tc-${idx}`}>
                      <strong>Input:</strong> {String(testCase.input)}
                      <br />
                      <strong>Output:</strong> {String(testCase.output)}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
