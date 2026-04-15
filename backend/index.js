require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const vm = require("vm");
const mongoose = require("mongoose");

// ─── Models ─────────────────────────────────────────────
const User = require("./models/User");
const Problem = require("./src/models/Problem");
const Match = require("./src/models/Match");
const problemRoutes = require("./src/routes/problemRoutes");
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const RECENT_PROBLEM_WINDOW = parseInt(process.env.RECENT_PROBLEM_WINDOW, 10) || 20;

const app = express();
app.use(cors({ origin: frontendUrl }));
app.use(express.json());
app.use("/api/problems", problemRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ["GET", "POST"]
  }
});

// Attach socket IO completely over to req.app for controllers
app.set('io', io);

io.on('connection', (socket) => {
    socket.on('join_match', (matchId) => {
        socket.join(matchId);
        console.log(`User joined match: ${matchId}`);
    });
    
    // Opponent typing progress (live updates constraint)
    socket.on('code_typing', ({ matchId, userId, codeLength }) => {
        socket.to(matchId).emit('opponent_progress', { userId, codeLength });
    });
});

// ─── MongoDB Connection ─────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error(`MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  });

// ─── Seed Problems on First Run ─────────────────────────
const SEED_PROBLEMS = [
  {
    title: "Sum of Two Numbers",
    description: "Write a function `solution(a, b)` that returns the sum of two numbers.",
    example: "solution(2, 3) -> 5",
    difficulty: "easy",
    testCases: [
      { input: [2, 3], expected: 5, visibility: "sample" },
      { input: [0, 0], expected: 0, visibility: "sample" },
      { input: [-1, 5], expected: 4, visibility: "hidden" },
      { input: [100, 200], expected: 300, visibility: "hidden" },
      { input: [999999999, 1], expected: 1000000000, visibility: "edge" }
    ],
    starterCode: "function solution(a, b) {\n  // Write code here\n}"
  },
  {
    title: "Reverse String",
    description: "Write a function `solution(str)` that reverses the string.",
    example: "solution('hello') -> 'olleh'",
    difficulty: "easy",
    testCases: [
      { input: ["hello"], expected: "olleh", visibility: "sample" },
      { input: ["racecar"], expected: "racecar", visibility: "sample" },
      { input: ["12345"], expected: "54321", visibility: "hidden" },
      { input: ["AlgoFight"], expected: "thgiFoglA", visibility: "hidden" },
      { input: [""], expected: "", visibility: "edge" }
    ],
    starterCode: "function solution(str) {\n  // Write code here\n}"
  },
  {
    title: "Is Palindrome",
    description: "Write a function `solution(str)` that checks if a string is a palindrome.",
    example: "solution('madam') -> true",
    difficulty: "easy",
    testCases: [
      { input: ["madam"], expected: true, visibility: "sample" },
      { input: ["hello"], expected: false, visibility: "sample" },
      { input: ["racecar"], expected: true, visibility: "hidden" },
      { input: ["123"], expected: false, visibility: "hidden" },
      { input: [""], expected: true, visibility: "edge" }
    ],
    starterCode: "function solution(str) {\n  // Write code here\n}"
  },
  {
    title: "Find Maximum",
    description: "Write a function `solution(arr)` that returns the maximum value in an array.",
    example: "solution([3, 1, 4, 1, 5]) -> 5",
    difficulty: "easy",
    testCases: [
      { input: [[3, 1, 4, 1, 5, 9]], expected: 9, visibility: "sample" },
      { input: [[-1, -5, -3]], expected: -1, visibility: "sample" },
      { input: [[42]], expected: 42, visibility: "hidden" },
      { input: [[0, 0, 0]], expected: 0, visibility: "hidden" },
      { input: [[-1000000000, -999999999]], expected: -999999999, visibility: "edge" }
    ],
    starterCode: "function solution(arr) {\n  // Write code here\n}"
  },
  {
    title: "Count Vowels",
    description: "Write a function `solution(str)` that returns the number of vowels (a, e, i, o, u) in a string (case-insensitive).",
    example: "solution('hello') -> 2",
    difficulty: "easy",
    testCases: [
      { input: ["hello"], expected: 2, visibility: "sample" },
      { input: ["xyz"], expected: 0, visibility: "sample" },
      { input: ["AEIOU"], expected: 5, visibility: "hidden" },
      { input: ["AlgoFight"], expected: 3, visibility: "hidden" },
      { input: [""], expected: 0, visibility: "edge" }
    ],
    starterCode: "function solution(str) {\n  // Write code here\n}"
  }
];

