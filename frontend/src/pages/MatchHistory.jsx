import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import api from '../utils/api';
import { isLive } from '../components/matchUtils';
import '../css/MatchCenter.css';

const formatDate = (utc) => (utc ? new Date(utc).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const resultBadge = (gf, ga) => {
  if (gf == null || ga == null) return { label: '—', cls: 'draw' };
  if (gf > ga) return { label: 'W', cls: 'win' };
  if (gf < ga) return { label: 'L', cls: 'loss' };
  return { label: 'D', cls: 'draw' };
};

const FormList = ({ matches, teamId }) => {
  if (!matches || matches.length === 0) {
    return <div className="mc-form-match">No recent results available.</div>;
  }

  return (
    <div className="mc-form-list">
      {matches.map((m, i) => {
        const ft = m.score?.fullTime;
        const isHome = m.homeTeam?.id === teamId;
        const gf = ft ? (isHome ? ft.home : ft.away) : null;
        const ga = ft ? (isHome ? ft.away : ft.home) : null;
        const badge = resultBadge(gf, ga);
        return (
          <div className="mc-form-match" key={i}>
            <span className="mc-form-home">
              {isHome ? <strong>{m.homeTeam?.name}</strong> : m.homeTeam?.name}
            </span>
            <span className="mc-form-score">
              {ft && ft.home != null ? `${ft.home} - ${ft.away}` : 'vs'}
              <span className={`mc-badge ${badge.cls}`} style={{ marginLeft: '0.4rem' }}>{badge.label}</span>
            </span>
            <span>{isHome ? m.awayTeam?.name : <strong>{m.awayTeam?.name}</strong>}</span>
          </div>
        );
      })}
    </div>
  );
};

const MatchHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get(`/api/matches/${id}/history`);
      setData(res.data);
      setError('');
    } catch (err) {
      setError('History data unavailable for this match.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) return <div className="mc-container"><div className="mc-loading">Loading match data…</div></div>;
  if (error || !data) return <div className="mc-container"><div className="mc-error">{error || 'Match not found'}</div></div>;

  const { match, head2head, homeRecent, awayRecent, standings, scorers } = data;
  const live = isLive(match?.status);
  const homeId = match?.homeTeam?.id;
  const awayId = match?.awayTeam?.id;
  const agg = head2head?.aggregates || {};
  const h2hMatches = head2head?.matches || [];
  const table = (standings && standings[0]?.table) || [];
  return (
    <div className="mc-container">
      <button className="mc-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mc-scoreboard">
        <div className="mc-league">{match?.competition?.name || 'Match'}</div>
        <div className="mc-score-row">
          <div className="mc-team">
            {match?.homeTeam?.crest && <img className="mc-crest" src={match.homeTeam.crest} alt="" />}
            <div className="mc-team-name">{match?.homeTeam?.name || 'Home'}</div>
          </div>
          <div>
            <div className="mc-score">
              {match?.score?.fullTime && match.score.fullTime.home != null
                ? `${match.score.fullTime.home} - ${match.score.fullTime.away}`
                : 'vs'}
            </div>
            <div className={`mc-status ${live ? 'live' : 'final'}`}>{match?.status || 'SCHEDULED'}</div>
          </div>
          <div className="mc-team">
            {match?.awayTeam?.crest && <img className="mc-crest" src={match.awayTeam.crest} alt="" />}
            <div className="mc-team-name">{match?.awayTeam?.name || 'Away'}</div>
          </div>
        </div>
        <div className="mc-meta">
          <span className="mc-meta-item"><Calendar size={14} /> {formatDate(match?.utcDate)}</span>
        </div>
      </div>

      <div className="mc-section">
        <h2 className="mc-section-title">Recent form</h2>
        <div className="mc-grid">
          <div className="mc-panel">
            <div className="mc-panel-title">{match?.homeTeam?.name || 'Home'} — last 5</div>
            <FormList matches={homeRecent} teamId={homeId} />
          </div>
          <div className="mc-panel">
            <div className="mc-panel-title">{match?.awayTeam?.name || 'Away'} — last 5</div>
            <FormList matches={awayRecent} teamId={awayId} />
          </div>
        </div>
      </div>

      <div className="mc-section">
        <h2 className="mc-section-title">Head-to-head</h2>
        <div className="mc-panel">
          {agg?.homeTeam && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
              <span>{match?.homeTeam?.name}: {agg.homeTeam.wins}W {agg.homeTeam.draws}D {agg.homeTeam.losses}L</span>
              <span style={{ color: 'var(--gray-500)' }}>{agg.numberOfMatches} meetings</span>
            </div>
          )}
          {h2hMatches.length === 0 ? (
            <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>No previous meetings available.</div>
          ) : (
            h2hMatches.slice(0, 10).map((m, i) => (
              <div className="mc-form-match" key={i}>
                <span className="mc-form-home">{m.homeTeam?.name}</span>
                <span className="mc-form-score">
                  {m.score?.fullTime && m.score.fullTime.home != null
                    ? `${m.score.fullTime.home} - ${m.score.fullTime.away}`
                    : 'vs'}
                </span>
                <span>{m.awayTeam?.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mc-section">
        <h2 className="mc-section-title">League & top scorers</h2>
        <div className="mc-grid">
          <div className="mc-panel">
            <div className="mc-panel-title">Standings</div>
            {table.length === 0 ? (
              <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Standings not available.</div>
            ) : (
              <table className="mc-table">
                <thead>
                  <tr><th>#</th><th>Team</th><th>P</th><th>Pts</th></tr>
                </thead>
                <tbody>
                  {table.slice(0, 12).map((row) => (
                    <tr key={row.team?.id}>
                      <td>{row.position}</td>
                      <td>{row.team?.name}</td>
                      <td>{row.playedGames}</td>
                      <td>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mc-panel">
            <div className="mc-panel-title">Top scorers</div>
            {(scorers || []).length === 0 ? (
              <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Scorers not available.</div>
            ) : (
              scorers.slice(0, 10).map((s, i) => (
                <div className="mc-lineup-row" key={i}>
                  <span>{s.player?.name}</span>
                  <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{s.team?.name}</span>
                  <span className="mc-lineup-num">{s.goals}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchHistory;
