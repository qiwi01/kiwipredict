import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Star, Calendar, Crown } from 'lucide-react';
import api from '../utils/api';
import '../css/Predictions.css';

const Predictions = () => {
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
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
  }, [predictionType]);

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
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      filtered = filtered.filter(match => {
        const matchDate = new Date(match.utcDate);
        return matchDate >= filterDate && matchDate < nextDay;
      });
    }

    setFilteredMatches(filtered);
  }, [matches, selectedLeague, selectedDate]);

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
      // Get all matches with predictions
      const res = await api.get('/api/matches');
      let matchesData = res.data;

      // Filter matches based on prediction type for specific pages
      if (predictionType.includes('today-')) {
        // For today's predictions, filter by current date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        matchesData = matchesData.filter(match => {
          const matchDate = new Date(match.utcDate);
          return matchDate >= today && matchDate < tomorrow;
        });
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
      } else if (predictionType === 'top-picks') {
        // For top-picks, show only matches that have value bets
        matchesData = matchesData.filter(match =>
          match.predictions && match.predictions.some(pred => pred.valueBet === true)
        );
      }
      // For 'all' and other general pages, show all matches that have predictions

      setMatches(matchesData);
    } catch (err) {
      try {
        // Fallback to mock predictions if real matches fail
        const fallbackRes = await api.get('/api/predictions');
        setMatches(fallbackRes.data);
      } catch (fallbackErr) {
        toast.error('Failed to load predictions');
      }
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
          subtitle: "AI-powered match winner predictions for today's football matches"
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
          subtitle: "AI predictions for corner kicks in today's matches"
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
          subtitle: "AI predictions for player performances and scoring today"
        };
      case 'top-picks':
        return {
          title: "Top Picks",
          subtitle: "Matches with our highest confidence value bets"
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
          subtitle: "Premium predictions with enhanced accuracy algorithms"
        };
      case 'all-win':
        return {
          title: "Win/Draw Predictions",
          subtitle: "AI-powered match winner predictions for all upcoming matches"
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
          subtitle: "AI predictions for corner kicks in all upcoming matches"
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
          subtitle: "AI predictions for player performances and scoring"
        };
      default:
        return {
          title: "AI Predictions",
          subtitle: "Professional predictions powered by advanced algorithms using Poisson distribution modeling, statistical home advantage analysis, and real-time bookmaker odds comparison for maximum accuracy."
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
              className={`admin-match-card ${match.valueBet ? 'admin-match-value' : ''}`}
            >
              <div className="admin-match-header">
                <div className="admin-match-meta">
                  <div className="admin-match-meta-item">
                    <Calendar className="admin-match-icon" />
                    <span>{new Date(match.utcDate).toLocaleDateString()}</span>
                  </div>
                  <div className="admin-match-meta-item">
                    <span>{match.predictions?.length || 0} prediction{match.predictions?.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {match.predictions && match.predictions.some(pred => pred.visibility === 'vip' || pred.visibility === 'vvip' || pred.visibility === 'both') && (
                  <div className={`admin-vip-badge-small ${match.predictions.some(pred => pred.visibility === 'vvip') ? 'vvip' : 'vip'}`}>
                    <Crown className="admin-vip-icon-small" />
                    <span>{match.predictions.some(pred => pred.visibility === 'vvip') ? 'VVIP' : 'VIP'}</span>
                  </div>
                )}
              </div>

              <div className="admin-match-info">
                <h3 className="admin-match-teams">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </h3>
                <p className="admin-match-league">{match.competition?.name || 'Premier League'}</p>
              </div>

              <div className="admin-predictions-list">
                {match.predictions && match.predictions.length > 0 ? (
                  (predictionTypeFilter ? match.predictions.filter(pred => pred.type === predictionTypeFilter) : match.predictions).map((prediction, predIndex) => (
                    <div key={predIndex} className={`admin-prediction-item-display ${prediction.valueBet ? 'admin-match-value' : ''} ${prediction.type === predictionTypeFilter ? 'selected-prediction' : ''}`}>
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
                        <div className="admin-prediction-confidence">{prediction.confidence}% confidence</div>
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
