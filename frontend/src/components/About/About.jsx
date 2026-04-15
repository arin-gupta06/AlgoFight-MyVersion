import React from 'react';
import './About.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faBrain,
  faChartBar,
  faClock,
  faCode,
  faRocket,
  faShieldHalved,
  faStar,
  faTrophy,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

const missionPillars = [
  {
    title: 'Competitive Excellence',
    copy: 'Battle-tested challenges that push algorithmic thinking under real pressure.',
    icon: faTrophy,
  },
  {
    title: 'Live Coding Arena',
    copy: 'Real-time matches with instant scoring and transparent rank progression.',
    icon: faBolt,
  },
  {
    title: 'Skill Acceleration',
    copy: 'Targeted practice that turns weak spots into consistent strengths.',
    icon: faBrain,
  },
  {
    title: 'Builder Community',
    copy: 'Learn from peers, share approaches, and grow with coders at every level.',
    icon: faUsers,
  },
];

const learningTracks = [
  {
    title: 'Foundations Track',
    summary: 'Arrays, strings, hashing, and two-pointer patterns.',
    level: 'Beginner',
    pace: '2 weeks',
    icon: faCode,
  },
  {
    title: 'Battle Track',
    summary: 'Greedy, binary search, stacks, and timing strategies.',
    level: 'Intermediate',
    pace: '3 weeks',
    icon: faClock,
  },
  {
    title: 'Championship Track',
    summary: 'Graphs, DP, and contest-level optimization workflows.',
    level: 'Advanced',
    pace: '4 weeks',
    icon: faChartBar,
  },
];

const platformStats = [
  { value: '50K+', label: 'Active Coders' },
  { value: '2M+', label: 'Problems Solved' },
  { value: '500K+', label: 'Battles Fought' },
  { value: '120+', label: 'Countries' },
];

function About() {
  return (
    <div className="learn-page">
      <section className="learn-hero">
        <div className="learn-pre-heading">LEARN THE SYSTEM</div>
        <h1>
          About <span>AlgoFight</span>
        </h1>
        <p>
          AlgoFight is where developers practice with intent, compete with focus, and grow through measurable
          feedback loops.
        </p>

        <div className="learn-hero-stats">
          {platformStats.map((stat) => (
            <article key={stat.label} className="hero-stat-card">
              <div className="hero-stat-value">{stat.value}</div>
              <div className="hero-stat-label">{stat.label}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="learn-mission-panel">
        <div className="learn-panel-header">
          <h2>Our Mission</h2>
          <p>
            Make competitive programming accessible, exciting, and outcome-driven by combining high-quality
            practice with real-time competition.
          </p>
        </div>

        <div className="mission-grid">
          {missionPillars.map((pillar) => (
            <article key={pillar.title} className="mission-card">
              <div className="mission-icon">
                <FontAwesomeIcon icon={pillar.icon} />
              </div>
              <h3>{pillar.title}</h3>
              <p>{pillar.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="learn-flow-section">
        <article className="learn-flow-card">
          <div className="learn-flow-title-row">
            <h2>Learning Tracks</h2>
            <span className="chip">Structured</span>
          </div>

          <ul className="track-list">
            {learningTracks.map((track) => (
              <li key={track.title}>
                <div className="track-left">
                  <div className="track-icon">
                    <FontAwesomeIcon icon={track.icon} />
                  </div>
                  <div>
                    <h4>{track.title}</h4>
                    <p>{track.summary}</p>
                  </div>
                </div>

                <div className="track-meta">
                  <span>{track.level}</span>
                  <span>{track.pace}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="learn-flow-card">
          <div className="learn-flow-title-row">
            <h2>Why It Works</h2>
            <span className="chip">Proven</span>
          </div>

          <ul className="why-list">
            <li>
              <FontAwesomeIcon icon={faShieldHalved} />
              <span>Fair, anti-cheat-first battle environment</span>
            </li>
            <li>
              <FontAwesomeIcon icon={faRocket} />
              <span>Fast feedback loop from practice to contest</span>
            </li>
            <li>
              <FontAwesomeIcon icon={faStar} />
              <span>Clear progression milestones with visible rewards</span>
            </li>
          </ul>
        </article>
      </section>

    </div>
  );
}

export default About;