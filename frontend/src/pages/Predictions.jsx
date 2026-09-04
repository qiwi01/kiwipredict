import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Calendar, Crown } from 'lucide-react';
import api from '../utils/api';
import '../css/Predictions.css';

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMatchLocalDate = (utcDate) => formatLocalDate(new Date(utcDate));

const Predictions = () => {
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Set default date to today
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const location = useLocation();

  // Determine prediction type from URL
  const getPredictionType = () => {
    const path = location.pathname;

    if (path.includes('/today/')) {
      if (path.includes('/win')) return 'today-win';
      if (path.includes('/over15')) return 'today-over15';
      if (path.includes('/over25')) return 'today-over25';
      if (path.includes('/over35')) return 'today-over35';
      if (path.includes('/corners')) return 'today-corners';
      if (path.includes('/ggng')) return 'today-ggng';
      if (path.includes('/others')) return 'today-others';
      if (path.includes('/players')) return 'today-players';
    } else if (path.includes('/top-picks/')) {
      if (path.includes('/win')) return 'top-picks-win';
      if (path.includes('/over15')) return 'top-picks-over15';
      if (path.includes('/over25')) return 'top-picks-over25';
      if (path.includes('/over35')) return 'top-picks-over35';
      if (path.includes('/corners')) return 'top-picks-corners';
      if (path.includes('/ggng')) return 'top-picks-ggng';
      if (path.includes('/others')) return 'top-picks-others';
      if (path.includes('/players')) return 'top-picks-players';
      return 'top-picks';
    } else if (path.includes('/vip')) {
      return 'vip';
    } else {
      if (path.includes('/win')) return 'all-win';
      if (path.includes('/over15')) return 'all-over15';
      if (path.includes('/over25')) return 'all-over25';
      if (path.includes('/over35')) return 'all-over35';
      if (path.includes('/corners')) return 'all-corners';
      if (path.includes('/ggng')) return 'all-ggng';
      if (path.includes('/others')) return 'all-others';
      if (path.includes('/players')) return 'all-players';
    }

    return 'all'; // Default to all predictions
  };

  // Get the specific prediction type filter for displaying predictions
  const getPredictionTypeFilter = () => {
    if (predictionType.includes('-win')) return 'win';
    if (predictionType.includes('-over15')) return 'over15';
    if (predictionType.includes('-over25')) return 'over25';
    if (predictionType.includes('-over35')) return 'over35';
    if (predictionType.includes('-corners')) return 'corners';
    if (predictionType.includes('-ggng')) return 'ggng';
    if (predictionType.includes('-others')) return 'others';
    if (predictionType.includes('-players')) return 'player';
    return null; // For 'all' type, show all predictions
  };

  const predictionType = getPredictionType();
  const predictionTypeFilter = getPredictionTypeFilter();

  useEffect(() => {
    fetchPredictions();
  }, [predictionType, selectedDate]);

  useEffect(() => {
    let filtered = matches;

    // Filter by league
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(match =>
        match.competition?.name === selectedLeague || match.league === selectedLeague
      );
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(match => getMatchLocalDate(match.utcDate) === selectedDate);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(match =>
        match.homeTeam?.name?.toLowerCase().includes(term) ||
        match.awayTeam?.name?.toLowerCase().includes(term) ||
        match.competition?.name?.toLowerCase().includes(term) ||
        match.league?.toLowerCase().includes(term)
      );
    }

    setFilteredMatches(filtered);
  }, [matches, selectedLeague, selectedDate, searchTerm]);

  // Get unique leagues from matches
  const getAvailableLeagues = () => {
    const leagues = new Set();
    matches.forEach(match => {
      if (match.competition?.name) {
        leagues.add(match.competition.name);
      } else if (match.league) {
        leagues.add(match.league);
      }
    });
    return Array.from(leagues).sort();
  };

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const requestedDate = selectedDate || formatLocalDate(new Date());
      const rangeStart = new Date(`${requestedDate}T00:00:00`);
      const rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 14);

      const fromDate = selectedDate ? requestedDate : formatLocalDate(rangeStart);
      const toDate = selectedDate ? requestedDate : formatLocalDate(rangeEnd);
      const res = await api.get(`/api/matches?from=${fromDate}&to=${toDate}`);
      let matchesData = res.data;

      console.log(`[Predictions] Fetched ${matchesData.length} matches`);

      // Filter matches based on prediction type for specific pages
      if (predictionType.includes('today-')) {
        const activeDate = selectedDate || formatLocalDate(new Date());
        matchesData = matchesData.filter(match => getMatchLocalDate(match.utcDate) === activeDate);
      }

      // For specific prediction types, still filter matches, but show ALL predictions for those matches
      if (predictionType.includes('-win')) {
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.type === 'win')
        );
      } else if (predictionType.includes('-over15')) {
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.type === 'over15')
        );
      } else if (predictionType.includes('-over25')) {
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.type === 'over25')
        );
      } else if (predictionType.includes('-over35')) {
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.type === 'over35')
        );
      } else if (predictionType.includes('-corners')) {
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.type === 'corners')
        );
      } else if (predictionType.includes('-ggng')) {
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.type === 'ggng')
        );
      } else if (predictionType.includes('-others')) {
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.type === 'others')
        );
      } else if (predictionType.includes('-players')) {
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.type === 'player')
        );
      }

      // Top Picks are exclusively VVIP games and selections.
      if (predictionType.startsWith('top-picks')) {
        matchesData = matchesData.filter(match =>
          match.gameTier === 'vvip' ||
          (match.predictions && match.predictions.some(pred => pred.visibility === 'vvip'))
        );
      }
      // For 'all' and other general pages, show all matches that have predictions

      console.log(`[Predictions] After filtering: ${matchesData.length} matches for type: ${predictionType}`);
      setMatches(matchesData);
    } catch (err) {
      console.error('[Predictions] Error fetching predictions:', err);
      toast.error('Failed to load predictions. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="predictions-container">
        <div className="predictions-header">
          <h1 className="predictions-title">Loading Predictions</h1>
          <p className="predictions-subtitle">Please wait while we fetch the latest football predictions...</p>
        </div>

        <div className="predictions-loading">
          <div className="predictions-loading-spinner"></div>
          <div className="predictions-loading-text">
            <div className="predictions-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            Analyzing match data...
          </div>
        </div>
      </div>
    );
  }

  // Get header content based on prediction type
  const getHeaderContent = () => {
    switch (predictionType) {
      case 'today-win':
        return {
          title: "Today's Win/Draw Predictions",
          subtitle: "Semi-AI match winner predictions for today's football matches, reviewed and organized for clarity"
        };
      case 'today-over15':
        return {
          title: "Today's Over/Under 1.5 Goals",
          subtitle: "Matches predicted to have 2 or more goals today"
        };
      case 'today-over25':
        return {
          title: "Today's Over/Under 2.5 Goals",
          subtitle: "Matches predicted to have 3 or more goals today"
        };
      case 'today-over35':
        return {
          title: "Today's Over/Under 3.5 Goals",
          subtitle: "Matches predicted to have 4 or more goals today"
        };
      case 'today-corners':
        return {
          title: "Today's Corner Predictions",
          subtitle: "Semi-AI corner kick predictions for today's matches"
        };
      case 'today-ggng':
        return {
          title: "Today's GG/NG Predictions",
          subtitle: "Both teams to score predictions for today's matches"
        };
      case 'today-others':
        return {
          title: "Today's Other Predictions",
          subtitle: "Additional betting market predictions for today's matches"
        };
      case 'today-players':
        return {
          title: "Today's Player Predictions",
          subtitle: "Semi-AI predictions for player performances and scoring today"
        };
      case 'top-picks':
        return {
          title: "Top Picks",
          subtitle: "Exclusive VVIP selections with our highest confidence predictions"
        };
      case 'top-picks-win':
        return {
          title: "Top Picks - Win/Draw Predictions",
          subtitle: "Our highest confidence match winner predictions"
        };
      case 'top-picks-over15':
        return {
          title: "Top Picks - Over/Under 1.5 Goals",
          subtitle: "Our most reliable over/under 1.5 goals predictions"
        };
      case 'top-picks-over25':
        return {
          title: "Top Picks - Over/Under 2.5 Goals",
          subtitle: "Our most reliable over/under 2.5 goals predictions"
        };
      case 'top-picks-over35':
        return {
          title: "Top Picks - Over/Under 3.5 Goals",
          subtitle: "Our most reliable over/under 3.5 goals predictions"
        };
      case 'top-picks-corners':
        return {
          title: "Top Picks - Corner Predictions",
          subtitle: "Our highest confidence corner kick predictions"
        };
      case 'top-picks-ggng':
        return {
          title: "Top Picks - GG/NG Predictions",
          subtitle: "Our highest confidence both teams to score predictions"
        };
      case 'top-picks-others':
        return {
          title: "Top Picks - Other Predictions",
          subtitle: "Our highest confidence additional betting market predictions"
        };
      case 'top-picks-players':
        return {
          title: "Top Picks - Player Predictions",
          subtitle: "Our highest confidence player performance predictions"
        };
      case 'vip':
        return {
          title: "VIP Predictions",
          subtitle: "Premium semi-AI predictions with enhanced data checks and market organization"
        };
      case 'all-win':
        return {
          title: "Win/Draw Predictions",
          subtitle: "Semi-AI match winner predictions for all upcoming matches"
        };
      case 'all-over15':
        return {
          title: "Over/Under 1.5 Goals",
          subtitle: "Matches predicted to have 2 or more goals"
        };
      case 'all-over25':
        return {
          title: "Over/Under 2.5 Goals",
          subtitle: "Matches predicted to have 3 or more goals"
        };
      case 'all-over35':
        return {
          title: "Over/Under 3.5 Goals",
          subtitle: "Matches predicted to have 4 or more goals"
        };
      case 'all-corners':
        return {
          title: "Corner Predictions",
          subtitle: "Semi-AI corner kick predictions for all upcoming matches"
        };
      case 'all-ggng':
        return {
          title: "GG/NG Predictions",
          subtitle: "Both teams to score predictions for all upcoming matches"
        };
      case 'all-others':
        return {
          title: "Other Predictions",
          subtitle: "Additional betting market predictions for all upcoming matches"
        };
      case 'all-players':
        return {
          title: "Player Predictions",
          subtitle: "Semi-AI predictions for player performances and scoring"
        };
      default:
        return {
          title: "Semi-AI Predictions",
          subtitle: "Professional football predictions supported by algorithmic data signals, statistical review, market context, and human oversight."
        };
    }
  };

  const headerContent = getHeaderContent();

  return (
    <div className="predictions-container">
      <div className="predictions-header">
        <h1 className="predictions-title">{headerContent.title}</h1>
        <p className="predictions-subtitle">
          {headerContent.subtitle}
        </p>
      </div>

      {/* League and Date Filters */}
      <div className="predictions-filters">
        <select
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
          className="predictions-league-select"
        >
          <option value="all">All Leagues</option>
          {getAvailableLeagues().map(league => (
            <option key={league} value={league}>{league}</option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="predictions-date-select"
          placeholder="Filter by date"
        />

        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="predictions-search-input"
          placeholder="Search team or league..."
        />

        {/* Prediction Type Filter - Show on "All Predictions" page and specific type pages */}
        {(predictionType === 'all' || predictionType.includes('-win') || predictionType.includes('-over15') || predictionType.includes('-over25') || predictionType.includes('-over35') || predictionType.includes('-corners') || predictionType.includes('-ggng') || predictionType.includes('-others') || predictionType.includes('-player') || predictionType.includes('-players')) && (
          <select
            value={predictionTypeFilter || 'all'}
            onChange={(e) => {
              const newFilter = e.target.value === 'all' ? null : e.target.value;
              // Update the URL to reflect the filter change
              const newPath = newFilter ? `/predictions/${newFilter}` : '/predictions';
              window.location.href = newPath;
            }}
            className="predictions-league-select"
          >
            <option value="all">All Types</option>
            <option value="win">Win/Draw</option>
            <option value="over15">Over 1.5</option>
            <option value="over25">Over 2.5</option>
            <option value="over35">Over 3.5</option>
            <option value="corners">Corners</option>
            <option value="ggng">GG/NG</option>
            <option value="others">Others</option>
            <option value="players">Players</option>
          </select>
        )}
      </div>

      {/* Matches Grid */}
      <div className="predictions-grid">
        {filteredMatches.length === 0 ? (
          <div className="predictions-no-matches">
            <div className="predictions-no-matches-icon">⚽</div>
            <h3 className="predictions-no-matches-title">No Matches Available</h3>
            <p className="predictions-no-matches-subtitle">
              There are no matches available for the selected criteria at the moment.
            </p>
          </div>
        ) : (
          filteredMatches.map((match, index) => (
            <div
              key={index}
              className="admin-match-card"
            >
              <div className="admin-match-header">
                <div className="admin-match-meta">
                  <div className="admin-match-meta-item">
                    <Calendar className="admin-match-icon" />
                    <span>{new Date(match.utcDate).toLocaleDateString()}</span>
                  </div>
                  <div className="admin-match-meta-item">
                    <span>{match.competition?.name || 'Premier League'}</span>
                  </div>
                </div>
              </div>

              <div className="admin-match-info">
                <h3 className="admin-match-teams">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </h3>
              </div>

              <div className="admin-predictions-list">
                {match.predictions && match.predictions.length > 0 ? (
                  (predictionTypeFilter ? match.predictions.filter(pred => pred.type === predictionTypeFilter || pred.originalType === predictionTypeFilter) : match.predictions).map((prediction, predIndex) => (
                    <div key={predIndex} className={`admin-prediction-item-display ${prediction.type === predictionTypeFilter ? 'selected-prediction' : ''} ${prediction.locked ? 'locked' : ''}`}>
                      <div className="admin-prediction-type">
                        <span className="admin-prediction-type-label">
                          {prediction.type === 'win' ? 'WIN/DRAW' :
                           prediction.type === 'over15' ? 'OVER/UNDER 1.5' :
                           prediction.type === 'over25' ? 'OVER/UNDER 2.5' :
                           prediction.type === 'corners' ? 'CORNERS' :
                           prediction.type === 'ggng' ? 'GG/NG' :
                           prediction.type === 'others' ? 'OTHERS' :
                           prediction.type === 'player' ? 'PLAYER' : 'PREDICTION'}
                        </span>
                        {(prediction.visibility === 'vip' || prediction.visibility === 'vvip' || prediction.visibility === 'both') && (
                          <div className={`admin-vip-badge-small ${prediction.visibility === 'vvip' ? 'vvip' : 'vip'}`}>
                            <Crown className="admin-vip-icon-small" />
                            <span>{prediction.visibility === 'vvip' ? 'VVIP' : 'VIP'}</span>
                          </div>
                        )}
                      </div>

                      <div className="admin-prediction-details">
                        <div className="admin-prediction-value">{prediction.prediction}</div>
                        <div className="admin-prediction-confidence">
                          {prediction.locked ? 'VIP members only' : `${prediction.confidence}% confidence`}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-no-predictions">
                    <span>No predictions available</span>
                  </div>
                )}
              </div>


            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Predictions;