async function seedProblems() {
  try {
    const count = await Problem.countDocuments();
    if (count === 0) {
      await Problem.insertMany(SEED_PROBLEMS);
      console.log(`Seeded ${SEED_PROBLEMS.length} problems to database`);
    } else {
      console.log(`${count} problems already in database`);
    }
    await loadProblemCache();
  } catch (err) {
    console.error("Problem seeding error:", err.message);
  }
}

mongoose.connection.once('open', seedProblems);

// ─── Matchmaking State (in-memory, single server) ──────
let waitingPlayer = null;
const activeBattles = {}; // roomId -> battle info
let problemCache = [];
const recentProblemIds = [];

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const normalizeDifficulty = (value) => {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : null;
};

const inferDifficultyFromRating = (rating) => {
  if (!Number.isFinite(Number(rating))) return null;
  const score = Number(rating);
  if (score < 1300) return "easy";
  if (score < 1700) return "medium";
  return "hard";
};

const rememberProblem = (problemId) => {
  if (!problemId) return;
  const serialized = String(problemId);
  recentProblemIds.push(serialized);
  while (recentProblemIds.length > RECENT_PROBLEM_WINDOW) {
    recentProblemIds.shift();
  }
};

const applyCacheFilters = (problems, options = {}) => {
  const desiredDifficulty = normalizeDifficulty(options.difficulty);
  const desiredTags = normalizeTags(options.tags);

  return (problems || []).filter((problem) => {
    if (!problem || problem.isBattleReady !== true) return false;
    if ((problem.mode || "battle") !== "battle") return false;
    if (desiredDifficulty && problem.difficulty !== desiredDifficulty) return false;
    if (desiredTags.length > 0) {
      const problemTags = Array.isArray(problem.tags) ? problem.tags : [];
      const matchedTag = desiredTags.some((tag) => problemTags.includes(tag));
      if (!matchedTag) return false;
    }

    const id = problem._id ? String(problem._id) : null;
    if (id && recentProblemIds.includes(id)) return false;
    return true;
  });
};

async function loadProblemCache() {
  try {
    problemCache = await Problem.find({
      isBattleReady: true,
      $or: [{ mode: "battle" }, { mode: { $exists: false } }, { mode: null }],
    }).lean();
    console.log(`Problem cache ready: ${problemCache.length}`);
  } catch (err) {
    problemCache = [];
    console.error("Problem cache load error:", err.message);
  }
}

async function pickRandomProblem(options = {}) {
  const desiredDifficulty = normalizeDifficulty(options.difficulty);
  const desiredTags = normalizeTags(options.tags);

  const sampleFilters = {
    isBattleReady: true,
    $or: [{ mode: "battle" }, { mode: { $exists: false } }, { mode: null }],
  };
  if (desiredDifficulty) {
    sampleFilters.difficulty = desiredDifficulty;
  }
  if (desiredTags.length > 0) {
    sampleFilters.tags = { $in: desiredTags };
  }

  const buildSamplePipeline = (includeRecentExclusion) => {
    const match = { ...sampleFilters };
    if (includeRecentExclusion && recentProblemIds.length > 0) {
      const recentObjectIds = recentProblemIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (recentObjectIds.length > 0) {
        match._id = { $nin: recentObjectIds };
      }
    }
    return [{ $match: match }, { $sample: { size: 1 } }];
  };

  try {
    let sampled = await Problem.aggregate(buildSamplePipeline(true));
    if ((!sampled || sampled.length === 0) && recentProblemIds.length > 0) {
      sampled = await Problem.aggregate(buildSamplePipeline(false));
    }

    if (sampled && sampled.length > 0) {
      const selected = sampled[0];
      rememberProblem(selected._id);
      return selected;
    }
  } catch (err) {
    console.error("Problem sampling error:", err.message);
  }

  const filteredCache = applyCacheFilters(problemCache, { difficulty: desiredDifficulty, tags: desiredTags });
  if (filteredCache.length > 0) {
    const selected = filteredCache[Math.floor(Math.random() * filteredCache.length)];
    rememberProblem(selected._id);
    return selected;
  }

  if (problemCache.length > 0) {
    const fallbackFilteredByDifficultyAndTags = (problemCache || []).filter((problem) => {
      if (!problem || problem.isBattleReady !== true) return false;
      if ((problem.mode || "battle") !== "battle") return false;
      if (desiredDifficulty && problem.difficulty !== desiredDifficulty) return false;
      if (desiredTags.length > 0) {
        const problemTags = Array.isArray(problem.tags) ? problem.tags : [];
        return desiredTags.some((tag) => problemTags.includes(tag));
      }
      return true;
    });

    if (fallbackFilteredByDifficultyAndTags.length > 0) {
      const selected = fallbackFilteredByDifficultyAndTags[Math.floor(Math.random() * fallbackFilteredByDifficultyAndTags.length)];
      rememberProblem(selected._id);
      return selected;
    }
  }

  const seed = SEED_PROBLEMS[Math.floor(Math.random() * SEED_PROBLEMS.length)];
  return { ...seed, _id: null, isBattleReady: true };
}

