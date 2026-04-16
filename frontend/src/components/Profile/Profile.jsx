import React, { useEffect, useMemo, useState } from 'react';
import './Profile.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBolt,
    faChartLine,
    faCheckCircle,
    faCode,
    faCoins,
    faMedal,
    faShieldHalved,
    faStar,
    faTrophy,
    faUser,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserProfile } from '../../services/api';
import { calculateArenaPointBreakdown, normalizeUserStats } from '../../utils/playerMetrics';

function Profile() {
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
            } catch (error) {
                if (!active) return;
                setProfileError('Could not sync profile data. Showing local defaults.');
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

    const displayName = profile?.displayName || user?.displayName || user?.email || 'Player';
    const email = profile?.email || user?.email || '';
    const photoURL = profile?.photoURL || user?.photoURL || '';

    const {
        rating,
        matchesPlayed,
        matchesWon,
        practiceSolved,
        practiceSubmissions,
        winRate,
        practiceAccuracy,
        lossCount,
        rank,
    } = normalizeUserStats(profile || {});

    const pointBreakdown = calculateArenaPointBreakdown({
        rating,
        matchesPlayed,
        matchesWon,
        practiceSolved,
        practiceSubmissions,
    });
    const arenaPoints = pointBreakdown.total;

    const ratingProgress = Math.min(100, Math.round((rating / 2400) * 100));
    const activityProgress = Math.min(100, Math.round(((matchesPlayed + practiceSolved) / 120) * 100));
    const practiceProgress = Math.min(100, Math.round((practiceSolved / 100) * 100));
    const consistencyProgress = Math.min(100, Math.round((winRate / 100) * 100));

    const profileStats = useMemo(
        () => [
            {
                label: 'Current Rating',
                value: rating,
                hint: `${rank} tier`,
                icon: faTrophy,
                tone: 'gold',
            },
            {
                label: 'Arena Points',
                value: arenaPoints,
                hint: 'Rating + wins + practice + participation',
                icon: faCoins,
                tone: 'cyan',
            },
            {
                label: 'Battles Played',
                value: matchesPlayed,
                hint: `${matchesWon} wins / ${lossCount} losses`,
                icon: faCode,
                tone: 'cyan',
            },
            {
                label: 'Practice Solved',
                value: practiceSolved,
                hint: `${practiceSubmissions} submissions • ${practiceAccuracy}% efficiency`,
                icon: faCheckCircle,
                tone: 'green',
            },
            {
                label: 'Win Rate',
                value: `${winRate}%`,
                hint: 'Across all matches',
                icon: faBolt,
                tone: 'green',
            },
        ],
        [rating, rank, arenaPoints, matchesPlayed, matchesWon, lossCount, winRate, practiceSolved, practiceSubmissions, practiceAccuracy]
    );

    const achievements = useMemo(
        () => [
            {
                title: 'Arena Starter',
                description: 'Play your first 10 battles.',
                unlocked: matchesPlayed >= 10,
                icon: faShieldHalved,
            },
            {
                title: 'Rapid Climber',
                description: 'Reach a 60% win rate.',
                unlocked: winRate >= 60,
                icon: faChartLine,
            },
            {
                title: 'Elite Coder',
                description: 'Cross 1500 rating.',
                unlocked: rating >= 1500,
                icon: faStar,
            },
            {
                title: 'Problem Grinder',
                description: 'Solve 25 practice problems.',
                unlocked: practiceSolved >= 25,
                icon: faCode,
            },
        ],
        [matchesPlayed, winRate, rating, practiceSolved]
    );

    if (authLoading || isLoadingProfile) {
        return (
            <div className="profile-page">
                <div className="profile-loading">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <section className="profile-overview-shell">
                <section className="profile-hero-card">
                    <div className="profile-identity-row">
                        <div className="profile-avatar-shell">
                            {photoURL ? (
                                <img src={photoURL} alt="Profile avatar" className="profile-avatar-image" />
                            ) : (
                                <FontAwesomeIcon icon={faUser} />
                            )}
                        </div>

                        <div className="profile-identity-copy">
                            <div className="profile-pre-heading">PLAYER PROFILE</div>
                            <h1>{displayName}</h1>
                            <p>{email || 'Signed-in competitor'}</p>
                        </div>

                        <div className="profile-rank-chip">{rank}</div>
                    </div>

                    {profileError ? <div className="profile-warning">{profileError}</div> : null}
                </section>

                <section className="profile-stat-grid">
                    {profileStats.map((stat) => (
                        <article key={stat.label} className="profile-stat-card">
                            <div className={`profile-stat-icon tone-${stat.tone}`}>
                                <FontAwesomeIcon icon={stat.icon} />
                            </div>
                            <div className="profile-stat-content">
                                <p>{stat.label}</p>
                                <h3>{stat.value}</h3>
                                <span>{stat.hint}</span>
                            </div>
                        </article>
                    ))}
                </section>
            </section>

            <section className="profile-content-grid">
                <article className="profile-panel">
                    <div className="profile-panel-head">
                        <h2>Progress Overview</h2>
                        <span className="profile-chip">Live</span>
                    </div>

                    <div className="profile-progress-list">
                        <div className="profile-progress-item">
                            <div className="profile-progress-head">
                                <span>Rating Progress</span>
                                <strong>{rating} / 2400</strong>
                            </div>
                            <div className="profile-progress-track">
                                <div className="profile-progress-fill tone-cyan" style={{ width: `${ratingProgress}%` }} />
                            </div>
                        </div>

                        <div className="profile-progress-item">
                            <div className="profile-progress-head">
                                <span>Activity Level</span>
                                <strong>{matchesPlayed + practiceSolved} total actions</strong>
                            </div>
                            <div className="profile-progress-track">
                                <div className="profile-progress-fill tone-pink" style={{ width: `${activityProgress}%` }} />
                            </div>
                        </div>

                        <div className="profile-progress-item">
                            <div className="profile-progress-head">
                                <span>Practice Mastery</span>
                                <strong>{practiceSolved} solved</strong>
                            </div>
                            <div className="profile-progress-track">
                                <div className="profile-progress-fill tone-violet" style={{ width: `${practiceProgress}%` }} />
                            </div>
                        </div>

                        <div className="profile-progress-item">
                            <div className="profile-progress-head">
                                <span>Consistency</span>
                                <strong>{winRate}% win rate</strong>
                            </div>
                            <div className="profile-progress-track">
                                <div className="profile-progress-fill tone-green" style={{ width: `${consistencyProgress}%` }} />
                            </div>
                        </div>
                    </div>
                </article>

                <article className="profile-panel">
                    <div className="profile-panel-head">
                        <h2>Achievements</h2>
                        <span className="profile-chip">Milestones</span>
                    </div>

                    <ul className="profile-achievement-list">
                        {achievements.map((achievement) => (
                            <li key={achievement.title} className={achievement.unlocked ? 'is-unlocked' : ''}>
                                <div className="achievement-left">
                                    <div className="achievement-icon">
                                        <FontAwesomeIcon icon={achievement.icon} />
                                    </div>
                                    <div>
                                        <h4>{achievement.title}</h4>
                                        <p>{achievement.description}</p>
                                    </div>
                                </div>

                                <span className="achievement-status">
                                    <FontAwesomeIcon icon={achievement.unlocked ? faCheckCircle : faMedal} />
                                    {achievement.unlocked ? 'Unlocked' : 'Locked'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </article>
            </section>
        </div>
    );
}

export default Profile;