import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { TrendingUp, Target, Zap, Star, Calendar, ArrowRight, Shuffle, Crown, AlertCircle, ShieldCheck, Sparkles, LayoutDashboard, MessageSquareMore } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import '../css/Home.css';
import footballImage from '../assets/hero-image.png';

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMatchLocalDate = (utcDate) => formatLocalDate(new Date(utcDate));

const Home = () => {
  const [featuredMatches, setFeaturedMatches] = useState([]);
  const [todaysMatches, setTodaysMatches] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [siteSettings, setSiteSettings] = useState(null);

  // Helper to check if a match is a World Cup match
  const isWorldCupMatch = (match) => {
    const leagueName = match.competition?.name || match.league || '';
    return leagueName.toLowerCase().includes('world cup') || leagueName.toLowerCase().includes('fifa') || leagueName.toLowerCase().includes('wc');
  };

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
    // Load data for all users (authenticated and non-authenticated)
    // Get real matches from TheSportsDB
    const todayDate = new Date();
    const sevenDaysFromToday = new Date(todayDate);
    sevenDaysFromToday.setDate(todayDate.getDate() + 7);
    const today = formatLocalDate(todayDate);

    api.get(`/api/matches?from=${today}&to=${formatLocalDate(sevenDaysFromToday)}`, { _skipAuthRedirect: true })
      .then(res => {
        setFeaturedMatches(res.data.slice(0, 6));
        const todayMatches = res.data.filter(match => getMatchLocalDate(match.utcDate) === today);
        setTodaysMatches(todayMatches);
      })
      .catch(err => {
        // Handle 401 (unauthorized) gracefully - don't show error
        if (err.response?.status !== 401) {
          // Could add fallback logic here if needed
        }
      });

    // Get outcomes (past predictions)
    api.get('/api/outcomes?days=7', { _skipAuthRedirect: true })
      .then(res => setOutcomes(res.data))
      .catch(err => {
        // Handle 401 (unauthorized) gracefully - don't show error
        if (err.response?.status !== 401) {
          // Could add fallback logic here if needed
        }
      });

    api.get('/api/site-settings', { _skipAuthRedirect: true })
      .then(res => setSiteSettings(res.data))
      .catch(() => setSiteSettings(null));

  }, []);

  const activeAnnouncements = useMemo(() => (
    siteSettings?.announcements?.items?.filter(item => item.isActive) || []
  ), [siteSettings]);
  const announcementTitle = siteSettings?.announcements?.title?.trim() || '';

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
      {siteSettings?.announcements?.enabled && activeAnnouncements.length > 0 && (
        <section className="home-announcement-bar" aria-label="Site announcements">
          <div className={`home-announcement-shell ${!announcementTitle ? 'home-announcement-shell-no-title' : ''}`}>
            {announcementTitle && (
              <div className="home-announcement-label-wrap">
                <span className="home-announcement-pulse"></span>
                <span className="home-announcement-label">
                  <MessageSquareMore size={16} />
                  {announcementTitle}
                </span>
              </div>
            )}

            <div className="home-announcement-track">
              <div className="home-announcement-message home-announcement-marquee">
                {[...activeAnnouncements, ...activeAnnouncements].map((announcement, index) => (
                  <span key={`${announcement.text}-${index}`} className="home-announcement-marquee-item">
                    {announcement.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hero Section - Redesigned */}
      <section className="home-hero">
        <div className="hero-bg-layer">
          <div className="hero-bg-gradient"></div>
          <div className="hero-bg-pattern"></div>
          <div className="hero-bg-accent"></div>
          <div className="hero-bg-accent-two"></div>
        </div>

        <div className="hero-content">
          {/* Main hero content */}
          <div className={`hero-main ${user ? 'hero-main-authenticated' : ''}`}>
            {!user && (
              <div className="hero-copy-panel">
                <div className="hero-text-block">
                  <h1 className="hero-headline">
                    <span className="hero-headline-accent">Semi-AI</span> Football Predictions,
                    <br />
                    Organized for Better Decisions
                  </h1>
                  <p className="hero-subheadline">
                    Kiwi Predict blends structured match data, algorithm-assisted signals, and human review to give fans
                    cleaner daily football predictions, VIP markets, and transparent result tracking.
                  </p>
                </div>

                <div className="hero-highlight-grid">
                  <div className="hero-highlight-card">
                    <Sparkles className="hero-highlight-icon" />
                    <div>
                      <strong>Semi-AI prediction hub</strong>
                      <span>Data-assisted picks are arranged by market so visitors can understand what to check first.</span>
                    </div>
                  </div>
                  <div className="hero-highlight-card">
                    <LayoutDashboard className="hero-highlight-icon" />
                    <div>
                      <strong>Clear match workflow</strong>
                      <span>Start with today&apos;s matches, compare top signals, then review recent outcomes before joining.</span>
                    </div>
                  </div>
                </div>

                <div className="hero-guest-steps" aria-label="How Kiwi Predict works">
                  <div className="hero-guest-step">
                    <span>01</span>
                    <strong>Analyze</strong>
                    <small>Fixtures, form cues, markets, and probabilities are grouped into simple signals.</small>
                  </div>
                  <div className="hero-guest-step">
                    <span>02</span>
                    <strong>Review</strong>
                    <small>Predictions are organized by confidence, market type, and available access level.</small>
                  </div>
                  <div className="hero-guest-step">
                    <span>03</span>
                    <strong>Track</strong>
                    <small>Outcomes stay visible so users can judge performance from recent and older results.</small>
                  </div>
                </div>

                <div className="hero-actions">
                  <Link to="/predictions" className="hero-btn-primary">
                    <TrendingUp size={20} />
                    <span>View Predictions</span>
                  </Link>
                  <Link to="/register" className="hero-btn-secondary">
                    Get Started Free
                  </Link>
                </div>
              </div>
            )}

            <aside className="hero-preview-card" aria-label="Platform preview">
              <div className="hero-preview-top">
                <div className="hero-preview-brand">
                  <img
                    src={footballImage}
                    alt="Kiwi Predict"
                    className="hero-preview-logo"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div>
                    <span className="hero-preview-kicker">Semi-AI workspace</span>
                    <strong>Prediction Dashboard</strong>
                  </div>
                </div>
                <span className="hero-live-pill">Live</span>
              </div>

              <div className="hero-preview-grid">
                <div className="hero-preview-mini-card">
                  <span>{todaysMatches.length}</span>
                  <small>Today</small>
                </div>
                <div className="hero-preview-mini-card">
                  <span>{featuredMatches.length}</span>
                  <small>Featured</small>
                </div>
                <div className="hero-preview-mini-card accent">
                  <span>VIP</span>
                  <small>Markets</small>
                </div>
              </div>

              <div className="hero-preview-list">
                <div><Target size={16} /><span>Semi-AI assisted markets and confidence signals</span></div>
                <div><ShieldCheck size={16} /><span>No fake match fallbacks; API-only fixtures</span></div>
                <div><LayoutDashboard size={16} /><span>Clean member dashboard and quick actions</span></div>
              </div>

              {user && (
                <div className="hero-actions hero-actions-authenticated">
                  <Link to="/predictions" className="hero-btn-primary">
                    <TrendingUp size={20} />
                    <span>View Predictions</span>
                  </Link>
                  <Link to="/vip" className="hero-btn-secondary">
                    <Crown size={18} />
                    <span>Go VIP</span>
                  </Link>
                </div>
              )}
            </aside>
          </div>

          {/* Stats bar */}
          <div className="hero-stats-bar">
            <div className="hero-stat-item">
              <span className="hero-stat-value">Daily</span>
              <span className="hero-stat-label">Predictions</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat-item">
              <span className="hero-stat-value">24/7</span>
              <span className="hero-stat-label">Live Updates</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat-item">
              <span className="hero-stat-value">VIP</span>
              <span className="hero-stat-label">Markets</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat-item">
              <span className="hero-stat-value">Data</span>
              <span className="hero-stat-label">Led</span>
            </div>
          </div>

        </div>
      </section>

      {!user && (
        <section className="home-overview-strip">
          <div className="home-overview-card">
            <span className="home-overview-eyebrow">Platform overview</span>
            <h2 className="home-overview-heading">A cleaner sports homepage for daily football decisions</h2>
            <p className="home-overview-copy">
              Start with platform updates, move into the most important match cards, then continue to predictions,
              outcomes, VIP tools, and your personal dashboard without unnecessary clutter.
            </p>
          </div>
          <div className="home-overview-metrics">
            <div className="home-metric-card">
              <span className="home-metric-value">{todaysMatches.length}</span>
              <span className="home-metric-label">Today&apos;s matches</span>
            </div>
            <div className="home-metric-card">
              <span className="home-metric-value">{featuredMatches.length}</span>
              <span className="home-metric-label">Featured games</span>
            </div>
            <div className="home-metric-card">
              <span className="home-metric-value">{outcomes?.all?.length || 0}</span>
              <span className="home-metric-label">Recent outcomes</span>
            </div>
          </div>
        </section>
      )}

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
                className={`home-match-card ${match.valueBet ? 'home-match-value' : ''} ${isWorldCupMatch(match) ? 'wc-match-card' : ''} ${isWorldCupMatch(match) ? 'wc-match' : ''}`}
              >
                {isWorldCupMatch(match) && (
                  <div className="home-value-badge" style={{background: 'linear-gradient(135deg, #d4af37, #e6c35c)', color: '#1a1a2e', position: 'absolute', top: 'var(--space-2)', right: 'var(--space-2)', zIndex: 2}}>
                    <span className="wc-card-badge-icon">🏆</span>
                    <span>WC</span>
                  </div>
                )}
                <div className="home-match-header">
                  <div className="home-match-meta">
                    <div className="home-match-meta-item">
                      <Calendar className="home-match-icon" />
                      <span>{new Date(match.utcDate).toLocaleDateString()}</span>
                    </div>
                    <div className="home-match-meta-item">
                      <span>{match.competition?.name || 'Premier League'}</span>
                    </div>
                  </div>

                  {match.valueBet && (
                    <div className="home-value-badge">
                      <Star className="home-value-icon" />
                      <span>VALUE</span>
                    </div>
                  )}
                </div>

                <div className="home-match-info">
                  <h3 className="home-match-teams">
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </h3>
                </div>

                <div className="home-predictions-list">
                  {match.predictions && match.predictions.length > 0 ? (
                    match.predictions.map((pred, predIndex) => (
                      <div key={predIndex} className={`home-prediction-item-display ${pred.valueBet ? 'home-match-value' : ''}`}>
                        <div className="home-prediction-type">
                        <span className="home-prediction-type-label">
                          {pred.type === 'win' ? 'WIN/DRAW' :
                           pred.type === 'over15' ? 'OVER/UNDER 1.5' :
                           pred.type === 'over25' ? 'OVER/UNDER 2.5' :
                           pred.type === 'corners' ? 'CORNERS' :
                           pred.type === 'ggng' ? 'GG/NG' :
                           pred.type === 'others' ? 'OTHERS' :
                           pred.type === 'player' ? 'PLAYER' : 'PREDICTION'}
                        </span>
                          {(pred.visibility === 'vip' || pred.visibility === 'vvip' || pred.visibility === 'both') && (
                            <div className={`home-vip-badge-small ${pred.visibility === 'vvip' ? 'vvip' : 'vip'}`}>
                              <Crown className="home-vip-icon-small" />
                              <span>{pred.visibility === 'vvip' ? 'VVIP' : 'VIP'}</span>
                            </div>
                          )}
                        </div>

                        <div className="home-prediction-details">
                          <div className="home-prediction-value">{pred.prediction}</div>
                          <div className="home-prediction-confidence">{pred.confidence}% confidence</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="home-no-predictions">
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
                    <div className="home-match-meta-item">
                      <span>{match.league}</span>
                    </div>
                  </div>

                </div>

                <div className="home-match-info">
                  <h3 className="home-match-teams">
                    {match.homeTeam} vs {match.awayTeam}
                  </h3>
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
                            +{match.outcomes.length - 1} more outcome{match.outcomes.length > 2 ? 's' : ''}
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
              className={`home-match-card ${match.valueBet ? 'home-match-value' : ''} ${isWorldCupMatch(match) ? 'wc-match-card' : ''}`}
            >
              {isWorldCupMatch(match) && (
                <div className="home-value-badge" style={{background: 'linear-gradient(135deg, #d4af37, #e6c35c)', color: '#1a1a2e', position: 'absolute', top: 'var(--space-2)', right: 'var(--space-2)', zIndex: 2}}>
                  <span className="wc-card-badge-icon">🏆</span>
                  <span>WC</span>
                </div>
              )}
              <div className="home-match-header">
                <div className="home-match-meta">
                  <div className="home-match-meta-item">
                    <Calendar className="home-match-icon" />
                    <span>{new Date(match.utcDate).toLocaleDateString()}</span>
                  </div>
                  <div className="home-match-meta-item">
                    <span>{match.competition?.name || 'Premier League'}</span>
                  </div>
                </div>

                {match.valueBet && (
                  <div className="home-value-badge">
                    <Star className="home-value-icon" />
                    <span>VALUE</span>
                  </div>
                )}
              </div>

              <div className="home-match-info">
                <h3 className="home-match-teams">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </h3>
              </div>

              <div className="home-predictions-list">
                {match.predictions && match.predictions.length > 0 ? (
                  match.predictions.map((pred, predIndex) => (
                    <div key={predIndex} className={`home-prediction-item-display ${pred.valueBet ? 'home-match-value' : ''}`}>
                      <div className="home-prediction-type">
                        <span className="home-prediction-type-label">
                          {pred.type === 'win' ? 'WIN/DRAW' :
                           pred.type === 'over15' ? 'OVER/UNDER 1.5' :
                           pred.type === 'over25' ? 'OVER/UNDER 2.5' :
                           pred.type === 'corners' ? 'CORNERS' :
                           pred.type === 'ggng' ? 'GG/NG' :
                           pred.type === 'others' ? 'OTHERS' :
                           pred.type === 'player' ? 'PLAYER' : 'PREDICTION'}
                        </span>
                        {(pred.visibility === 'vip' || pred.visibility === 'vvip' || pred.visibility === 'both') && (
                          <div className={`home-vip-badge-small ${pred.visibility === 'vvip' ? 'vvip' : 'vip'}`}>
                            <Crown className="home-vip-icon-small" />
                            <span>{pred.visibility === 'vvip' ? 'VVIP' : 'VIP'}</span>
                          </div>
                        )}
                      </div>

                      <div className="home-prediction-details">
                        <div className="home-prediction-value">{pred.prediction}</div>
                        <div className="home-prediction-confidence">{pred.confidence}% confidence</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="home-no-predictions">
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