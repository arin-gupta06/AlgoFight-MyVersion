import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBolt,
    faBriefcase,
    faCheckCircle,
    faCircleInfo,
    faCode,
    faGift,
    faLaptopCode,
    faMedal,
    faRotate,
    faRocket,
    faTicket,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserProfile } from '../../services/api';
import {
    calculateArenaPointBreakdown,
    getRankProgressByRating,
    normalizeUserStats,
    RANK_TIERS,
} from '../../utils/playerMetrics';
import './Rewards.css';

const rewardCatalog = [
    {
        title: 'Amazon Gift Cards',
        description: 'Redeem credits from $10 to $500 and use them for books, gear, or software.',
        category: 'Marketplace',
        cost: 1000,
        icon: faGift,
        tone: 'pink',
    },
    {
        title: 'Hackathon Entry Pass',
        description: 'Get sponsored entries to paid hackathons and coding competitions.',
        category: 'Competition',
        cost: 1500,
        icon: faTicket,
        tone: 'cyan',
    },
    {
        title: 'Premium Coding Tools',
        description: 'Unlock access to advanced IDE features and curated productivity toolkits.',
        category: 'Productivity',
        cost: 2500,
        icon: faLaptopCode,
        tone: 'blue',
    },
    {
        title: 'Tech Internship Track',
        description: 'Priority shortlisting for internship opportunities with partner companies.',
        category: 'Career',
        cost: 5000,
        icon: faBriefcase,
        tone: 'orange',
    },
    {
        title: 'Course Subscription Vault',
        description: 'Unlock premium courses in DSA, system design, and interview prep.',
        category: 'Learning',
        cost: 3000,
        comingSoon: true,
        icon: faCode,
        tone: 'violet',
    },
    {
        title: 'Hardware Rewards Drop',
        description: 'Mechanical keyboards, monitors, and streaming gear for top performers.',
        category: 'Hardware',
        cost: 7500,
        comingSoon: true,
        icon: faRocket,
        tone: 'teal',
    },
];

const recentRedeems = [];

const numberFormatter = new Intl.NumberFormat('en-US');

function getRewardStatusLabel(status) {
    if (status === 'redeem') return 'Available';
    if (status === 'locked') return 'Locked';
    return 'Coming Soon';
}

function getRewardActionLabel(status) {
    if (status === 'redeem') return 'Redeem Now';
    if (status === 'locked') return 'Need More Points';
    return 'Coming Soon';
}

function Rewards() {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState('');

    useEffect(() => {
        let active = true;

        const loadProfile = async () => {
            if (!user?.uid) {
                setProfile(null);
                setIsLoadingProfile(false);
                return;
            }

            setIsLoadingProfile(true);
            setProfileError('');

            try {
                const data = await fetchUserProfile(user.uid);
                if (!active) return;
                setProfile(data || null);
            } catch {
                if (!active) return;
                setProfileError('Could not sync reward metrics. Showing computed defaults.');
                setProfile(null);
            } finally {
                if (active) setIsLoadingProfile(false);
            }
        };

        loadProfile();

        return () => {
            active = false;
        };
    }, [user?.uid]);

    const stats = useMemo(() => normalizeUserStats(profile || {}), [profile]);
    const pointBreakdown = useMemo(
        () =>
            calculateArenaPointBreakdown({
                rating: stats.rating,
                matchesWon: stats.matchesWon,
                matchesPlayed: stats.matchesPlayed,
                practiceSolved: stats.practiceSolved,
            }),
        [stats.rating, stats.matchesWon, stats.matchesPlayed, stats.practiceSolved]
    );

    const arenaPoints = pointBreakdown.total;
    const {
        currentTier,
        nextTier,
        currentTierIndex,
        progressToNext,
        ratingToNextTier,
    } = getRankProgressByRating(stats.rating);

    const computedRewards = useMemo(
        () =>
            rewardCatalog.map((reward) => {
                const status = reward.comingSoon
                    ? 'coming-soon'
                    : arenaPoints >= reward.cost
                        ? 'redeem'
                        : 'locked';

                return {
                    ...reward,
                    status,
                    cta: getRewardActionLabel(status),
                };
            }),
        [arenaPoints]
    );

    const pointSourceRows = useMemo(
        () => [
            { label: 'Rating contribution', value: pointBreakdown.ratingPoints, icon: faMedal },
            { label: 'Battle wins contribution', value: pointBreakdown.battleWinPoints, icon: faBolt },
            { label: 'Practice solved contribution', value: pointBreakdown.practiceSolvedPoints, icon: faCode },
            { label: 'Participation contribution', value: pointBreakdown.participationPoints, icon: faRotate },
        ],
        [pointBreakdown]
    );

    const redeemableCount = computedRewards.filter((reward) => reward.status === 'redeem').length;

    if (authLoading || isLoadingProfile) {
        return (
            <div className="rewards-page">
                <section className="rewards-main-panel">
                    <div className="panel-headline-row">
                        <h2>Loading rewards...</h2>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="rewards-page">
            <section className="rewards-hero">
                <div className="pre-heading">REWARDS AND RECOGNITION</div>
                <h1>
                    Redeem <span className="text-cyan">Skills</span> Into Real Rewards
                </h1>
                <p>
                    Rewards now read the same live profile stats used across the platform for transparent point and rank tracking.
                </p>
                {profileError ? (
                    <div className="rewards-warning">
                        <FontAwesomeIcon icon={faCircleInfo} />
                        <span>{profileError}</span>
                    </div>
                ) : null}
            </section>

            <section className="rewards-kpi-grid">
                <article className="rewards-kpi-card">
                    <div className="kpi-label">Arena Points</div>
                    <div className="kpi-value">{numberFormatter.format(arenaPoints)}</div>
                    <div className="kpi-footnote">Computed from your live profile stats</div>
                </article>

                <article className="rewards-kpi-card">
                    <div className="kpi-label">Current Rank</div>
                    <div className="kpi-value">{currentTier.label}</div>
                    <div className="kpi-footnote">
                        {ratingToNextTier > 0
                            ? `${ratingToNextTier} rating to ${nextTier.label}`
                            : 'Top rank unlocked'}
                    </div>
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
                        {computedRewards.map((reward) => (
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
                            <h2>Rank Progress</h2>
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
                            {ratingToNextTier > 0
                                ? `${ratingToNextTier} rating to reach ${nextTier.label}`
                                : 'Top rank unlocked'}
                        </p>

                        <ul className="tier-list">
                            {RANK_TIERS.map((tier, index) => {
                                const isComplete = stats.rating >= tier.minRating;
                                const isCurrent = index === currentTierIndex;

                                return (
                                    <li key={tier.label} className={isCurrent ? 'tier-current' : ''}>
                                        <div className="tier-left">
                                            <FontAwesomeIcon icon={isComplete ? faCheckCircle : faMedal} />
                                            <span>{tier.label}</span>
                                        </div>
                                        <span className="tier-points">{numberFormatter.format(tier.minRating)} rating</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <section className="rewards-side-card">
                        <h2>Points Breakdown</h2>
                        <ul className="earn-list">
                            {pointSourceRows.map((source) => (
                                <li key={source.label}>
                                    <div className="earn-left">
                                        <FontAwesomeIcon icon={source.icon} />
                                        <span>{source.label}</span>
                                    </div>
                                    <span className="earn-points">{numberFormatter.format(source.value)}</span>
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