function getStarterCodePayload(problem) {
  if (!problem || !problem.starterCode) {
    return {
      javascript: "function solution(input) {\n  // Write code here\n  return input;\n}",
      python: "def solution(input_data):\n    # Write code here\n    return input_data\n"
    };
  }

  if (typeof problem.starterCode === "string") {
    return {
      javascript: problem.starterCode,
      python: "def solution(input_data):\n    # Write code here\n    return input_data\n"
    };
  }

  return {
    javascript: problem.starterCode.javascript || "",
    python: problem.starterCode.python || ""
  };
}

function getVisibleTestCases(problem) {
  const testCases = Array.isArray(problem?.testCases) ? problem.testCases : [];
  return testCases.filter((testCase) => testCase.hidden === false || testCase.visibility === "sample");
}

function toPublicProblem(problem) {
  const examples = Array.isArray(problem?.examples) ? problem.examples : [];
  const fallbackExample = examples[0] ? `${examples[0].input} -> ${examples[0].output}` : (problem?.example || "");

  return {
    _id: problem?._id,
    title: problem?.title,
    description: problem?.description,
    constraints: problem?.constraints || "",
    examples,
    example: fallbackExample,
    starterCode: getStarterCodePayload(problem),
    testCases: getVisibleTestCases(problem).map((testCase) => ({
      input: String(testCase.input),
      output: String(testCase.output ?? testCase.expected ?? testCase.expectedOutput ?? "")
    })),
    difficulty: problem?.difficulty,
    tags: Array.isArray(problem?.tags) ? problem.tags : []
  };
}

// ─── REST Endpoints ─────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Algo-Fight Server is Running");
});

