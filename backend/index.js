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

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
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
      { input: [2, 3], expected: 5 },
      { input: [-1, 5], expected: 4 },
      { input: [0, 0], expected: 0 },
      { input: [100, 200], expected: 300 }
    ],
    starterCode: "function solution(a, b) {\n  // Write code here\n}"
  },
  {
    title: "Reverse String",
    description: "Write a function `solution(str)` that reverses the string.",
    example: "solution('hello') -> 'olleh'",
    difficulty: "easy",
    testCases: [
      { input: ["hello"], expected: "olleh" },
      { input: ["racecar"], expected: "racecar" },
      { input: ["12345"], expected: "54321" },
      { input: [""], expected: "" }
    ],
    starterCode: "function solution(str) {\n  // Write code here\n}"
  },
  {
    title: "Is Palindrome",
    description: "Write a function `solution(str)` that checks if a string is a palindrome.",
    example: "solution('madam') -> true",
    difficulty: "easy",
    testCases: [
      { input: ["madam"], expected: true },
      { input: ["hello"], expected: false },
      { input: ["racecar"], expected: true },
      { input: ["123"], expected: false }
    ],
    starterCode: "function solution(str) {\n  // Write code here\n}"
  },
  {
    title: "Find Maximum",
    description: "Write a function `solution(arr)` that returns the maximum value in an array.",
    example: "solution([3, 1, 4, 1, 5]) -> 5",
    difficulty: "easy",
    testCases: [
      { input: [[3, 1, 4, 1, 5, 9]], expected: 9 },
      { input: [[-1, -5, -3]], expected: -1 },
      { input: [[42]], expected: 42 },
      { input: [[0, 0, 0]], expected: 0 }
    ],
    starterCode: "function solution(arr) {\n  // Write code here\n}"
  },
  {
    title: "Count Vowels",
    description: "Write a function `solution(str)` that returns the number of vowels (a, e, i, o, u) in a string (case-insensitive).",
    example: "solution('hello') -> 2",
    difficulty: "easy",
    testCases: [
      { input: ["hello"], expected: 2 },
      { input: ["AEIOU"], expected: 5 },
      { input: ["xyz"], expected: 0 },
      { input: ["AlgoFight"], expected: 3 }
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
  } catch (err) {
    console.error("Problem seeding error:", err.message);
  }
}

mongoose.connection.once('open', seedProblems);

// ─── Matchmaking State (in-memory, single server) ──────
let waitingPlayer = null;
const activeBattles = {}; // roomId -> battle info

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
function executeCode(userCode, testCases) {
  try {
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(userCode, sandbox, { timeout: 2000 });

    if (typeof sandbox.solution !== 'function') {
      return { passed: false, output: "Error: function 'solution' not found." };
    }

    for (let i = 0; i < testCases.length; i++) {
      const { input, expected } = testCases[i];
      const args = input.map(arg => JSON.stringify(arg)).join(",");
      const result = vm.runInContext(`solution(${args})`, sandbox, { timeout: 1000 });

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        return {
          passed: false,
          output: `Failed Test Case ${i + 1}\nInput: ${JSON.stringify(input)}\nExpected: ${JSON.stringify(expected)}\nGot: ${JSON.stringify(result)}`
        };
      }
    }

    return { passed: true, output: "All Test Cases Passed!" };
  } catch (err) {
    return { passed: false, output: `Runtime Error: ${err.message}` };
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

// ─── Socket.IO ──────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("find_match", async (userData) => {
    const { username, uid } = userData;
    console.log(`${username} (uid: ${uid}) is looking for a match...`);
    socket.username = username;
    socket.firebaseUid = uid || null;

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
    console.log(`DB user lookup: ${dbUser ? dbUser.displayName + ' (' + dbUser._id + ')' : 'NOT FOUND'}`);

    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const opponent = waitingPlayer;
      waitingPlayer = null;
      const roomId = `room_${opponent.id}_${socket.id}`;

      socket.join(roomId);
      opponent.join(roomId);

      // Pick random problem from MongoDB
      let problem;
      try {
        const count = await Problem.countDocuments();
        if (count > 0) {
          const rand = Math.floor(Math.random() * count);
          problem = await Problem.findOne().skip(rand).lean();
        }
      } catch (err) {
        console.error("Problem fetch error:", err.message);
      }

      // Fallback to seed data if DB fetch fails
      if (!problem) {
        const seed = SEED_PROBLEMS[Math.floor(Math.random() * SEED_PROBLEMS.length)];
        problem = { ...seed, _id: null };
      }

      // Create Match in DB
      let matchDoc = null;
      try {
        matchDoc = await Match.create({
          player1: opponent.dbUserId || undefined,
          player2: socket.dbUserId || undefined,
          player1Username: opponent.username,
          player2Username: username,
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
        matchDbId: matchDoc ? matchDoc._id : null
      };

      console.log(`Match found: ${opponent.username} vs ${username} in ${roomId}`);

      // Send problem to both players (without test cases for security display)
      io.to(roomId).emit("match_found", {
        roomId,
        problem: {
          title: problem.title,
          description: problem.description,
          example: problem.example,
          starterCode: problem.starterCode
        },
        players: [opponent.username, username]
      });

    } else {
      waitingPlayer = socket;
      socket.emit("waiting_for_opponent");
      console.log(`${username} added to waiting queue.`);
    }
  });

  socket.on("submit_code", async (data) => {
    const { code, roomId } = data;
    const battle = activeBattles[roomId];

    if (!battle) {
      return socket.emit("error", "Battle not found!");
    }

    console.log(`Code received from ${socket.username}. Executing...`);
    const result = executeCode(code, battle.problem.testCases);
    socket.emit("code_result", { result });

    if (result.passed) {
      io.to(roomId).emit("battle_over", { winner: socket.username });

      // Persist match result to DB
      try {
        if (battle.matchDbId) {
          await Match.findByIdAndUpdate(battle.matchDbId, {
            status: 'completed',
            winner: socket.dbUserId || undefined,
            winnerUsername: socket.username,
            endTime: new Date()
          });
        }

        // Update Elo ratings
        if (socket.dbUserId) {
          const loserId = socket.id === battle.p1 ? battle.p2DbId : battle.p1DbId;
          if (loserId) {
            await updateRatings(socket.dbUserId, loserId);
          }
        }
      } catch (err) {
        console.error("Match completion error:", err.message);
      }

      delete activeBattles[roomId];
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

