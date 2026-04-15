import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faCircle, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { fetchPracticeProblems, fetchUserProfile } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext.jsx";
import "./Practice.css";

const DIFFICULTY_OPTIONS = ["all", "easy", "medium", "hard"];

export default function Practice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [availableTags, setAvailableTags] = useState(["all"]);
  const [problems, setProblems] = useState([]);
  const [solvedProblemIds, setSolvedProblemIds] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");

  const solvedProblemSet = useMemo(
    () => new Set((solvedProblemIds || []).map((id) => String(id))),
    [solvedProblemIds]
  );

  useEffect(() => {
    let active = true;

    const loadProfileProgress = async () => {
      if (!user?.uid) {
        setSolvedProblemIds([]);
        return;
      }

      try {
        const profile = await fetchUserProfile(user.uid);
        if (!active) return;
        setSolvedProblemIds(Array.isArray(profile?.practiceSolvedProblemIds) ? profile.practiceSolvedProblemIds : []);
      } catch {
        if (!active) return;
        setSolvedProblemIds([]);
      }
    };

    loadProfileProgress();

    return () => {
      active = false;
    };
  }, [user?.uid]);

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
          tags: selectedTag === "all" ? "" : selectedTag,
        });

        const list = Array.isArray(data?.problems) ? data.problems : [];
        if (!active) return;
        setProblems(list);

        // dynamically build the tags list
        setAvailableTags(prevTags => {
          const tagsSet = new Set(prevTags);
          list.forEach(p => {
             (p.tags || []).forEach(tag => tagsSet.add(tag.toLowerCase()));
          });
          return Array.from(tagsSet);
        });

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
  }, [difficulty, selectedTag]);

  return (
    <div className="archive-root">
      <div className="archive-header">
        <div className="pre-heading">PROBLEM ARCHIVE</div>
        <h1>100+ Problems</h1>
      </div>

      <div className="archive-controls">
        <div className="archive-filters">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="filter-select"
          >
            {DIFFICULTY_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="filter-select"
          >
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag === 'all' ? 'All Types' : tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <a href="#" className="browse-all-link">Browse All Problems <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{fontSize: '0.8rem', marginLeft: '6px'}}/></a>
      </div>

      {error ? <div className="archive-error">{error}</div> : null}

      <div className="archive-list">
        {loadingList ? <div className="loading-state">Loading problems...</div> : null}
        {!loadingList && problems.length === 0 ? <div className="empty-state">No practice problems found.</div> : null}
        
        {!loadingList && problems.map((problem, index) => {
          const numberStr = `#${String(index + 1).padStart(3, '0')}`;
          // Mocking acceptance rate for UI
          const acceptanceRate = (Math.random() * 40 + 30).toFixed(1) + "%";
          const isSolved = solvedProblemSet.has(String(problem._id));

          return (
            <div
              key={problem._id}
              className="archive-row"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/practice/${problem._id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/practice/${problem._id}`);
                }
              }}
              aria-label={`Open practice problem ${problem.title}`}
            >
              <div className="col-num">{numberStr}</div>
              <div className="col-status">
                {isSolved ? (
                  <FontAwesomeIcon icon={faCheckCircle} className="status-icon solved" />
                ) : (
                  <FontAwesomeIcon icon={faCircle} className="status-icon unsolved" />
                )}
              </div>
              <div className="col-title">{problem.title}</div>
              <div className="col-tags">
                {(problem.tags || ["Array"]).slice(0, 2).map((tag, i) => (
                  <span key={i} className="tag-pill">{tag}</span>
                ))}
              </div>
              <div className="col-acc">{acceptanceRate}</div>
              <div className={`col-diff diff-${(problem.difficulty || "easy").toLowerCase()}`}>
                <span>{(problem.difficulty || "easy").charAt(0).toUpperCase() + (problem.difficulty || "easy").slice(1)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
