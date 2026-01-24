import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Calendar, TrendingUp, Target, Star, CheckCircle, XCircle, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import api from '../utils/api';
import '../css/Predictions.css';

const Outcomes = () => {
  const { user } = useAuth();
  const [outcomesData, setOutcomesData] = useState({ todays: [], topPicks: [], vip: [], all: [] });
  const [availableDates, setAvailableDates] = useState([
    new Date().toISOString().split('T')[0],
    new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // 2 days ago
  ]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeSection, setActiveSection] = useState('all');

  useEffect(() => {
    fetchOutcomes();
    fetchAvailableDates();
  }, [selectedDate]);

  const fetchOutcomes = async () => {
    try {
      setLoading(true);
      const params = selectedDate ? { date: selectedDate } : { days: 30 };
      const response = await api.get('/api/outcomes', { params });
      setOutcomesData(response.data);
    } catch (err) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      const response = await api.get('/api/outcomes/dates');
      setAvailableDates(response.data);
    } catch (err) {
      // Error handled silently
    }
  };

  const getCurrentDisplayData = () => {
    if (!outcomesData) return [];

    switch (activeSection) {
      case 'todays':
        return Array.isArray(outcomesData.todays) ? outcomesData.todays : [];
      case 'topPicks':
        return Array.isArray(outcomesData.topPicks) ? outcomesData.topPicks : [];
      case 'vip': {
        const vipData = Array.isArray(outcomesData.vip) ? outcomesData.vip : [];
        return (user?.vipTier === 'vip' || user?.vipTier === 'vvip') ? vipData : [];
      }
      default:
        return Array.isArray(outcomesData.all) ? outcomesData.all : [];
    }
  };

  const calculateStats = (matches) => {
    if (!matches || !Array.isArray(matches)) {
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        incorrectPredictions: 0,
        accuracy: 0
      };
    }

    let totalPredictions = 0;
    let correctPredictions = 0;
    let incorrectPredictions = 0;

    matches.forEach(match => {
      if (match.outcomes && Array.isArray(match.outcomes)) {
        match.outcomes.forEach(outcome => {
          totalPredictions++;
          if (outcome.actualResult === 'win') {
            correctPredictions++;
          } else if (outcome.actualResult === 'loss') {
            incorrectPredictions++;
          }
        });
      }
    });

    const accuracy = totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(1) : 0;

    return {
      totalPredictions,
      correctPredictions,
      incorrectPredictions,
      accuracy
    };
  };

  const getSectionIcon = (section) => {
    switch (section) {
      case 'todays':
        return <Calendar className="outcomes-section-icon" />;
      case 'topPicks':
        return <Star className="outcomes-section-icon" />;
      case 'vip':
        return <Crown className="outcomes-section-icon" />;
      default:
        return <Target className="outcomes-section-icon" />;
    }
  };

  const getSectionTitle = (section) => {
    switch (section) {
      case 'todays':
        return "Today's Predictions";
      case 'topPicks':
        return 'Top Picks';
      case 'vip':
        return 'VIP Predictions';
      default:
        return 'All Predictions';
    }
  };

  const navigateDate = (direction) => {
    if (!availableDates.length) return;

    const currentIndex = selectedDate
      ? availableDates.indexOf(selectedDate)
      : availableDates.length - 1;

    let newIndex;
    if (direction === 'prev') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(availableDates.length - 1, currentIndex + 1);
    }

    setSelectedDate(availableDates[newIndex]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'All Time';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const sections = [
    { id: 'all', label: 'All Predictions', icon: Target },
    { id: 'todays', label: 'Today\'s Predictions', icon: Calendar },
    { id: 'topPicks', label: 'Top Picks', icon: Star },
    ...(user?.isVIP ? [{ id: 'vip', label: 'VIP Predictions', icon: Crown }] : [])
  ];

  const currentData = getCurrentDisplayData();
  const stats = calculateStats(currentData);

  if (loading) {
    return (
      <div className="predictions-container">
        <div className="predictions-loading">
          <div className="predictions-loading-spinner"></div>
          <div className="predictions-loading-text">
            <div className="predictions-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            Analyzing match outcomes...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="predictions-container">
      {/* Header */}
      <div className="predictions-header">
        <div className="predictions-title-section">
          <h1 className="predictions-title">
            <Target className="predictions-title-icon" />
            Prediction Outcomes
          </h1>
          <p className="predictions-subtitle">
            Track the accuracy of past predictions and analyze performance
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="outcomes-date-nav">
        <button
          onClick={() => navigateDate('next')}
          className="outcomes-date-btn"
          disabled={!availableDates.length || selectedDate === availableDates[availableDates.length - 1]}
        >
          <ChevronLeft className="outcomes-date-icon" />
        </button>

        <div className="outcomes-date-display">
          <Calendar className="outcomes-date-icon" />
          <span>{formatDate(selectedDate)}</span>
        </div>

        <button
          onClick={() => navigateDate('prev')}
          className="outcomes-date-btn"
          disabled={!availableDates.length || selectedDate === availableDates[0]}
        >
          <ChevronRight className="outcomes-date-icon" />
        </button>

        {selectedDate && (
          <button
            onClick={() => setSelectedDate(null)}
            className="outcomes-date-reset"
          >
            View All
          </button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="outcomes-sections">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`outcomes-section-tab ${activeSection === id ? 'active' : ''}`}
          >
            <Icon className="outcomes-section-tab-icon" />
            <span>{label}</span>
            <span className="outcomes-section-count">
              {Array.isArray(outcomesData[id]) ? outcomesData[id].length : 0}
            </span>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="predictions-stats">
        <div className="predictions-stat-card">
          <div className="predictions-stat-icon">
            <TrendingUp className="predictions-stat-icon-svg" />
          </div>
          <div className="predictions-stat-content">
            <div className="predictions-stat-value">{stats.accuracy}%</div>
            <div className="predictions-stat-label">Prediction Accuracy</div>
          </div>
        </div>

        <div className="predictions-stat-card">
          <div className="predictions-stat-icon">
            <CheckCircle className="predictions-stat-icon-svg" />
          </div>
          <div className="predictions-stat-content">
            <div className="predictions-stat-value">{stats.correctPredictions}</div>
            <div className="predictions-stat-label">Correct Predictions</div>
          </div>
        </div>

        <div className="predictions-stat-card">
          <div className="predictions-stat-icon">
            <XCircle className="predictions-stat-icon-svg" />
          </div>
          <div className="predictions-stat-content">
            <div className="predictions-stat-value">{stats.incorrectPredictions}</div>
            <div className="predictions-stat-label">Incorrect Predictions</div>
          </div>
        </div>

        <div className="predictions-stat-card">
          <div className="predictions-stat-icon">
            <Calendar className="predictions-stat-icon-svg" />
          </div>
          <div className="predictions-stat-content">
            <div className="predictions-stat-value">{stats.totalPredictions}</div>
            <div className="predictions-stat-label">Total Predictions</div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="outcomes-section-header">
        {getSectionIcon(activeSection)}
        <h2 className="outcomes-section-title">{getSectionTitle(activeSection)}</h2>
        <span className="outcomes-section-count-badge">{currentData.length}</span>
      </div>

      {/* Outcomes List */}
      <div className="predictions-content">
        {currentData.length === 0 ? (
          <div className="predictions-empty">
            <div className="predictions-empty-icon">
              {activeSection === 'vip' ? '👑' : activeSection === 'topPicks' ? '⭐' : '📊'}
            </div>
            <h3 className="predictions-empty-title">
              {activeSection === 'vip' ? 'No VIP outcomes available' :
               activeSection === 'topPicks' ? 'No top picks outcomes available' :
               'No outcomes found'}
            </h3>
            <p className="predictions-empty-description">
              {activeSection === 'vip'
                ? 'VIP prediction outcomes will appear here once matches are completed.'
                : 'No prediction outcomes available for the selected criteria.'}
            </p>
          </div>
        ) : (
          <div className="predictions-grid">
            {currentData.map((match, index) => (
              <div key={match.id || index} className="predictions-match-card">
                <div className="predictions-match-header">
                  <div className="predictions-match-meta">
                    <div className="predictions-match-meta-item">
                      <Calendar className="predictions-match-icon" />
                      <span>{new Date(match.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {match.gameTier === 'vip' && (
                    <div className="predictions-value-badge">
                      <Crown className="predictions-value-icon" />
                      <span>VIP</span>
                    </div>
                  )}
                  {match.gameTier === 'vvip' && (
                    <div className="predictions-value-badge vvip">
                      <Crown className="predictions-value-icon" />
                      <span>VVIP</span>
                    </div>
                  )}
                </div>

                <div className="predictions-match-teams">
                  <h3 className="predictions-match-teams-title">
                    {match.homeTeam} vs {match.awayTeam}
                  </h3>
                  <p className="predictions-match-league">{match.league}</p>

                  {match.homeGoals !== null && match.awayGoals !== null && (
                    <div className="predictions-match-score">
                      <span className="predictions-score">{match.homeGoals} - {match.awayGoals}</span>
                    </div>
                  )}
                </div>

                {/* Outcomes for this match */}
                <div className="predictions-outcomes-list">
                  {match.outcomes && match.outcomes.map((outcome, outcomeIndex) => (
                    <div key={outcomeIndex} className="predictions-outcome-item">
                      <div className="predictions-outcome-header">
                            <span className="predictions-outcome-type">
                          {outcome.predictionType === 'win' ? 'Match Winner' :
                           outcome.predictionType === 'over15' ? 'Over/Under 1.5' :
                           outcome.predictionType === 'over25' ? 'Over/Under 2.5' :
                           outcome.predictionType === 'over35' ? 'Over/Under 3.5' :
                           outcome.predictionType === 'corners' ? 'Corners' :
                           outcome.predictionType === 'ggng' ? 'GG/NG' :
                           outcome.predictionType === 'others' ? 'Others' :
                           'Player Prediction'}
                        </span>

                        <div className={`predictions-outcome-badge ${
                          outcome.actualResult === 'win' ? 'correct' :
                          outcome.actualResult === 'loss' ? 'incorrect' : 'pending'
                        }`}>
                          {outcome.actualResult === 'win' ? (
                            <>
                              <CheckCircle className="predictions-outcome-icon" />
                              <span>Correct</span>
                            </>
                          ) : outcome.actualResult === 'loss' ? (
                            <>
                              <XCircle className="predictions-outcome-icon" />
                              <span>Incorrect</span>
                            </>
                          ) : (
                            <span>Pending</span>
                          )}
                        </div>
                      </div>

                      <div className="predictions-outcome-details">
                        <div className="predictions-outcome-prediction">
                          <span className="predictions-outcome-label">Predicted:</span>
                          <span className="predictions-prediction-value">{outcome.prediction}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Outcomes;
