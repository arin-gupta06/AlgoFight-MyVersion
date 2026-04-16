import { auth } from "../firebaseConfig";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function toApiUrl(path) {
  return API_URL ? `${API_URL}${path}` : path;
}

async function parseResponseBody(res) {
  const text = await res.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    const preview = text.slice(0, 120).replace(/\s+/g, " ").trim();
    throw new Error(
      `Expected JSON response but got: ${preview || "<empty>"}`
    );
  }
}

function extractErrorMessage(parsedBody, status) {
  if (parsedBody && typeof parsedBody === "object") {
    return parsedBody.message || parsedBody.error || `Request failed (${status})`;
  }
  return `Request failed (${status})`;
}

async function requestJson(path, options = {}) {
  const {
    includeAuth = false,
    headers,
    ...restOptions
  } = options;

  const requestHeaders = {
    ...(headers || {}),
  };

  if (includeAuth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Unable to attach auth token", error);
    }
  }

  const res = await fetch(toApiUrl(path), {
    ...restOptions,
    headers: requestHeaders,
  });
  const parsedBody = await parseResponseBody(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(parsedBody, res.status));
  }

  return parsedBody;
}

/**
 * Sync Firebase user to backend after login/signup
 */
export async function syncUserToBackend({ uid, email, displayName, photoURL, authToken }) {
  return requestJson("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ uid, email, displayName, photoURL }),
    includeAuth: true,
  });
}

/**
 * Fetch leaderboard data from backend
 */
export async function fetchLeaderboard() {
  return requestJson("/api/leaderboard");
}

/**
 * Fetch user profile by Firebase UID
 */
export async function fetchUserProfile(uid) {
  try {
    return await requestJson(`/api/users/${uid}`, {
      includeAuth: true,
    });
  } catch {
    return null;
  }
}

/**
 * Fetch problems with optional filters.
 */
export async function fetchPracticeProblems({ page = 1, limit = 50, difficulty = "", tags = "", mode = "" } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (mode) {
    params.set("mode", mode);
  }
  if (difficulty) {
    params.set("difficulty", difficulty);
  }
  if (tags) {
    params.set("tags", tags);
  }

  return requestJson(`/api/problems?${params.toString()}`);
}

/**
 * Fetch one problem with only public testcase data.
 */
export async function fetchProblemById(problemId) {
  return requestJson(`/api/problems/${problemId}`);
}

/**
 * Record a practice submission for the current user.
 */
export async function recordPracticeProgress({ uid, problemId, passed }) {
  return requestJson(`/api/users/${uid}/practice-progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problemId, passed }),
    includeAuth: true,
  });
}

/**
 * Evaluate practice code against sample or balanced submit suite.
 */
export async function evaluatePracticeCode({ problemId, code, language, mode }) {
  return requestJson("/api/practice/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problemId, code, language, mode }),
    includeAuth: true,
  });
}

export { API_URL };
