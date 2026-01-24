import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { TrendingUp, Target, Users, Zap, Star, Calendar, ArrowRight, Shuffle, Crown, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import '../css/Home.css';

const Home = () => {
  const [featuredMatches, setFeaturedMatches] = useState([]);
  const [todaysMatches, setTodaysMatches] = useState([]);
  const [outcomes, setOutcomes] = useState([]);

  // Mini converter states
  const [converterForm, setConverterForm] = useState({
    fromBookmaker: 'bet9ja',
    toBookmaker: 'sportybet',
    bookingCode: ''
  });
  const [converterResult, setConverterResult] = useState(null);
  const [converterError, setConverterError] = useState('');
  const [converting, setConverting] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    // Only load data if user is authenticated
    if (!user) {
      return;
    }

    // Get real matches from TheSportsDB
    api.get('/api/matches')
      .then(res => {
        setFeaturedMatches(res.data.slice(0, 6));
        // Filter for today's matches
        const today = new Date().toDateString();
        const todayMatches = res.data.filter(match =>
          new Date(match.utcDate).toDateString() === today
        );
        setTodaysMatches(todayMatches);
      })
      .catch(err => {
        // Handle 401 (unauthorized) gracefully - don't show error
        if (err.response?.status !== 401) {
          // Could add fallback logic here if needed
        }
      });

    // Get outcomes (past predictions)
    api.get('/api/outcomes?days=7')
      .then(res => setOutcomes(res.data))
      .catch(err => {
        // Handle 401 (unauthorized) gracefully - don't show error
        if (err.response?.status !== 401) {
          // Could add fallback logic here if needed
        }
      });

  }, [user]);

  // Mini converter functions
  const handleConverterInputChange = (field, value) => {
    setConverterForm(prev => ({
      ...prev,
      [field]: value
    }));
    setConverterError('');
    setConverterResult(null);
  };

  const handleMiniConvert = async (e) => {
    e.preventDefault();

    if (!converterForm.bookingCode.trim()) {
      toast.error('Please enter a booking code');
      return;
    }

    setConverting(true);
    setConverterError('');

    try {
      const response = await api.post('/api/vip/convert-booking-code', {
        fromBookmaker: converterForm.fromBookmaker,
        toBookmaker: converterForm.toBookmaker,
        bookingCode: converterForm.bookingCode.trim()
      });

      if (response.data.success) {
        setConverterResult(response.data.data);
        toast.success('Code converted successfully!');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setConverterError('VIP membership required to use the bet converter. Upgrade now to access this premium feature!');
      } else {
        const errorMessage = error.response?.data?.error || 'Conversion failed';
        setConverterError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="home-title-row">
            <h1 className="home-title">
              Kiwi Predict
            </h1>
            <span className="hero-football" aria-hidden="true">⚽</span>
          </div>

          <p className="home-subtitle">
            Professional Football Prediction Platform
          </p>

          <p className="home-description">
            Powered by advanced AI algorithms using Poisson distribution, statistical modeling,
            and real-time bookmaker odds to deliver the most accurate predictions in football betting.
          </p>

          <div className="home-cta-buttons">
            <Link to="/predictions" className="home-cta-primary">
              <span className="home-cta-content">
                <span>View All Matches & Predictions</span>
                <TrendingUp className="home-cta-icon" />
              </span>
            </Link>
            {!user && (
              <Link to="/register" className="home-cta-secondary">
                Join Free
              </Link>
            )}
          </div>

          {/* Stats Bar */}
          <div className="home-stats-bar">
            <div className="home-stat-item">
              <div className="home-stat-number">95%</div>
              <div className="home-stat-label">Prediction Accuracy</div>
            </div>
            <div className="home-stat-item">
              <div className="home-stat-number">24/7</div>
              <div className="home-stat-label">Live Updates</div>
            </div>
            <div className="home-stat-item">
              <div className="home-stat-number">50K+</div>
              <div className="home-stat-label">Active Users</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mini Bet Converter - Show for logged-in users */}
      {user && (
        <section className="home-converter-section">
          <div className="home-converter-container">
            <div className="home-converter-header">
              <h2 className="home-converter-title">
                <Shuffle className="home-converter-icon" />
                Quick Bet Converter
              </h2>
              <p className="home-converter-subtitle">
                Convert booking codes between sportsbooks instantly
              </p>
            </div>

            <div className="home-mini-converter">
              <form onSubmit={handleMiniConvert} className="mini-converter-form">
                <div className="mini-converter-inputs">
                  <select
                    value={converterForm.fromBookmaker}
                    onChange={(e) => handleConverterInputChange('fromBookmaker', e.target.value)}
                    className="mini-converter-select"
                  >
                    <option value="bet9ja">Bet9ja</option>
                    <option value="sportybet">SportyBet</option>
                    <option value="betking">BetKing</option>
                    <option value="nairabet">NairaBet</option>
                  </select>

                  <ArrowRight className="mini-converter-arrow" />

                  <select
                    value={converterForm.toBookmaker}
                    onChange={(e) => handleConverterInputChange('toBookmaker', e.target.value)}
                    className="mini-converter-select"
                  >
                    <option value="bet9ja">Bet9ja</option>
                    <option value="sportybet">SportyBet</option>
                    <option value="betking">BetKing</option>
                    <option value="nairabet">NairaBet</option>
                  </select>

                  <input
                    type="text"
                    value={converterForm.bookingCode}
                    onChange={(e) => handleConverterInputChange('bookingCode', e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="mini-converter-code"
                    required
                  />

                  <button
                    type="submit"
                    disabled={converting}
                    className="mini-converter-btn"
                  >
                    {converting ? (
                      <div className="mini-spinner"></div>
                    ) : (
                      <Shuffle className="mini-btn-icon" />
                    )}
                  </button>
                </div>

                {converterError && (
                  <div className="mini-converter-error">
                    <AlertCircle className="error-icon" />
                    <span className="error-text">{converterError}</span>
                    <Link to="/vip" className="error-upgrade-link">
                      Upgrade to VIP
                    </Link>
                  </div>
                )}

                {converterResult && (
                  <div className="mini-converter-result">
                    <div className="result-code" onClick={() => {navigator.clipboard.writeText(converterResult.convertedCode); toast.success('Copied!');}}>
                      {converterResult.convertedCode}
                    </div>
                    <Crown className="result-vip-icon" />
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Features Section - Only show for logged-out users */}
      {!user && (
        <section className="home-features">
          <div className="home-feature-card">
            <div className="home-feature-icon">
              <Target className="home-feature-icon-svg" />
            </div>
            <h3 className="home-feature-title">Poisson Distribution</h3>
            <p className="home-feature-description">
              Advanced mathematical modeling for accurate goal probability calculations
            </p>
          </div>
          <div className="home-feature-card">
            <div className="home-feature-icon">
              <TrendingUp className="home-feature-icon-svg" />
            </div>
            <h3 className="home-feature-title">Home Advantage</h3>
            <p className="home-feature-description">
              Statistical analysis of home/away performance and venue factors
            </p>
          </div>
          <div className="home-feature-card">
            <div className="home-feature-icon">
              <Zap className="home-feature-icon-svg" />
            </div>
            <h3 className="home-feature-title">Value Detection</h3>
            <p className="home-feature-description">
              Identify overvalued odds and find profitable betting opportunities
            </p>
          </div>
        </section>
      )}

      {/* Today's Predictions Section */}
      <section className="home-matches-section">
        <div className="home-matches-header">
          <h2 className="home-matches-title">Today's Predictions</h2>
          <Link to="/predictions?filter=today" className="home-view-all">
            <span>More</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {!Array.isArray(todaysMatches) || todaysMatches.length === 0 ? (
          <div className="home-empty-state">
            <div className="home-empty-icon">⚽</div>
            <h3 className="home-empty-title">No matches today</h3>
            <p className="home-empty-description">Check back tomorrow for today's predictions</p>
          </div>
        ) : (
          <div className="home-matches-grid">
            {todaysMatches.slice(0, 3).map((match, index) => (
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
                      <span>{match.predictions?.length || 0} prediction{match.predictions?.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {match.valueBet && (
                    <div className="admin-value-badge-small">
                      <Star className="admin-value-icon-small" />
                      <span>VALUE</span>
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
                    match.predictions.map((pred, predIndex) => (
                      <div key={predIndex} className={`admin-prediction-item-display ${pred.valueBet ? 'admin-match-value' : ''}`}>
                        <div className="admin-prediction-type">
                        <span className="admin-prediction-type-label">
                          {pred.type === 'win' ? 'WIN/DRAW' :
                           pred.type === 'over15' ? 'OVER/UNDER 1.5' :
                           pred.type === 'over25' ? 'OVER/UNDER 2.5' :
                           pred.type === 'corners' ? 'CORNERS' :
                           pred.type === 'ggng' ? 'GG/NG' :
                           pred.type === 'others' ? 'OTHERS' :
                           pred.type === 'player' ? 'PLAYER' : 'PREDICTION'}
                        </span>
                          {(pred.visibility === 'vip' || pred.visibility === 'vvip' || pred.visibility === 'both') && (
                            <div className={`admin-vip-badge-small ${pred.visibility === 'vvip' ? 'vvip' : 'vip'}`}>
                              <Crown className="admin-vip-icon-small" />
                              <span>{pred.visibility === 'vvip' ? 'VVIP' : 'VIP'}</span>
                            </div>
                          )}
                        </div>

                        <div className="admin-prediction-details">
                          <div className="admin-prediction-value">{pred.prediction}</div>
                          <div className="admin-prediction-confidence">{pred.confidence}% confidence</div>
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
            ))}
          </div>
        )}
      </section>

      {/* Outcomes Section */}
      <section className="home-matches-section">
        <div className="home-matches-header">
          <h2 className="home-matches-title">Recent Outcomes</h2>
          <Link to="/outcomes" className="home-view-all">
            <span>More</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {!outcomes || !outcomes.all || outcomes.all.length === 0 ? (
          <div className="home-empty-state">
            <div className="home-empty-icon">📊</div>
            <h3 className="home-empty-title">No recent outcomes</h3>
            <p className="home-empty-description">Outcomes will appear here after matches are completed</p>
          </div>
        ) : (
          <div className="home-matches-grid">
            {outcomes.all.slice(0, 3).map((match, index) => (
              <div key={index} className="home-match-card">
                <div className="home-match-header">
                  <div className="home-match-meta">
                    <div className="home-match-meta-item">
                      <Calendar className="home-match-icon" />
                      <span>{new Date(match.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {match.isVIP && (
                    <div className="home-vip-badge">
                      <Crown className="home-vip-icon" />
                      <span>VIP</span>
                    </div>
                  )}
                </div>

                <div className="home-match-info">
                  <h3 className="home-match-teams">
                    {match.homeTeam} vs {match.awayTeam}
                  </h3>
                  <p className="home-match-league">{match.league}</p>
                </div>

                <div className="home-prediction-section">
                  <div className="home-prediction-display">
                    {/* Show the first outcome from this match */}
                    {match.outcomes && match.outcomes.length > 0 && (() => {
                      const outcome = match.outcomes[0]; // Show first outcome
                      const isCorrect = outcome.actualResult === 'win';

                      return (
                        <>
                          <div className={`home-outcome-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                            {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                          </div>
                          <div className="home-prediction-label">
                            {outcome.predictionType === 'win' ? 'Match Winner' :
                             outcome.predictionType === 'over15' ? 'Over/Under 1.5' :
                             outcome.predictionType === 'over25' ? 'Over/Under 2.5' :
                             outcome.predictionType === 'over35' ? 'Over/Under 3.5' :
                             outcome.predictionType === 'corners' ? 'Corners' :
                             outcome.predictionType === 'ggng' ? 'GG/NG' :
                             outcome.predictionType === 'others' ? 'Others' :
                             'Prediction'}: {outcome.prediction}
                          </div>
                          {match.outcomes.length > 1 && (
                          <div className="home-prediction-label">
                            +{match.outcomes.length - 1} more outcome{match.outcomes.length > 2 ? "s" : ""}
                          </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured Matches */}
      <section className="home-matches-section">
        <div className="home-matches-header">
          <h2 className="home-matches-title">Featured Predictions</h2>
          <Link to="/predictions" className="home-view-all">
            <span>More</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        <div className="home-matches-grid">
          {Array.isArray(featuredMatches) && featuredMatches.map((match, index) => (
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
                    <span>{match.predictions?.length || 0} prediction{match.predictions?.length !== 1 ? "s" : ""}</span>
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
                  match.predictions.map((pred, predIndex) => (
                    <div key={predIndex} className={`admin-prediction-item-display ${pred.valueBet ? 'admin-match-value' : ''}`}>
                      <div className="admin-prediction-type">
                        <span className="admin-prediction-type-label">
                          {pred.type === 'win' ? 'WIN/DRAW' :
                           pred.type === 'over15' ? 'OVER/UNDER 1.5' :
                           pred.type === 'over25' ? 'OVER/UNDER 2.5' :
                           pred.type === 'corners' ? 'CORNERS' :
                           pred.type === 'ggng' ? 'GG/NG' :
                           pred.type === 'others' ? 'OTHERS' :
                           pred.type === 'player' ? 'PLAYER' : 'PREDICTION'}
                        </span>
                        {(pred.visibility === 'vip' || pred.visibility === 'vvip' || pred.visibility === 'both') && (
                          <div className={`admin-vip-badge-small ${pred.visibility === 'vvip' ? 'vvip' : 'vip'}`}>
                            <Crown className="admin-vip-icon-small" />
                            <span>{pred.visibility === 'vvip' ? 'VVIP' : 'VIP'}</span>
                          </div>
                        )}
                      </div>

                      <div className="admin-prediction-details">
                        <div className="admin-prediction-value">{pred.prediction}</div>
                        <div className="admin-prediction-confidence">{pred.confidence}% confidence</div>
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
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
