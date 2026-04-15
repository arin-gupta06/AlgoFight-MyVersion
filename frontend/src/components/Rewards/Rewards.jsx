import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowTrendUp,
    faBolt,
    faBriefcase,
    faCheckCircle,
    faCode,
    faGift,
    faLaptopCode,
    faMedal,
    faRocket,
    faStar,
    faTicket,
} from '@fortawesome/free-solid-svg-icons';
import './Rewards.css';

const arenaPoints = 1847;

const rankTiers = [
    { label: 'Novice', minPoints: 0 },
    { label: 'Warrior', minPoints: 500 },
    { label: 'Expert', minPoints: 1000 },
    { label: 'Master', minPoints: 3000 },
    { label: 'Grandmaster', minPoints: 5000 },
];

const rewardCatalog = [
    {
        title: 'Amazon Gift Cards',
        description: 'Redeem credits from $10 to $500 and use them for books, gear, or software.',
        category: 'Marketplace',
        cost: 1000,
        status: 'redeem',
        cta: 'Redeem Now',
        icon: faGift,
        tone: 'pink',
    },
    {
        title: 'Hackathon Entry Pass',
        description: 'Get sponsored entries to paid hackathons and coding competitions.',
        category: 'Competition',
        cost: 1500,
        status: 'redeem',
        cta: 'Redeem Now',
        icon: faTicket,
        tone: 'cyan',
    },
    {
        title: 'Premium Coding Tools',
        description: 'Unlock access to advanced IDE features and curated productivity toolkits.',
        category: 'Productivity',
        cost: 2500,
        status: 'locked',
        cta: 'Need More Points',
        icon: faLaptopCode,
        tone: 'blue',
    },
    {
        title: 'Tech Internship Track',
        description: 'Priority shortlisting for internship opportunities with partner companies.',
        category: 'Career',
        cost: 5000,
        status: 'locked',
        cta: 'Need More Points',
        icon: faBriefcase,
        tone: 'orange',
    },
    {
        title: 'Course Subscription Vault',
        description: 'Unlock premium courses in DSA, system design, and interview prep.',
        category: 'Learning',
        cost: 3000,
        status: 'coming-soon',
        cta: 'Coming Soon',
        icon: faCode,
        tone: 'violet',
    },
    {
        title: 'Hardware Rewards Drop',
        description: 'Mechanical keyboards, monitors, and streaming gear for top performers.',
        category: 'Hardware',
        cost: 7500,
        status: 'coming-soon',
        cta: 'Coming Soon',
        icon: faRocket,
        tone: 'teal',
    },
];

const earnSources = [
    { label: 'Win live battle', points: '+120', icon: faBolt },
    { label: 'Complete daily challenge', points: '+75', icon: faStar },
    { label: 'Solve hard practice problem', points: '+50', icon: faCode },
    { label: '7-day activity streak', points: '+200', icon: faArrowTrendUp },
];

const recentRedeems = [
    { title: 'Hackathon Entry Pass', time: '2 days ago', points: '-1500' },
    { title: 'Amazon Gift Card ($10)', time: '8 days ago', points: '-1000' },
];

const numberFormatter = new Intl.NumberFormat('en-US');

function getRewardStatusLabel(status) {
    if (status === 'redeem') return 'Available';
    if (status === 'locked') return 'Locked';
    return 'Coming Soon';
}

