import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import api from '../utils/api';
import { isLive, getMatchScore } from '../components/matchUtils';
import Loading from '../components/Loading';
import '../css/Livescore.css';

const formatKickoff = (utc) => {
  if (!utc) return '';
  return new Date(utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Livescore = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ live: [], finished: [], scheduled: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('live');
  const [search, setSearch] = useState('');

  const fetchScores = useCallback(async () => {
    try {
      const res = await api.get('/api/livescore');
      setData(res.data || { live: [], finished: [], scheduled: [] });
      setError('');
    } catch (err) {
      setError('Could not load live scores. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, 45000);
    return () => clearInterval(interval);
  }, [fetchScores]);

  const matches = () => {
    let list = [];
    if (tab === 'live') list = data.live || [];
    else if (tab === 'finished') list = data.finished || [];
    else list = data.scheduled || [];

    if (!search.trim()) return list;
    const term = search.trim().toLowerCase();
    return list.filter((m) =>
      (m.homeTeam || '').toLowerCase().includes(term) ||
      (m.awayTeam || '').toLowerCase().includes(term) ||
      (m.competition || '').toLowerCase().includes(term)
    );
  };

  const current = matches();

  return (
    <div className="livescore-container">
      <div className="livescore-header">
        <h1 className="livescore-title">
          {tab === 'live' && <span className="livescore-live-dot" />}
          Live Scores
        </h1>
        <p className="livescore-subtitle">
          Live matches, today&apos;s results and upcoming kickoffs — updated automatically.
        </p>
      </div>

      <div className="livescore-controls">
        <button className={`livescore-tab ${tab === 'live' ? 'active' : ''}`} onClick={() => setTab('live')}>
          Live
        </button>
        <button className={`livescore-tab ${tab === 'finished' ? 'active' : ''}`} onClick={() => setTab('finished')}>
          Finished
        </button>
        <button className={`livescore-tab ${tab === 'scheduled' ? 'active' : ''}`} onClick={() => setTab('scheduled')}>
          Upcoming
        </button>
        <input
          className="livescore-search"
          placeholder="Search teams or league…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="livescore-error">{error}</div>}

      {!error && (
        <div className="livescore-list">
          {loading ? (
            <Loading label="Loading live scores…" />
          ) : current.length === 0 ? (
            <div className="livescore-empty">No matches to show for this section.</div>
          ) : (
            current.map((m) => {
              const live = isLive(m.status);
              const score = getMatchScore(m);
              const link = live ? `/match/${m.id}` : `/match/${m.id}/history`;

              return (
                <button key={m.id} className="ls-card" onClick={() => navigate(link)}>
                  <span className="ls-league">{m.competition || 'Friendly'}</span>
                  <span className="ls-teams">
                    <span className="ls-team ls-home">{m.homeTeam}</span>
                    <span className="ls-center">
                      {live ? (
                        <span className="ls-score ls-live">
                          {score ? `${score.home} - ${score.away}` : 'vs'}
                          <small>{m.minute ? `${m.minute}'` : 'LIVE'}</small>
                        </span>
                      ) : score ? (
                        <span className="ls-score">{score.home} - {score.away}</span>
                      ) : (
                        <span className="ls-time"><Clock size={12} /> {formatKickoff(m.utcDate)}</span>
                      )}
                    </span>
                    <span className="ls-team ls-away">{m.awayTeam}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {data.lastUpdated && (
        <div className="livescore-updated">Last updated {new Date(data.lastUpdated).toLocaleTimeString()}</div>
      )}
    </div>
  );
};

export default Livescore;