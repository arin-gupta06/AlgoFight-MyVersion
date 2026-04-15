import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';

import('@dimforge/rapier3d-compat'); 

import Squares from './components/Squares/Squares.jsx';
import NavBar from './components/NavBar/NavBar.jsx';
import Home from './components/Home/Home.jsx';
import Login from './components/Login/Login.jsx';
import Rewards from './components/Rewards/Rewards.jsx';
import Signup from './components/Signup/Signup.jsx';
import Profile from './components/Profile/Profile.jsx';
import LiveBattle from './components/Battle/LiveBattle.jsx';
import Leaderboard from './components/Leaderboard/Leaderboard.jsx';
import About from './components/About/About.jsx';
import BattleArena from './components/Battle/BattleArena.jsx';
import Practice from './components/Practice/Practice.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// 📌 Auth layout (no NavBar or Squares)
function AuthLayout() {
  return <Outlet />;
}

// 📌 Main layout (with NavBar)
function MainLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <Routes>

      {/* ================= Auth Routes ================= */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* ================= Main App Routes ================= */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* ✅ Battle Routes (Flat, not nested) */}
        <Route path="/battle" element={<ProtectedRoute><BattleArena /></ProtectedRoute>} />
        <Route path="/battle/live" element={<ProtectedRoute><LiveBattle /></ProtectedRoute>} />
        <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />

        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
      </Route>

    </Routes>
  );
}

export default App;