function Rewards() {
    const currentTierIndex = rankTiers.reduce((bestIndex, tier, index) => {
        if (arenaPoints >= tier.minPoints) return index;
        return bestIndex;
    }, 0);

    const currentTier = rankTiers[currentTierIndex];
    const nextTier = rankTiers[currentTierIndex + 1] || rankTiers[currentTierIndex];

    const progressToNext =
        nextTier.minPoints === currentTier.minPoints
            ? 100
            : Math.min(
                    100,
                    ((arenaPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
                );

    const pointsToNextTier = Math.max(0, nextTier.minPoints - arenaPoints);
    const redeemableCount = rewardCatalog.filter((reward) => reward.status === 'redeem').length;

    return (
        <div className="rewards-page">
            <section className="rewards-hero">
                <div className="pre-heading">REWARDS AND RECOGNITION</div>
                <h1>
                    Redeem <span className="text-cyan">Skills</span> Into Real Rewards
                </h1>
                <p>
                    Earn points in battles, unlock higher ranks, and claim curated rewards designed for competitive coders.
                </p>
            </section>

            <section className="rewards-kpi-grid">
                <article className="rewards-kpi-card">
                    <div className="kpi-label">Arena Points</div>
                    <div className="kpi-value">{numberFormatter.format(arenaPoints)}</div>
                    <div className="kpi-footnote">Current spendable balance</div>
                </article>

                <article className="rewards-kpi-card">
                    <div className="kpi-label">Current Rank</div>
                    <div className="kpi-value">{currentTier.label}</div>
                    <div className="kpi-footnote">{pointsToNextTier} points to {nextTier.label}</div>
                </article>

                <article className="rewards-kpi-card">
                    <div className="kpi-label">Rewards Ready</div>
                    <div className="kpi-value">{redeemableCount}</div>
                    <div className="kpi-footnote">Items available to redeem now</div>
                </article>
            </section>

            <div className="rewards-layout">
                <section className="rewards-main-panel">
                    <div className="panel-headline-row">
                        <h2>Available Rewards</h2>
                        <span className="panel-pill">Updated Weekly</span>
                    </div>

                    <div className="rewards-grid">
                        {rewardCatalog.map((reward) => (
                            <article
                                key={reward.title}
                                className={`reward-card status-${reward.status}`}
                            >
                                <div className="reward-card-top">
                                    <div className={`reward-icon tone-${reward.tone}`}>
                                        <FontAwesomeIcon icon={reward.icon} />
                                    </div>
                                    <span className="reward-category">{reward.category}</span>
                                </div>

                                <h3>{reward.title}</h3>
                                <p>{reward.description}</p>

                                <div className="reward-meta-row">
                                    <span className="reward-cost">{numberFormatter.format(reward.cost)} points</span>
                                    <span className={`reward-status reward-status-${reward.status}`}>
                                        {getRewardStatusLabel(reward.status)}
                                    </span>
                                </div>

                                <button
                                    className={`reward-action reward-action-${reward.status}`}
                                    type="button"
                                >
                                    {reward.cta}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                <aside className="rewards-side-column">
                    <section className="rewards-side-card">
                        <div className="side-card-header">
                            <h2>Progress Path</h2>
                            <span>{Math.round(progressToNext)}%</span>
                        </div>

                        <div className="tier-rail">
                            <span>{currentTier.label}</span>
                            <span>{nextTier.label}</span>
                        </div>

                        <div className="tier-progress-track">
                            <div className="tier-progress-fill" style={{ width: `${progressToNext}%` }} />
                        </div>

                        <p className="tier-progress-copy">
                            {pointsToNextTier > 0
                                ? `${pointsToNextTier} points to reach ${nextTier.label}`
                                : 'Top rank unlocked'}
                        </p>

                        <ul className="tier-list">
                            {rankTiers.map((tier, index) => {
                                const isComplete = arenaPoints >= tier.minPoints;
                                const isCurrent = index === currentTierIndex;

                                return (
                                    <li key={tier.label} className={isCurrent ? 'tier-current' : ''}>
                                        <div className="tier-left">
                                            <FontAwesomeIcon icon={isComplete ? faCheckCircle : faMedal} />
                                            <span>{tier.label}</span>
                                        </div>
                                        <span className="tier-points">{numberFormatter.format(tier.minPoints)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <section className="rewards-side-card">
                        <h2>How To Earn Points</h2>
                        <ul className="earn-list">
                            {earnSources.map((source) => (
                                <li key={source.label}>
                                    <div className="earn-left">
                                        <FontAwesomeIcon icon={source.icon} />
                                        <span>{source.label}</span>
                                    </div>
                                    <span className="earn-points">{source.points}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="rewards-side-card">
                        <h2>Recent Redeems</h2>
                        <ul className="redeem-list">
                            {recentRedeems.length > 0 ? (
                                recentRedeems.map((redeem) => (
                                    <li key={`${redeem.title}-${redeem.time}`}>
                                        <div className="redeem-left">
                                            <span>{redeem.title}</span>
                                            <small>{redeem.time}</small>
                                        </div>
                                        <span className="redeem-cost">{redeem.points}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="redeem-empty">No recent rewards redeemed.</li>
                            )}
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    );
}

export default Rewards;