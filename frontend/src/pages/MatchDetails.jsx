import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react';
import api from '../utils/api';
import { isLive } from '../components/matchUtils';
import Loading from '../components/Loading';
import '../css/MatchCenter.css';

const formatDate = (utc) => (utc ? new Date(utc).toLocaleString([], {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
}) : '');

const cardLabel = (card) => (String(card || '').toUpperCase().includes('RED') ? '🟥' : '🟨');

const buildTimeline = (match) => {
  const events = [];
  (match?.goals || []).forEach((g) => events.push({
    minute: g.minute ?? null,
    type: 'goal',
    icon: '⚽',
    label: `${g.scorer?.name || 'Unknown'}${g.assist?.name ? ` (assist: ${g.assist.name})` : ''}`,
    team: g.team?.name || ''
  }));
  (match?.bookings || []).forEach((b) => events.push({
    minute: b.minute ?? null,
    type: 'card',
    icon: cardLabel(b.card),
    label: b.player?.name || 'Player',
    team: b.team?.name || ''
  }));
  (match?.substitutions || []).forEach((s) => events.push({
    minute: s.minute ?? null,
    type: 'sub',
    icon: '↺',
    label: `${s.playerIn?.name || 'In'} ← ${s.playerOut?.name || 'Out'}`,
    team: s.team?.name || ''
  }));
  return events.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
};

const isRedCard = (card) => String(card || '').toUpperCase().includes('RED');

const countByTeam = (events, teamId) => (events || []).filter((e) => e.team?.id === teamId).length;

const computeTeamStats = (match) => {
  const homeId = match.homeTeam?.id;
  const awayId = match.awayTeam?.id;
  const fullTime = match.score?.fullTime;
  const bookings = match.bookings || [];
  const subs = match.substitutions || [];
  const yellows = bookings.filter((b) => !isRedCard(b.card));
  const reds = bookings.filter((b) => isRedCard(b.card));

  return [
    { label: 'Goals', home: fullTime?.home ?? null, away: fullTime?.away ?? null },
    { label: 'Yellow cards', home: countByTeam(yellows, homeId), away: countByTeam(yellows, awayId) },
    { label: 'Red cards', home: countByTeam(reds, homeId), away: countByTeam(reds, awayId) },
    { label: 'Substitutions', home: countByTeam(subs, homeId), away: countByTeam(subs, awayId) }
  ];
};

const LineupPanel = ({ team, side }) => {
  const lineup = team?.lineup || [];
  const bench = team?.bench || [];
  return (
    <div className="mc-panel">
      <div className="mc-panel-title">
        {team?.crest && <img className="mc-crest" style={{ width: 22, height: 22, margin: 0 }} src={team.crest} alt="" />}
        {team?.name || side} — {team?.formation || 'Formation'}
      </div>
      {(lineup.length === 0 && bench.length === 0) && (
        <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Lineup not available yet.</div>
      )}
      {lineup.map((p) => (
        <div className="mc-lineup-row" key={p.id}>
          <span className="mc-lineup-num">{p.shirtNumber ?? ''}</span>
          <span className="mc-lineup-name">{p.name}</span>
          <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{p.position || ''}</span>
        </div>
      ))}
      {bench.length > 0 && (
        <div style={{ marginTop: '0.8rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Substitutes</div>
          {bench.map((p) => (
            <div className="mc-lineup-row" key={p.id}>
              <span className="mc-lineup-num">{p.shirtNumber ?? ''}</span>
              <span className="mc-lineup-name">{p.name}</span>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{p.position || ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatch = useCallback(async () => {
    try {
      const res = await api.get(`/api/matches/${id}`);
      setMatch(res.data);
      setError('');
    } catch (err) {
      setError('Match not found or data temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
    const interval = setInterval(fetchMatch, 30000);
    return () => clearInterval(interval);
  }, [fetchMatch]);

  if (loading) return <div className="mc-container"><Loading label="Loading live match…" /></div>;
  if (error || !match) return <div className="mc-container"><div className="mc-error">{error || 'Match not found'}</div></div>;

  const live = isLive(match.status);
  const fullTime = match.score?.fullTime;
  const halfTime = match.score?.halfTime;
  const timeline = buildTimeline(match);
  const hasLineups = (match.homeTeam?.lineup?.length || match.awayTeam?.lineup?.length) > 0;
  const stats = computeTeamStats(match);
  return (
    <div className="mc-container">
      <button className="mc-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mc-scoreboard">
        <div className="mc-league">
          {match.competition?.name || 'Match'} · {match.venue || ''}
        </div>
        <div className="mc-score-row">
          <div className="mc-team">
            {match.homeTeam?.crest && <img className="mc-crest" src={match.homeTeam.crest} alt="" />}
            <div className="mc-team-name">{match.homeTeam?.name || 'Home'}</div>
          </div>
          <div>
            <div className={`mc-score ${live ? 'live' : ''}`}>
              {fullTime && fullTime.home != null ? `${fullTime.home} - ${fullTime.away}` : 'vs'}
            </div>
            <div className={`mc-status ${live ? 'live' : 'final'}`}>
              {live ? `LIVE ${match.minute ? `${match.minute}'` : ''}` : (match.status || '')}
            </div>
            {halfTime && halfTime.home != null && (
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                HT: {halfTime.home} - {halfTime.away}
              </div>
            )}
          </div>
          <div className="mc-team">
            {match.awayTeam?.crest && <img className="mc-crest" src={match.awayTeam.crest} alt="" />}
            <div className="mc-team-name">{match.awayTeam?.name || 'Away'}</div>
          </div>
        </div>
        <div className="mc-meta">
          <span className="mc-meta-item"><Calendar size={14} /> {formatDate(match.utcDate)}</span>
          {match.venue && <span className="mc-meta-item"><MapPin size={14} /> {match.venue}</span>}
          {match.referees?.length > 0 && (
            <span className="mc-meta-item">
              <Clock size={14} /> Ref: {match.referees.find((r) => r.type === 'REFEREE')?.name || match.referees[0].name}
            </span>
          )}
        </div>
      </div>

      <div className="mc-section">
        <h2 className="mc-section-title">Match statistics</h2>
        <div className="mc-panel">
          {stats.map((stat, index) => (
            <div className="mc-stats-row" key={index}>
              <span className="mc-stat-home">{stat.home ?? '—'}</span>
              <span className="mc-stat-label">{stat.label}</span>
              <span className="mc-stat-away">{stat.away ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {hasLineups && (
        <div className="mc-section">
          <h2 className="mc-section-title">Line-ups</h2>
          <div className="mc-grid">
            <LineupPanel team={match.homeTeam} side="Home" />
            <LineupPanel team={match.awayTeam} side="Away" />
          </div>
        </div>
      )}

      {timeline.length > 0 && (
        <div className="mc-section">
          <h2 className="mc-section-title">Match events</h2>
          <div className="mc-panel">
            {timeline.map((event, index) => (
              <div className="mc-event" key={index}>
                <span className="mc-event-min">{event.minute ?? '—'}&apos;</span>
                <span className="mc-event-icon">{event.icon}</span>
                <span>{event.label}</span>
                <span className="mc-event-team">{event.team}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchDetails;