// Sync Firebase user to MongoDB (create or update)
app.post("/api/users", async (req, res) => {
  const { uid, email, displayName, photoURL } = req.body;
  try {
    let user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        email,
        displayName: displayName || "New Player",
        photoURL
      });
      console.log(`New user synced: ${displayName}`);
    } else {
      // Always update displayName & photoURL so changes propagate
      let changed = false;
      if (displayName && user.displayName !== displayName) { user.displayName = displayName; changed = true; }
      if (photoURL && user.photoURL !== photoURL) { user.photoURL = photoURL; changed = true; }
      if (email && user.email !== email) { user.email = email; changed = true; }
      if (changed) await user.save();
    }
    res.json({
      success: true,
      message: "User synced",
      user: {
        _id: user._id,
        firebaseUid: user.firebaseUid,
        displayName: user.displayName,
        email: user.email,
        rating: user.rating,
        matchesPlayed: user.matchesPlayed,
        matchesWon: user.matchesWon
      }
    });
  } catch (err) {
    console.error("User sync error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user profile by Firebase UID
app.get("/api/users/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid })
      .select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Leaderboard from MongoDB
app.get("/api/leaderboard", async (req, res) => {
  try {
    const users = await User.find()
      .sort({ rating: -1 })
      .limit(50)
      .select("displayName rating matchesPlayed matchesWon");

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      user: u.displayName || "Anonymous",
      score: u.rating,
      winRate: u.matchesPlayed > 0
        ? `${Math.round((u.matchesWon / u.matchesPlayed) * 100)}%`
        : "0%"
    }));
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Code Execution (vm sandbox) ────────────────────────
const CASE_VISIBILITY = Object.freeze({
  SAMPLE: "sample",
  HIDDEN: "hidden",
  EDGE: "edge"
});

function normalizeVisibility(value, fallback = CASE_VISIBILITY.HIDDEN) {
  if (!value) return fallback;
  const normalized = String(value).toLowerCase();

  if (["sample", "public", "example"].includes(normalized)) {
    return CASE_VISIBILITY.SAMPLE;
  }

  if (["edge", "edgecase", "edge_case", "corner", "cornercase"].includes(normalized)) {
    return CASE_VISIBILITY.EDGE;
  }

  if (["hidden", "private", "secret"].includes(normalized)) {
    return CASE_VISIBILITY.HIDDEN;
  }

  return fallback;
}

function resolveExpectedValue(testCase = {}) {
  if (Object.prototype.hasOwnProperty.call(testCase, "expected")) {
    return testCase.expected;
  }
  if (Object.prototype.hasOwnProperty.call(testCase, "expectedOutput")) {
    return testCase.expectedOutput;
  }
  return undefined;
}

function normalizeInputArgs(input) {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

function serializeArgForVm(arg) {
  const serialized = JSON.stringify(arg);
  return typeof serialized === "undefined" ? "undefined" : serialized;
}

function normalizeTestCase(testCase, defaultVisibility) {
  if (!testCase || typeof testCase !== "object") {
    return null;
  }

  const expected = resolveExpectedValue(testCase);
  if (typeof expected === "undefined") {
    return null;
  }

  const visibility = normalizeVisibility(
    testCase.visibility || testCase.caseType || testCase.category || testCase.type || (testCase.isHidden ? "hidden" : undefined),
    defaultVisibility
  );

  return {
    input: normalizeInputArgs(testCase.input),
    expected,
    visibility
  };
}

function normalizeCaseList(list, defaultVisibility) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((testCase) => normalizeTestCase(testCase, defaultVisibility))
    .filter(Boolean);
}

function dedupeCases(cases) {
  const seen = new Set();
  const output = [];

  for (const testCase of cases) {
    const key = JSON.stringify([testCase.input, testCase.expected, testCase.visibility]);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(testCase);
  }

  return output;
}

function buildEvaluationSuites(problem) {
  const primaryCases = normalizeCaseList(problem?.testCases, CASE_VISIBILITY.HIDDEN);
  const sampleCasesFromSeparate = normalizeCaseList(problem?.sampleTestCases, CASE_VISIBILITY.SAMPLE);
  const hiddenCasesFromSeparate = normalizeCaseList(problem?.hiddenTestCases, CASE_VISIBILITY.HIDDEN);
  const edgeCasesFromSeparate = normalizeCaseList(problem?.edgeTestCases, CASE_VISIBILITY.EDGE);
  const edgeCasesAlias = normalizeCaseList(problem?.edgeCases, CASE_VISIBILITY.EDGE);

  const hasSeparateBuckets =
    sampleCasesFromSeparate.length > 0 ||
    hiddenCasesFromSeparate.length > 0 ||
    edgeCasesFromSeparate.length > 0 ||
    edgeCasesAlias.length > 0;

  const primarySamples = primaryCases.filter((testCase) => testCase.visibility === CASE_VISIBILITY.SAMPLE);
  const primaryHidden = primaryCases.filter((testCase) => testCase.visibility === CASE_VISIBILITY.HIDDEN);
  const primaryEdge = primaryCases.filter((testCase) => testCase.visibility === CASE_VISIBILITY.EDGE);

  let sampleCases = [];
  let hiddenCases = [];
  let edgeCases = [];

  if (hasSeparateBuckets) {
    sampleCases = dedupeCases([...sampleCasesFromSeparate, ...primarySamples]);
    hiddenCases = dedupeCases([...hiddenCasesFromSeparate, ...primaryHidden]);
    edgeCases = dedupeCases([...edgeCasesFromSeparate, ...edgeCasesAlias, ...primaryEdge]);
  } else if (primarySamples.length > 0 || primaryEdge.length > 0) {
    sampleCases = dedupeCases(primarySamples);
    hiddenCases = dedupeCases(primaryHidden);
    edgeCases = dedupeCases(primaryEdge);
  } else {
    // Backward compatibility for legacy problems with a flat testcase list.
    sampleCases = primaryCases
      .slice(0, Math.min(2, primaryCases.length))
      .map((testCase) => ({ ...testCase, visibility: CASE_VISIBILITY.SAMPLE }));
    hiddenCases = primaryCases
      .slice(sampleCases.length)
      .map((testCase) => ({ ...testCase, visibility: CASE_VISIBILITY.HIDDEN }));
    edgeCases = [];
  }

  const submissionCases = dedupeCases([...sampleCases, ...hiddenCases, ...edgeCases]);

  return {
    sampleCases,
    hiddenCases,
    edgeCases,
    submissionCases
  };
}

function executeCode(userCode, testCases, options = {}) {
  const { revealHiddenDetails = true } = options;

  try {
    const startedAt = Date.now();
    const safeTestCases = Array.isArray(testCases) ? testCases : [];
    if (safeTestCases.length === 0) {
      return {
        passed: false,
        totalTestCases: 0,
        passedTestCases: 0,
        failedCases: [],
        executionTime: 0,
        output: "No test cases configured for this problem."
      };
    }

    const sandbox = Object.create(null);
    sandbox.console = { log: () => {} };
    vm.createContext(sandbox, {
      codeGeneration: { strings: false, wasm: false },
      name: "algofight-battle-sandbox"
    });
    vm.runInContext(userCode, sandbox, { timeout: 2000 });

    if (typeof sandbox.solution !== 'function') {
      return {
        passed: false,
        totalTestCases: safeTestCases.length,
        passedTestCases: 0,
        failedCases: [],
        executionTime: Date.now() - startedAt,
        output: "Error: function 'solution' not found."
      };
    }

    const failures = [];
    let passedCases = 0;

    for (let i = 0; i < safeTestCases.length; i++) {
      const currentCase = safeTestCases[i];
      const caseVisibility = normalizeVisibility(currentCase.visibility, CASE_VISIBILITY.HIDDEN);
      const args = normalizeInputArgs(currentCase.input)
        .map((arg) => serializeArgForVm(arg))
        .join(",");
      const expectedValue = resolveExpectedValue(currentCase);

      try {
        const result = vm.runInContext(`solution(${args})`, sandbox, { timeout: 1000 });
        const actual = JSON.stringify(result);
        const expected = JSON.stringify(expectedValue);

        if (actual !== expected) {
          failures.push({
            index: i + 1,
            visibility: caseVisibility,
            input: currentCase.input,
            expected: expectedValue,
            actual: result,
            reason: "Wrong Answer"
          });
          continue;
        }

        passedCases += 1;
      } catch (err) {
        failures.push({
          index: i + 1,
          visibility: caseVisibility,
          input: currentCase.input,
          expected: expectedValue,
          actual: null,
          reason: `Runtime Error: ${err.message}`
        });
      }
    }

    if (failures.length === 0) {
      return {
        passed: true,
        totalTestCases: safeTestCases.length,
        passedTestCases: safeTestCases.length,
        failedCases: [],
        executionTime: Date.now() - startedAt,
        output: `All ${safeTestCases.length} test cases passed.`
      };
    }

    const sampleFailures = failures.filter((failure) => failure.visibility === CASE_VISIBILITY.SAMPLE);
    const hiddenAndEdgeFailures = failures.filter((failure) => failure.visibility !== CASE_VISIBILITY.SAMPLE);
    const visibleFailedCases = sampleFailures.map((failure) => ({
      input: String(failure.input),
      output: String(failure.expected),
      got: String(failure.actual),
      reason: failure.reason
    }));

    if (!revealHiddenDetails) {
      let output = `Passed ${passedCases}/${safeTestCases.length} test cases.`;

      if (sampleFailures.length > 0) {
        const sampleFailure = sampleFailures[0];
        output += `\nSample Case ${sampleFailure.index} failed\nInput: ${JSON.stringify(sampleFailure.input)}\nExpected: ${JSON.stringify(sampleFailure.expected)}\nGot: ${JSON.stringify(sampleFailure.actual)}\nReason: ${sampleFailure.reason}`;
      }

      if (hiddenAndEdgeFailures.length > 0) {
        output += `\nFailed ${hiddenAndEdgeFailures.length} hidden/edge test case(s).`;
      }

      return {
        passed: false,
        totalTestCases: safeTestCases.length,
        passedTestCases: passedCases,
        failedCases: visibleFailedCases,
        executionTime: Date.now() - startedAt,
        failedHiddenCases: hiddenAndEdgeFailures.length,
        output
      };
    }

    const firstFailure = failures[0];
    return {
      passed: false,
      totalTestCases: safeTestCases.length,
      passedTestCases: passedCases,
      failedCases: visibleFailedCases,
      executionTime: Date.now() - startedAt,
      output: `Passed ${passedCases}/${safeTestCases.length} test cases.\nFailed Test Case ${firstFailure.index}\nInput: ${JSON.stringify(firstFailure.input)}\nExpected: ${JSON.stringify(firstFailure.expected)}\nGot: ${JSON.stringify(firstFailure.actual)}\nReason: ${firstFailure.reason}`
    };
  } catch (err) {
    return {
      passed: false,
      totalTestCases: Array.isArray(testCases) ? testCases.length : 0,
      passedTestCases: 0,
      failedCases: [],
      executionTime: 0,
      output: `Runtime Error: ${err.message}`
    };
  }
}

// ─── Elo Rating ─────────────────────────────────────────
const ELO_K = parseInt(process.env.ELO_K_FACTOR) || 32;

async function updateRatings(winnerId, loserId) {
  try {
    const winner = await User.findById(winnerId);
    const loser = await User.findById(loserId);
    if (!winner || !loser) return;

    const eW = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const eL = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

    winner.rating = Math.round(winner.rating + ELO_K * (1 - eW));
    loser.rating = Math.max(0, Math.round(loser.rating + ELO_K * (0 - eL)));
    winner.matchesPlayed += 1;
    winner.matchesWon += 1;
    loser.matchesPlayed += 1;

    await winner.save();
    await loser.save();
    console.log(`Rating: ${winner.displayName} (${winner.rating}) beat ${loser.displayName} (${loser.rating})`);
  } catch (err) {
    console.error("Rating update error:", err.message);
  }
}

function comparePassRecords(a, b) {
  if (a.passedAt !== b.passedAt) {
    return a.passedAt - b.passedAt;
  }
  if (a.executionTime !== b.executionTime) {
    return a.executionTime - b.executionTime;
  }
  if (a.submissions !== b.submissions) {
    return a.submissions - b.submissions;
  }
  return String(a.username || "").localeCompare(String(b.username || ""));
}

async function finalizeBattle(roomId, battle, winnerRecord, reason) {
  if (!battle || battle.completed) return;
  battle.completed = true;

  io.to(roomId).emit("battle_over", {
    winner: winnerRecord.username,
    reason
  });

  try {
    if (battle.matchDbId) {
      await Match.findByIdAndUpdate(battle.matchDbId, {
        status: 'completed',
        winner: winnerRecord.dbUserId || undefined,
        winnerUsername: winnerRecord.username,
        endTime: new Date()
      });
    }

    if (winnerRecord.dbUserId) {
      const loserId = winnerRecord.socketId === battle.p1 ? battle.p2DbId : battle.p1DbId;
      if (loserId) {
        await updateRatings(winnerRecord.dbUserId, loserId);
      }
    }
  } catch (err) {
    console.error("Match completion error:", err.message);
  }

  delete activeBattles[roomId];
}

// ─── Socket.IO ──────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("find_match", async (userData) => {
    const { username, uid, difficulty, tags } = userData;
    console.log(`${username} (uid: ${uid}) is looking for a match...`);
    socket.username = username;
    socket.firebaseUid = uid || null;
    socket.preferredDifficulty = normalizeDifficulty(difficulty);
    socket.preferredTags = normalizeTags(tags);

    // Look up user in DB by firebaseUid (reliable), fallback to displayName/email
    let dbUser = null;
    if (uid) {
      dbUser = await User.findOne({ firebaseUid: uid }).catch(() => null);
    }
    if (!dbUser) {
      dbUser = await User.findOne({
        $or: [{ displayName: username }, { email: username }]
      }).catch(() => null);
    }
    socket.dbUserId = dbUser ? dbUser._id : null;
    socket.dbRating = dbUser ? dbUser.rating : null;
    console.log(`DB user lookup: ${dbUser ? dbUser.displayName + ' (' + dbUser._id + ')' : 'NOT FOUND'}`);

    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const opponent = waitingPlayer;
      waitingPlayer = null;
      const roomId = `room_${opponent.id}_${socket.id}`;

      socket.join(roomId);
      opponent.join(roomId);

      const bothPreferSameDifficulty =
        socket.preferredDifficulty &&
        opponent.preferredDifficulty &&
        socket.preferredDifficulty === opponent.preferredDifficulty;

      const averageRating = [socket.dbRating, opponent.dbRating]
        .filter((rating) => Number.isFinite(Number(rating)))
        .reduce((sum, rating, _, arr) => sum + Number(rating) / arr.length, 0);

      const resolvedDifficulty =
        (bothPreferSameDifficulty && socket.preferredDifficulty) ||
        socket.preferredDifficulty ||
        opponent.preferredDifficulty ||
        inferDifficultyFromRating(averageRating);

      const mergedTags = Array.from(new Set([...(socket.preferredTags || []), ...(opponent.preferredTags || [])]));

      // Use preloaded problem cache to avoid first-match DB lookup latency.
      const problem = await pickRandomProblem({
        difficulty: resolvedDifficulty,
        tags: mergedTags
      });
      const evaluationSuites = buildEvaluationSuites(problem);

      // Create Match in DB
      let matchDoc = null;
      try {
        matchDoc = await Match.create({
          player1: opponent.dbUserId || undefined,
          player2: socket.dbUserId || undefined,
          player1Username: opponent.username,
          player2Username: username,
          battleId: roomId,
          players: [opponent.dbUserId || undefined, socket.dbUserId || undefined].filter(Boolean),
          problemId: problem._id || undefined,
          status: 'active',
          roomId,
          startTime: new Date()
        });
      } catch (err) {
        console.error("Match creation error:", err.message);
      }

      activeBattles[roomId] = {
        p1: opponent.id,
        p2: socket.id,
        p1DbId: opponent.dbUserId,
        p2DbId: socket.dbUserId,
        p1Username: opponent.username,
        p2Username: username,
        problem,
        evaluationSuites,
        submissionAttempts: {
          [opponent.id]: 0,
          [socket.id]: 0
        },
        passRecords: {},
        completed: false,
        matchDbId: matchDoc ? matchDoc._id : null
      };

      console.log(`Match found: ${opponent.username} vs ${username} in ${roomId}`);

      // Send problem to both players (without test cases for security display)
      const publicProblem = toPublicProblem(problem);
      io.to(roomId).emit("match_found", {
        roomId,
        problem: {
          ...publicProblem,
          starterCodeByLanguage: publicProblem.starterCode,
          starterCode: publicProblem.starterCode.javascript || ""
        },
        players: [opponent.username, username]
      });

    } else {
      waitingPlayer = socket;
      socket.emit("waiting_for_opponent");
      console.log(`${username} added to waiting queue.`);
    }
  });

  socket.on("test_code", (data) => {
    const { code, roomId } = data;
    const battle = activeBattles[roomId];

    if (!battle) {
      return socket.emit("error", "Battle not found!");
    }

    const suites = battle.evaluationSuites || buildEvaluationSuites(battle.problem);
    const sampleCases = suites.sampleCases.length > 0
      ? suites.sampleCases
      : suites.submissionCases.slice(0, Math.min(2, suites.submissionCases.length));

    const result = executeCode(code, sampleCases, { revealHiddenDetails: true });
    socket.emit("code_result", { result });
  });

  socket.on("submit_code", async (data) => {
    const { code, roomId } = data;
    const battle = activeBattles[roomId];

    if (!battle) {
      return socket.emit("error", "Battle not found!");
    }

    const suites = battle.evaluationSuites || buildEvaluationSuites(battle.problem);
    const submissionCases = suites.submissionCases;

    battle.submissionAttempts = battle.submissionAttempts || {};
    battle.submissionAttempts[socket.id] = (battle.submissionAttempts[socket.id] || 0) + 1;
    const submissionAttemptCount = battle.submissionAttempts[socket.id];

    if (!submissionCases || submissionCases.length === 0) {
      return socket.emit("code_result", {
        result: {
          passed: false,
          totalTestCases: 0,
          passedTestCases: 0,
          failedCases: [],
          executionTime: 0,
          output: "Submission blocked: no hidden/edge/sample test cases are configured for this problem."
        }
      });
    }

    console.log(`Code received from ${socket.username}. Executing hidden + edge + sample suites...`);
    const result = executeCode(code, submissionCases, { revealHiddenDetails: false });
    socket.emit("code_result", { result });

    socket.emit("submission_result", {
      passed: result.passed,
      totalTestCases: result.totalTestCases,
      passedTestCases: result.passedTestCases,
      failedCases: result.failedCases,
      executionTime: result.executionTime,
      submissions: submissionAttemptCount
    });

    if (battle.completed) {
      return;
    }

    if (result.passed) {
      battle.passRecords = battle.passRecords || {};
      if (!battle.passRecords[socket.id]) {
        battle.passRecords[socket.id] = {
          socketId: socket.id,
          dbUserId: socket.dbUserId,
          username: socket.username,
          passedAt: Date.now(),
          executionTime: Number(result.executionTime) || Number.MAX_SAFE_INTEGER,
          submissions: submissionAttemptCount
        };
      }

      const selfRecord = battle.passRecords[socket.id];
      const opponentSocketId = socket.id === battle.p1 ? battle.p2 : battle.p1;
      const opponentRecord = battle.passRecords[opponentSocketId];

      if (!opponentRecord) {
        await finalizeBattle(roomId, battle, selfRecord, "Correct solution submitted first");
        return;
      }

      const winnerRecord = comparePassRecords(selfRecord, opponentRecord) <= 0 ? selfRecord : opponentRecord;
      const tieBreakerReason = winnerRecord.passedAt !== (winnerRecord === selfRecord ? opponentRecord.passedAt : selfRecord.passedAt)
        ? "Correct solution submitted first"
        : winnerRecord.executionTime !== (winnerRecord === selfRecord ? opponentRecord.executionTime : selfRecord.executionTime)
          ? "Both passed; faster execution time wins"
          : "Both passed; fewer submissions wins";

      await finalizeBattle(roomId, battle, winnerRecord, tieBreakerReason);
    }
  });

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.id}`);

    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }

    // Notify opponent if in active battle & award them the win
    for (const [roomId, battle] of Object.entries(activeBattles)) {
      if (battle.p1 === socket.id || battle.p2 === socket.id) {
        const disconnectedIsP1 = battle.p1 === socket.id;
        const winnerId = disconnectedIsP1 ? battle.p2DbId : battle.p1DbId;
        const loserId  = disconnectedIsP1 ? battle.p1DbId : battle.p2DbId;
        const winnerUsername = disconnectedIsP1 ? battle.p2Username : battle.p1Username;

        io.to(roomId).emit("opponent_disconnected", { winner: winnerUsername });

        // Mark match as completed with winner in DB
        try {
          if (battle.matchDbId) {
            await Match.findByIdAndUpdate(battle.matchDbId, {
              status: 'completed',
              winner: winnerId || undefined,
              winnerUsername: winnerUsername || undefined,
              endTime: new Date()
            });
          }

          // Update Elo ratings — winner gets the W
          if (winnerId && loserId) {
            await updateRatings(winnerId, loserId);
            console.log(`Disconnect win: ${winnerUsername} awarded victory`);
          } else if (winnerId) {
            // At least bump the remaining player's stats
            await User.findByIdAndUpdate(winnerId, {
              $inc: { matchesPlayed: 1, matchesWon: 1 }
            });
          }
        } catch (err) {
          console.error("Disconnect match update error:", err.message);
        }

        delete activeBattles[roomId];
        break;
      }
    }
  });
});

// ─── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

