import React from 'react';
import './Legal.css';

export default function Terms() {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="legal-pre">LEGAL</div>
        <h1>Terms of Service</h1>
        <p>
          These terms govern your use of AlgoFight, including practice mode, live battles, rankings,
          and reward features. By continuing to use the platform, you agree to the policies below.
        </p>
        <div className="legal-meta">Last updated: April 16, 2026</div>
      </section>

      <div className="legal-stack">
        <section className="legal-panel">
          <h2>Account and Access</h2>
          <p>
            You are responsible for maintaining the security of your account and for all activity
            performed through your login. Use of shared, fake, or misleading identities is prohibited.
          </p>
        </section>

        <section className="legal-panel">
          <h2>Fair Play Rules</h2>
          <ul>
            <li>No cheating, plagiarism, or use of unauthorized automation in contests.</li>
            <li>No abuse of judge systems, APIs, matchmaking, or leaderboard mechanics.</li>
            <li>Repeated violations may result in score rollback or account suspension.</li>
          </ul>
        </section>

        <section className="legal-panel">
          <h2>Content and Submissions</h2>
          <p>
            You retain ownership of your code. By submitting solutions, you grant AlgoFight permission
            to process, evaluate, and store submissions to operate scoring, progress tracking, and anti-cheat systems.
          </p>
        </section>

        <section className="legal-panel">
          <h2>Service Availability</h2>
          <p>
            We aim for high availability, but features may change, pause, or be updated without prior notice.
            We are not liable for downtime, ranking shifts caused by legitimate recalculations, or reward catalog changes.
          </p>
        </section>
      </div>
    </div>
  );
}
