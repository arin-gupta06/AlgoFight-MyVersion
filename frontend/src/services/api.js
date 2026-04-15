const API_URL = "http://localhost:3001";

/**
 * Sync Firebase user to backend after login/signup
 */
export async function syncUserToBackend({ uid, email, displayName, photoURL }) {
  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, email, displayName, photoURL }),
  });
  return res.json();
}

/**
 * Fetch leaderboard data from backend
 */
export async function fetchLeaderboard() {
  const res = await fetch(`${API_URL}/api/leaderboard`);
  return res.json();
}

/**
 * Fetch user profile by Firebase UID
 */
export async function fetchUserProfile(uid) {
  const res = await fetch(`${API_URL}/api/users/${uid}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch practice problems only.
 */
export async function fetchPracticeProblems({ page = 1, limit = 50, difficulty = "" } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    mode: "practice",
  });

  if (difficulty) {
    params.set("difficulty", difficulty);
  }

  const res = await fetch(`${API_URL}/api/problems?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch practice problems");
  }
  return res.json();
}

/**
 * Fetch one problem with only public testcase data.
 */
export async function fetchProblemById(problemId) {
  const res = await fetch(`${API_URL}/api/problems/${problemId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch problem");
  }
  return res.json();
}

export { API_URL };
