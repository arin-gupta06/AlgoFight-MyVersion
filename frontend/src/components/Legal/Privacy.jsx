import React from 'react';
import './Legal.css';

export default function Privacy() {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="legal-pre">LEGAL</div>
        <h1>Privacy Policy</h1>
        <p>
          This policy explains how AlgoFight collects, uses, and protects your information while you use
          coding battles, practice tracking, profile analytics, and rewards features.
        </p>
        <div className="legal-meta">Last updated: April 16, 2026</div>
      </section>

      <div className="legal-stack">
        <section className="legal-panel">
          <h2>What We Collect</h2>
          <ul>
            <li>Account details such as email, display name, and profile image.</li>
            <li>Gameplay data including rating, match outcomes, and submission metadata.</li>
            <li>Practice progress data such as solved counts and submission attempts.</li>
          </ul>
        </section>

        <section className="legal-panel">
          <h2>How We Use Data</h2>
          <p>
            We use your data to authenticate access, power leaderboards, calculate ranks, detect abuse,
            and present transparent metrics across Profile, Rewards, and Battle views.
          </p>
        </section>

        <section className="legal-panel">
          <h2>Data Sharing</h2>
          <p>
            We do not sell personal data. Data may be processed by trusted infrastructure providers for
            hosting, security, and analytics necessary to run the platform.
          </p>
        </section>

        <section className="legal-panel">
          <h2>Your Controls</h2>
          <ul>
            <li>You may request correction of inaccurate profile information.</li>
            <li>You may request account deletion subject to legal and anti-fraud retention needs.</li>
            <li>You can contact support for privacy-related requests.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
