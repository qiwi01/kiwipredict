import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { Users, UserCheck, Shield, BarChart3, Settings, Plus, Calendar, Trophy, Target, Gamepad2, Star, LogOut, CheckCircle, Mail, Crown, Zap } from 'lucide-react';
import api from '../utils/api';
import Modal from '../components/Modal';
import ThemeToggle from '../components/ThemeToggle';
import '../css/Admin.css';

const Admin = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [bets, setBets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [activeGamesSection, setActiveGamesSection] = useState(null);
  const [gameSearchTerm, setGameSearchTerm] = useState('');
  const [leagues, setLeagues] = useState([]);
  const [newLeague, setNewLeague] = useState({ name: '', code: '', country: '', teams: [] });
  const [newTeamToAdd, setNewTeamToAdd] = useState({ name: '', code: '', founded: '', stadium: '' });
  const [selectedLeagueForTeams, setSelectedLeagueForTeams] = useState('');
  const [newGame, setNewGame] = useState({
    homeTeam: '',
    awayTeam: '',
    league: '',
    date: '',
    time: '',
    gameTier: 'none',
    predictions: []
  });
  const [selectedOutcomes, setSelectedOutcomes] = useState({});
  const [outcomeSearchTerm, setOutcomeSearchTerm] = useState('');
  const [broadcastEmail, setBroadcastEmail] = useState({ subject: '', message: '' });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [vipPayments, setVipPayments] = useState([]);
  const [bookingCodes, setBookingCodes] = useState([]);
  const [bookingCodeForm, setBookingCodeForm] = useState({
    bookmaker: 'sportybet',
    code: '',
    odds: '',
    title: '',
    description: '',
    isActive: true,
    validUntil: ''
  });
  const [siteSettings, setSiteSettings] = useState({
    announcements: {
      enabled: true,
      title: '',
      rotationSpeed: 3500,
      items: [
        { text: 'New Premier League season is here.', isActive: true }
      ]
    }
  });

  // Fixture/API state
  const [fixtureDate, setFixtureDate] = useState(new Date().toISOString().split('T')[0]);
  const [fixtures, setFixtures] = useState([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [fixturesError, setFixturesError] = useState('');
  const [apiConfigured, setApiConfigured] = useState(false);
  const [importingFixtures, setImportingFixtures] = useState(new Set());
  const [importingAll, setImportingAll] = useState(false);
  const [generatingWeeklyPredictions, setGeneratingWeeklyPredictions] = useState(false);
  const [weeklyPredictionSummary, setWeeklyPredictionSummary] = useState(null);

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'confirm', // 'confirm', 'prompt', 'alert'
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    initialValue: '',
    placeholder: '',
    inputType: 'text',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Dynamic teams organized by league from database
  const leagueTeams = leagues.reduce((acc, league) => {
    acc[league.name] = league.teams ? league.teams.map(team => team.name) : [];
    return acc;
  }, {});

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'dashboard') {
        const statsRes = await api.get('/api/admin/stats');
        setStats(statsRes.data);
      } else if (activeTab === 'leagues') {
        try {
          console.log('Fetching leagues...');
          const leaguesRes = await api.get('/api/leagues');
          console.log('Leagues response:', leaguesRes);
          console.log('Leagues data:', leaguesRes.data);
          const leaguesData = Array.isArray(leaguesRes.data) ? leaguesRes.data : [];
          console.log('Setting leagues data:', leaguesData);
          setLeagues(leaguesData);
          console.log('Leagues state set to:', leaguesData);
        } catch (error) {
          console.error('Failed to fetch leagues:', error);
          console.error('Error details:', error.response?.data);
          toast.error('Failed to load leagues');
          setLeagues([]);
        }
      } else if (activeTab === 'games') {
        const gamesRes = await api.get('/api/matches/admin');
        setGames(gamesRes.data);
      } else if (activeTab === 'users') {
        const usersRes = await api.get('/api/admin/users');
        setUsers(usersRes.data);
      } else if (activeTab === 'outcomes') {
        const gamesRes = await api.get('/api/matches/admin');
        setGames(gamesRes.data);
      } else if (activeTab === 'bets') {
        const betsRes = await api.get('/api/admin/bets');
        setBets(betsRes.data);
      } else if (activeTab === 'vip') {
        const [vipPaymentsRes, bookingCodesRes, usersRes] = await Promise.all([
          api.get('/api/vip/pending-payments'),
          api.get('/api/vip/admin/booking-codes'),
          api.get('/api/admin/users')
        ]);
        setVipPayments(vipPaymentsRes.data);
        setBookingCodes(bookingCodesRes.data);
        setUsers(usersRes.data);
      } else if (activeTab === 'settings') {
        const settingsRes = await api.get('/api/site-settings');
        setSiteSettings(settingsRes.data);
      }
    } catch (err) {
      console.log(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const predictionTypeOptions = [
    { value: 'win', label: 'Win' },
    { value: 'over15', label: 'Over/Under 1.5' },
    { value: 'over25', label: 'Over/Under 2.5' },
    { value: 'over35', label: 'Over/Under 3.5' },
    { value: 'corners', label: 'Corners' },
    { value: 'ggng', label: 'GG/NG' },
    { value: 'others', label: 'Others' },
    { value: 'player', label: 'Player' }
  ];

  const predictionVisibilityOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'vip', label: 'VIP Users Only' },
    { value: 'vvip', label: 'VVIP Users Only' },
    { value: 'both', label: 'VIP & VVIP Users' }
  ];

  const predictionFormFields = [
    {
      name: 'type',
      label: 'Prediction Type',
      type: 'select',
      options: predictionTypeOptions
    },
    {
      name: 'prediction',
      label: 'Prediction',
      type: 'text',
      placeholder: 'Example: Over 2.5, Under 2.5, Home Win, BTTS Yes'
    },
    {
      name: 'confidence',
      label: 'Confidence (%)',
      type: 'number',
      placeholder: '0-100'
    },
    {
      name: 'visibility',
      label: 'Visibility',
      type: 'select',
      options: predictionVisibilityOptions
    }
  ];

  const getPredictionTypeLabel = (type) => {
    const option = predictionTypeOptions.find((item) => item.value === type);
    return option ? option.label.toUpperCase() : 'PREDICTION';
  };

  const getPredictionVisibilityLabel = (visibility = 'all') => {
    const option = predictionVisibilityOptions.find((item) => item.value === visibility);
    return option ? option.label : 'All Users';
  };

  const editPrediction = (game, pred, predIndex) => {
    setModal({
      isOpen: true,
      type: 'form',
      title: `Edit Prediction - ${game.homeTeam.name} vs ${game.awayTeam.name}`,
      confirmText: 'Save Changes',
      cancelText: 'Cancel',
      formData: {
        type: pred.type,
        prediction: pred.prediction,
        confidence: pred.confidence,
        visibility: pred.visibility || 'all'
      },
      formFields: predictionFormFields,
      onConfirm: async (formData) => {
        try {
          const response = await api.put(`/api/outcomes/${game.id}/prediction/${predIndex}`, {
            type: formData.type,
            prediction: formData.prediction,
            confidence: parseInt(formData.confidence, 10) || pred.confidence,
            visibility: formData.visibility
          });

          if (response.data.success) {
            toast.success('Prediction updated successfully');
            fetchData();
          } else {
            toast.error('Failed to update prediction');
          }
        } catch (err) {
          console.error('Prediction update error:', err);
          toast.error(err.response?.data?.error || 'Error updating prediction');
        }
      }
    });
  };

  const deletePrediction = (game, pred, predIndex) => {
    showConfirm(
      'Delete Prediction',
      `Delete prediction "${pred.prediction}" from ${game.homeTeam.name} vs ${game.awayTeam.name}?`,
      async () => {
        try {
          const response = await api.delete(`/api/outcomes/${game.id}/prediction/${predIndex}`);

          if (response.data.success) {
            toast.success('Prediction deleted successfully');
            fetchData();
          } else {
            toast.error('Failed to delete prediction');
          }
        } catch (err) {
          toast.error(err.response?.data?.error || 'Error deleting prediction');
        }
      }
    );
  };

  const updateUserRole = async (userId, role) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { role });
      toast.success('User role updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { isActive });
      toast.success('User status updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const deleteUser = async (userId) => {
    showConfirm(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      async () => {
        try {
          await api.delete(`/api/admin/users/${userId}`);
          toast.success('User deleted');
          fetchData();
        } catch (err) {
          toast.error('Failed to delete user');
        }
      }
    );
  };

  const updateBetResult = async (userId, betId, result) => {
    try {
      await api.put(`/api/admin/bets/${userId}/${betId}`, { result });
      toast.success('Bet result updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update bet');
    }
  };

  const handleMarkOutcome = async (matchId, predictionType, prediction, actualResult) => {
    // Create a unique key for this prediction outcome
    const outcomeKey = `${matchId}-${predictionType}-${prediction}`;

    try {
      await api.put(`/api/outcomes/${matchId}/outcome`, {
        predictionType,
        prediction,
        actualResult
      });

      // Update local state to reflect the selection
      setSelectedOutcomes(prev => ({
        ...prev,
        [outcomeKey]: actualResult
      }));

      toast.success(`Prediction marked as ${actualResult === 'win' ? 'correct' : 'incorrect'}`);
      fetchData(); // Refresh the data
    } catch (error) {
      toast.error('Failed to mark outcome');
    }
  };

  const filteredOutcomeGames = games.filter(game => {
    if (!outcomeSearchTerm.trim()) return true;
    const term = outcomeSearchTerm.trim().toLowerCase();
    return game.homeTeam?.name?.toLowerCase().includes(term) ||
      game.awayTeam?.name?.toLowerCase().includes(term) ||
      game.competition?.name?.toLowerCase().includes(term) ||
      game.league?.toLowerCase().includes(term);
  });

  const filteredGames = games.filter(game => {
    if (!gameSearchTerm.trim()) return true;
    const term = gameSearchTerm.trim().toLowerCase();
    return game.homeTeam?.name?.toLowerCase().includes(term) ||
      game.awayTeam?.name?.toLowerCase().includes(term) ||
      game.competition?.name?.toLowerCase().includes(term) ||
      game.league?.toLowerCase().includes(term) ||
      game.predictionBatchId?.toLowerCase().includes(term);
  });

  const handleSendBroadcastEmail = async (event) => {
    event.preventDefault();
    if (!broadcastEmail.subject.trim() || !broadcastEmail.message.trim()) {
      toast.error('Enter an email subject and message');
      return;
    }

    setSendingBroadcast(true);
    try {
      let response;
      try {
        response = await api.post('/api/admin/email-users', broadcastEmail);
      } catch (err) {
        if (err.response?.status !== 404) throw err;
        response = await api.post('/api/admin/broadcast-email', broadcastEmail);
      }
      toast.success(response.data.message || 'Email sent to users');
      setBroadcastEmail({ subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send email');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const renderBroadcastEmailForm = (description = 'Send an announcement to every active user with an email address.') => (
    <form className="admin-broadcast-card" onSubmit={handleSendBroadcastEmail}>
      <h4><Mail className="admin-icon-inline" /> Email all users</h4>
      <p className="admin-section-description">{description}</p>
      <input
        type="text"
        value={broadcastEmail.subject}
        onChange={(e) => setBroadcastEmail(prev => ({ ...prev, subject: e.target.value }))}
        className="admin-search-input"
        placeholder="Email subject"
      />
      <textarea
        value={broadcastEmail.message}
        onChange={(e) => setBroadcastEmail(prev => ({ ...prev, message: e.target.value }))}
        className="admin-broadcast-textarea"
        placeholder="Write your message to all users..."
        rows="4"
      />
      <button type="submit" className="admin-action-btn primary" disabled={sendingBroadcast}>
        {sendingBroadcast ? 'Sending...' : 'Send Email to All Users'}
      </button>
    </form>
  );

  const handleGenerateWeeklyPredictions = async (overwrite = false) => {
    setGeneratingWeeklyPredictions(true);
    setWeeklyPredictionSummary(null);

    try {
      const response = await api.post('/api/admin/generate-weekly-predictions', { overwrite });
      setWeeklyPredictionSummary(response.data.summary);
      toast.success(response.data.message || 'Weekly semi-AI predictions generated');
      if (activeTab === 'games') fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate weekly predictions');
    } finally {
      setGeneratingWeeklyPredictions(false);
    }
  };

  const handleDeleteGeneratedWeek = () => {
    showConfirm(
      'Delete Generated Week',
      'Delete all semi-AI generated matches and predictions for the current/upcoming week? Manual matches will be kept.',
      async () => {
        setGeneratingWeeklyPredictions(true);
        try {
          const response = await api.delete('/api/admin/generated-weekly-predictions');
          toast.success(response.data.message || 'Generated week deleted');
          setWeeklyPredictionSummary(null);
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete generated week');
        } finally {
          setGeneratingWeeklyPredictions(false);
        }
      }
    );
  };

  const handleDeleteMatch = (game) => {
    showConfirm(
      'Delete Match',
      `Delete ${game.homeTeam.name} vs ${game.awayTeam.name}? This will also delete all predictions for this match.`,
      async () => {
        try {
          const response = await api.delete(`/api/matches/${game.id}`);
          toast.success(response.data.message || 'Match deleted successfully');
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete match');
        }
      }
    );
  };

  const handlePredictionReviewAction = async (gameId, action) => {
    try {
      const endpoint = action === 'approve' ? 'approve' : 'unpublish';
      const response = await api.put(`/api/matches/${gameId}/predictions/${endpoint}`);
      toast.success(response.data.message || 'Prediction status updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update prediction status');
    }
  };

  const getPredictionStatusLabel = (status) => {
    if (status === 'pending_review') return 'Pending Admin Review';
    if (status === 'approved') return 'Published';
    if (status === 'unpublished') return 'Unpublished';
    return 'Manual / Published';
  };

  // Fetch fixtures from API
  const fetchFixtures = async (date) => {
    const targetDate = date || fixtureDate;
    setLoadingFixtures(true);
    setFixturesError('');

    try {
      const response = await api.get(`/api/fixtures/today?date=${targetDate}`);
      setFixtures(response.data.fixtures || []);
      setApiConfigured(Boolean(response.data.apiConfigured));
      console.log(`[Admin] Loaded ${response.data.count} fixtures from API`);
    } catch (err) {
      console.error('[Admin] Failed to fetch fixtures:', err);
      setFixturesError(err.response?.data?.error || 'Failed to fetch fixtures from API');
      setFixtures([]);
    } finally {
      setLoadingFixtures(false);
    }
  };

  // Import a single fixture as a match
  const importSingleFixture = async (fixture) => {
    setImportingFixtures(prev => new Set([...prev, fixture.id]));

    try {
      const response = await api.post('/api/fixtures/import', { fixture });
      toast.success(response.data.message || `Imported "${fixture.homeTeam} vs ${fixture.awayTeam}"`);

      // Mark as imported in local state
      setFixtures(prev => prev.map(f =>
        f.id === fixture.id ? { ...f, imported: true } : f
      ));

      // Refresh games list
      fetchData();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('This fixture already exists in the database');
        // Mark as imported even if conflict
        setFixtures(prev => prev.map(f =>
          f.id === fixture.id ? { ...f, imported: true } : f
        ));
      } else {
        toast.error(err.response?.data?.error || 'Failed to import fixture');
      }
    } finally {
      setImportingFixtures(prev => {
        const next = new Set(prev);
        next.delete(fixture.id);
        return next;
      });
    }
  };

  // Import all non-imported fixtures
  const importAllFixtures = async () => {
    const toImport = fixtures.filter(f => !f.imported);

    if (toImport.length === 0) {
      toast.success('All fixtures already imported');
      return;
    }

    setImportingAll(true);
    const toastId = toast.loading(`Importing ${toImport.length} fixtures...`);

    try {
      const response = await api.post('/api/fixtures/import-batch', { fixtures: toImport });
      toast.dismiss(toastId);

      const message = response.data.message || 'Import completed';
      toast.success(message);

      // Mark all as imported in local state
      setFixtures(prev => prev.map(f => ({ ...f, imported: true })));

      // Refresh games list
      fetchData();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || 'Failed to import fixtures');
    } finally {
      setImportingAll(false);
    }
  };

  // Modal helper functions
  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm,
      onCancel
    });
  };

  const saveBookingCode = async () => {
    if (!bookingCodeForm.code || !bookingCodeForm.odds) {
      toast.error('Booking code and odds are required');
      return;
    }

    try {
      await api.post('/api/vip/admin/booking-codes', {
        ...bookingCodeForm,
        odds: Number(bookingCodeForm.odds),
        validUntil: bookingCodeForm.validUntil || null
      });
      toast.success('Booking code saved');
      setBookingCodeForm({ bookmaker: 'sportybet', code: '', odds: '', title: '', description: '', isActive: true, validUntil: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save booking code');
    }
  };

  const toggleBookingCode = async (bookingCode) => {
    try {
      await api.put(`/api/vip/admin/booking-codes/${bookingCode._id}`, { isActive: !bookingCode.isActive });
      toast.success('Booking code updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update booking code');
    }
  };

  const deleteBookingCode = async (bookingCode) => {
    showConfirm('Delete Booking Code', `Delete booking code ${bookingCode.code}?`, async () => {
      try {
        await api.delete(`/api/vip/admin/booking-codes/${bookingCode._id}`);
        toast.success('Booking code deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete booking code');
      }
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-access-denied">
        <div className="admin-access-denied-content">
          <Shield className="admin-access-denied-icon" />
          <h2 className="admin-access-denied-title">Access Denied</h2>
          <p className="admin-access-denied-message">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'outcomes', label: 'Manage Outcomes', icon: CheckCircle },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'vip', label: 'VIP Management', icon: Star },
    { id: 'email', label: 'Send Email', icon: Mail },
    { id: 'leagues', label: 'Leagues & Teams', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const gamesSections = [
    { id: 'generate', title: 'Generate Weekly AI Predictions', description: 'Create reviewed AI predictions for the current week.', icon: Target },
    { id: 'fetch', title: 'Fetch Matches from API', description: 'Load fixtures from Football-data.org by date.', icon: Calendar },
    { id: 'bulk', title: 'Bulk Import Matches', description: 'Paste many fixtures and import them at once.', icon: Plus },
    { id: 'add', title: 'Add New Game', description: 'Create one match manually with predictions.', icon: Calendar },
    { id: 'recent', title: 'Recent Games', description: 'Review, approve, search, edit, or delete existing matches.', icon: Gamepad2 }
  ];

  const updateAnnouncementItem = (index, field, value) => {
    setSiteSettings(prev => ({
      ...prev,
      announcements: {
        ...prev.announcements,
        items: prev.announcements.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const addAnnouncementItem = () => {
    setSiteSettings(prev => ({
      ...prev,
      announcements: {
        ...prev.announcements,
        items: [...(prev.announcements.items || []), { text: '', isActive: true }]
      }
    }));
  };

  const removeAnnouncementItem = (index) => {
    setSiteSettings(prev => ({
      ...prev,
      announcements: {
        ...prev.announcements,
        items: prev.announcements.items.filter((_, itemIndex) => itemIndex !== index)
      }
    }));
  };

  const saveAnnouncementSettings = async () => {
    try {
      const response = await api.put('/api/site-settings/announcements', siteSettings.announcements);
      setSiteSettings(response.data);
      toast.success('Announcement banner settings updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update banner settings');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1 className="admin-title">
              Admin Panel
            </h1>
            <p className="admin-subtitle">
              Manage users, predictions, and system statistics
            </p>
          </div>
          <div className="admin-header-actions">
            <ThemeToggle />
            <button onClick={logout} className="admin-logout-btn">
              <LogOut className="admin-logout-icon" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <div className="admin-tabs-container">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`admin-tab-btn ${activeTab === id ? 'active' : ''}`}
            >
              <Icon className="admin-tab-icon" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="admin-dashboard">
          {loading ? (
            <div className="predictions-loading">
              <div className="predictions-loading-spinner"></div>
              <div className="predictions-loading-text">
                <div className="predictions-loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Loading dashboard...
              </div>
            </div>
          ) : stats ? (
            <>
              {/* Stats Cards */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <Users className="admin-stat-icon users" />
                  <div className="admin-stat-value">{stats.totalUsers}</div>
                  <div className="admin-stat-label">Total Users</div>
                </div>

                <div className="admin-stat-card">
                  <UserCheck className="admin-stat-icon active" />
                  <div className="admin-stat-value">{stats.activeUsers}</div>
                  <div className="admin-stat-label">Active Users</div>
                </div>

                <div className="admin-stat-card">
                  <Trophy className="admin-stat-icon bets" />
                  <div className="admin-stat-value">{leagues.length}</div>
                  <div className="admin-stat-label">Leagues</div>
                </div>

                <div className="admin-stat-card">
                  <Gamepad2 className="admin-stat-icon profit" />
                  <div className="admin-stat-value">{games.length}</div>
                  <div className="admin-stat-label">Total Games</div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="admin-overview-grid">
                <div className="admin-overview-card">
                  <h3 className="admin-overview-title">Prediction Performance</h3>
                  <div className="admin-overview-stats">
                    <div className="admin-overview-stat">
                      <span className="admin-overview-label">Active Admins</span>
                      <span className="admin-overview-value">{stats.adminUsers}</span>
                    </div>
                    <div className="admin-overview-stat">
                      <span className="admin-overview-label">Correct Outcomes</span>
                      <span className="admin-overview-value">{stats.correctOutcomes || 0}</span>
                    </div>
                    <div className="admin-overview-stat">
                      <span className="admin-overview-label">Loss Outcomes</span>
                      <span className="admin-overview-value">{stats.lossOutcomes || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="admin-overview-card">
                  <h3 className="admin-overview-title">Quick Actions</h3>
                  <div className="admin-quick-actions">
                    <button
                      onClick={() => setActiveTab('users')}
                      className="admin-action-btn primary"
                    >
                      Manage Users
                    </button>
                    <button
                      onClick={() => setActiveTab('games')}
                      className="admin-action-btn success"
                    >
                      Add Games
                    </button>
                    <button
                      onClick={() => handleGenerateWeeklyPredictions(false)}
                      className="admin-action-btn primary"
                      disabled={generatingWeeklyPredictions}
                    >
                      {generatingWeeklyPredictions ? 'Generating...' : 'Generate Weekly AI'}
                    </button>
                    <button
                      onClick={() => setActiveTab('outcomes')}
                      className="admin-action-btn warning"
                    >
                      Manage Outcomes
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Leagues & Teams Management */}
      {activeTab === 'leagues' && (
        <div className="admin-leagues-section">
          {/* Create New League */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Trophy className="admin-icon-inline" />
              Create New League
            </h3>
            <form className="admin-form">
              <div className="admin-form-grid-2">
                <div className="admin-form-group">
                  <label className="admin-form-label">League Name</label>
                  <input
                    type="text"
                    value={newLeague.name}
                    onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                    className="admin-form-input"
                    placeholder="e.g., Premier League"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Country</label>
                  <input
                    type="text"
                    value={newLeague.country}
                    onChange={(e) => setNewLeague({ ...newLeague, country: e.target.value })}
                    className="admin-form-input"
                    placeholder="e.g., England"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!newLeague.name || !newLeague.country) {
                    toast.error('Please fill in league name and country');
                    return;
                  }

                  try {
                    const response = await api.post('/api/leagues', {
                      name: newLeague.name.trim(),
                      code: newLeague.name.substring(0, 3).toUpperCase(),
                      country: newLeague.country.trim()
                    });

                    toast.success(`League "${newLeague.name}" created successfully!`);
                    setNewLeague({ name: '', code: '', country: '', teams: [] });
                    fetchData(); // Refresh leagues list
                  } catch (err) {
                    console.error('League creation error:', err);
                    const errorMessage = err.response?.data?.error || err.message || 'Failed to create league';
                    toast.error(errorMessage);
                  }
                }}
                className="admin-btn-success"
              >
                Create League
              </button>
            </form>
          </div>

          {/* Bulk Import Teams */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Plus className="admin-icon-inline" />
              Bulk Import Teams
            </h3>
            <form className="admin-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Select League for Teams</label>
                <select
                  value={selectedLeagueForTeams}
                  onChange={(e) => setSelectedLeagueForTeams(e.target.value)}
                  className="admin-form-select"
                >
                  <option value="">Select League</option>
                  {leagues && leagues.length > 0 ? leagues.map(league => (
                    <option key={league._id} value={league._id}>
                      {league.name} ({league.teams?.length || 0} teams)
                    </option>
                  )) : (
                    <option value="" disabled>No leagues available</option>
                  )}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Teams List</label>
                <textarea
                  value={newTeamToAdd.name}
                  onChange={(e) => setNewTeamToAdd({ ...newTeamToAdd, name: e.target.value })}
                  className="admin-form-textarea"
                  placeholder="Enter team names, one per line:
Manchester United
Liverpool FC
Chelsea FC
Arsenal FC
..."
                  rows="10"
                />
                <p className="admin-form-help">Enter one team name per line. Team codes will be auto-generated from the first 3 letters of each team name.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedLeagueForTeams || !newTeamToAdd.name.trim()) {
                    toast.error('Please select a league and enter team names');
                    return;
                  }

                  const teamNames = newTeamToAdd.name
                    .split('\n')
                    .map(name => name.trim())
                    .filter(name => name.length > 0);

                  if (teamNames.length === 0) {
                    toast.error('Please enter at least one team name');
                    return;
                  }

                  try {
                    // Show progress
                    toast.loading(`Adding ${teamNames.length} teams...`);

                    // Add teams one by one to show progress
                    let successCount = 0;
                    let errorCount = 0;

                    for (const teamName of teamNames) {
                      try {
                        await api.post(`/api/leagues/${selectedLeagueForTeams}/teams`, {
                          name: teamName,
                          code: teamName.substring(0, 3).toUpperCase(),
                          founded: 1900,
                          stadium: `${teamName} Stadium`
                        });
                        successCount++;
                      } catch (err) {
                        errorCount++;
                        console.error(`Failed to add team ${teamName}:`, err);
                      }
                    }

                    // Update state
                    const updatedLeagues = leagues.map(league =>
                      league._id === selectedLeagueForTeams
                        ? { ...league, teams: [...(league.teams || []), ...teamNames.map(name => ({
                            name: name,
                            code: name.substring(0, 3).toUpperCase()
                          }))] }
                        : league
                    );
                    setLeagues(updatedLeagues);

                    // Show final result
                    toast.dismiss();
                    if (errorCount === 0) {
                      toast.success(`Successfully added ${successCount} teams to ${leagues.find(l => l._id === selectedLeagueForTeams)?.name}!`);
                    } else {
                      toast.success(`Added ${successCount} teams successfully. ${errorCount} failed.`);
                    }

                    setNewTeamToAdd({ name: '', code: '', founded: '', stadium: '' });
                    setSelectedLeagueForTeams(''); // Clear selection
                  } catch (err) {
                    toast.dismiss();
                    toast.error('Failed to import teams');
                  }
                }}
                className="admin-btn-warning"
              >
                Import {newTeamToAdd.name.trim().split('\n').filter(name => name.trim()).length > 0 ? `(${newTeamToAdd.name.trim().split('\n').filter(name => name.trim()).length} teams)` : ''} Teams
              </button>
            </form>
          </div>

          {/* Add Single Team to League */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Plus className="admin-icon-inline" />
              Add Single Team to League
            </h3>
            <form className="admin-form">
              <div className="admin-form-grid-3">
                <div className="admin-form-group">
                  <label className="admin-form-label">Select League</label>
                  <select
                    value={selectedLeagueForTeams}
                    onChange={(e) => setSelectedLeagueForTeams(e.target.value)}
                    className="admin-form-select"
                  >
                    <option value="">Select League</option>
                    {leagues && leagues.length > 0 ? leagues.map(league => (
                      <option key={league._id} value={league._id}>
                        {league.name} ({league.teams?.length || 0} teams)
                      </option>
                    )) : (
                      <option value="" disabled>No leagues available</option>
                    )}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Team Name</label>
                  <input
                    type="text"
                    value={newTeamToAdd.name}
                    onChange={(e) => setNewTeamToAdd({ ...newTeamToAdd, name: e.target.value })}
                    className="admin-form-input"
                    placeholder="e.g., Manchester United"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Team Code</label>
                  <input
                    type="text"
                    value={newTeamToAdd.code}
                    onChange={(e) => setNewTeamToAdd({ ...newTeamToAdd, code: e.target.value.toUpperCase() })}
                    className="admin-form-input"
                    placeholder="e.g., MUN"
                    maxLength="3"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedLeagueForTeams || !newTeamToAdd.name) {
                    toast.error('Please select a league and enter team name');
                    return;
                  }

                  try {
                    const response = await api.post(`/api/leagues/${selectedLeagueForTeams}/teams`, {
                      name: newTeamToAdd.name,
                      code: newTeamToAdd.code,
                      founded: 1900, // Default founded year
                      stadium: `${newTeamToAdd.name} Stadium` // Default stadium
                    });

                    const addedTeam = response.data;

                    toast.success(`Team "${newTeamToAdd.name}" added to league successfully!`);
                    setNewTeamToAdd({ name: '', code: '', founded: '', stadium: '' });

                    // Update leagues state directly to show the new team immediately
                    const updatedLeagues = leagues.map(league =>
                      league._id === selectedLeagueForTeams
                        ? { ...league, teams: [...(league.teams || []), addedTeam] }
                        : league
                    );
                    setLeagues(updatedLeagues);
                    setSelectedLeagueForTeams(''); // Clear selection
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to add team');
                  }
                }}
                className="admin-btn-warning"
              >
                Add Team
              </button>
            </form>
          </div>

          {/* Existing Leagues */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Trophy className="admin-icon-inline" />
              Existing Leagues & Teams
            </h3>

            {leagues.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-text">No leagues created yet</div>
                <div className="admin-empty-subtitle">Use the form above to create your first league</div>
              </div>
            ) : (
              <div className="admin-leagues-list">
                {leagues.map((league, index) => (
                  <div key={league._id || index} className="admin-league-card">
                    <div className="admin-league-header">
                      <div className="admin-league-info">
                        <h4 className="admin-league-name">
                          {league.name} ({league.code})
                        </h4>
                        <p className="admin-league-country">{league.country}</p>
                      </div>
                      <div className="admin-league-stats">
                        <span className="admin-league-team-count">
                          {league.teams?.length || 0} teams
                        </span>
                      </div>
                    </div>

                    <div className="admin-league-teams">
                      {league.teams && league.teams.length > 0 ? (
                        <div className="admin-teams-grid">
                          {league.teams.map((team, teamIndex) => (
                            <div key={teamIndex} className="admin-team-item">
                              <div className="admin-team-info">
                                <span className="admin-team-name">{team.name}</span>
                                {team.code && (
                                  <span className="admin-team-code">({team.code})</span>
                                )}
                              </div>
                              <button
                                onClick={() => showConfirm(
                                  'Remove Team',
                                  `Are you sure you want to remove ${team.name} from ${league.name}?`,
                                  async () => {
                                    try {
                                      await api.delete(`/api/leagues/${league._id}/teams/${teamIndex}`);
                                      toast.success('Team removed successfully');
                                      fetchData();
                                    } catch (err) {
                                      toast.error('Failed to remove team');
                                    }
                                  }
                                )}
                                className="admin-team-remove-btn"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="admin-no-teams">
                          <span>No teams added yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Games Management */}
      {activeTab === 'games' && (
        <div className="admin-games-section">
          <div className="admin-games-menu">
            {gamesSections.map(({ id, title, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`admin-games-menu-btn ${activeGamesSection === id ? 'active' : ''}`}
                onClick={() => setActiveGamesSection(activeGamesSection === id ? null : id)}
              >
                <Icon className="admin-games-menu-icon" />
                <span className="admin-games-menu-content">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </button>
            ))}
          </div>

          {!activeGamesSection && (
            <div className="admin-empty-state">
              <div className="admin-empty-text">Choose a games action</div>
              <div className="admin-empty-subtitle">Use the buttons above to open Fetch Matches, Bulk Import, Add Game, Recent Games, or Weekly AI generation.</div>
            </div>
          )}

          {/* Semi-AI Weekly Generator */}
          {activeGamesSection === 'generate' && <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Target className="admin-icon-inline" />
              Semi-AI Weekly Prediction Generator
            </h3>
            <p className="admin-section-description">
              Fetch fixtures for the next 7 days from Football-data.org, generate Poisson-based semi-AI predictions, and save them for admin review.
            </p>
            <div className="admin-quick-actions">
              <button
                type="button"
                onClick={() => handleGenerateWeeklyPredictions(false)}
                className="admin-action-btn primary"
                disabled={generatingWeeklyPredictions}
              >
                {generatingWeeklyPredictions ? 'Generating Weekly Predictions...' : 'Generate Weekly AI Predictions'}
              </button>
              <button
                type="button"
                onClick={handleDeleteGeneratedWeek}
                className="admin-action-btn danger"
                disabled={generatingWeeklyPredictions}
              >
                Delete Generated Week
              </button>
            </div>

            {weeklyPredictionSummary && (
              <div className="admin-ai-summary">
                <div><strong>Batch:</strong> {weeklyPredictionSummary.batchId}</div>
                <div><strong>Date range:</strong> {weeklyPredictionSummary.from} to {weeklyPredictionSummary.to}</div>
                <div className="admin-ai-summary-grid">
                  <span>Fixtures: {weeklyPredictionSummary.fixturesFound}</span>
                  <span>Created: {weeklyPredictionSummary.created}</span>
                  <span>Updated: {weeklyPredictionSummary.updated}</span>
                  <span>Skipped: {weeklyPredictionSummary.skipped}</span>
                  <span>Predictions: {weeklyPredictionSummary.predictionsGenerated}</span>
                  <span>Errors: {weeklyPredictionSummary.errors}</span>
                </div>
              </div>
            )}
          </div>}

          {/* Fetch Matches from API */}
          {activeGamesSection === 'fetch' && <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Calendar className="admin-icon-inline" />
              Fetch Matches from API
            </h3>
            <form className="admin-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Select Date</label>
                <div className="admin-form-inline">
                  <input
                    type="date"
                    value={fixtureDate}
                    onChange={(e) => setFixtureDate(e.target.value)}
                    className="admin-form-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => fetchFixtures(fixtureDate)}
                    disabled={loadingFixtures}
                    className="admin-btn-primary"
                    style={{ marginLeft: '10px' }}
                  >
                    {loadingFixtures ? 'Loading...' : 'Fetch Matches'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setFixtureDate(today);
                      fetchFixtures(today);
                    }}
                    disabled={loadingFixtures}
                    className="admin-btn-secondary"
                    style={{ marginLeft: '10px' }}
                  >
                    Today
                  </button>
                </div>
                <p className="admin-form-help">
                  {apiConfigured 
                    ? 'Connected to Football-data.org API' 
                    : 'Football-data.org API key is not configured. No fallback matches are shown.'}
                </p>
              </div>

              {fixturesError && (
                <div className="admin-error-message">
                  {fixturesError}
                </div>
              )}

              {fixtures.length > 0 && (
                <div className="admin-fixtures-list">
                  <div className="admin-fixtures-header">
                    <h4>Available Matches ({fixtures.length})</h4>
                    <div className="admin-fixtures-actions">
                      <button
                        type="button"
                        onClick={importAllFixtures}
                        disabled={importingAll}
                        className="admin-btn-success"
                      >
                        {importingAll ? 'Importing...' : 'Import All'}
                      </button>
                    </div>
                  </div>
                  <div className="admin-fixtures-grid">
                    {fixtures.map((fixture) => (
                      <div key={fixture.id} className={`admin-fixture-card ${fixture.imported ? 'imported' : ''}`}>
                        <div className="admin-fixture-teams">
                          <div className="admin-fixture-team">
                            {fixture.homeCrest && (
                              <img src={fixture.homeCrest} alt="" className="admin-fixture-crest" />
                            )}
                            <span>{fixture.homeTeam}</span>
                          </div>
                          <div className="admin-fixture-vs">vs</div>
                          <div className="admin-fixture-team">
                            {fixture.awayCrest && (
                              <img src={fixture.awayCrest} alt="" className="admin-fixture-crest" />
                            )}
                            <span>{fixture.awayTeam}</span>
                          </div>
                        </div>
                        <div className="admin-fixture-info">
                          <span className="admin-fixture-competition">{fixture.competition}</span>
                          <span className="admin-fixture-time">
                            {new Date(fixture.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="admin-fixture-actions">
                          {fixture.imported ? (
                            <span className="admin-fixture-imported-badge">✓ Imported</span>
                          ) : (
                            <div className="admin-fixture-action-btns">
                              <button
                                type="button"
                                onClick={() => importSingleFixture(fixture)}
                                disabled={importingFixtures.has(fixture.id)}
                                className="admin-btn-primary small"
                              >
                                {importingFixtures.has(fixture.id) ? '...' : 'Import'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Pre-fill the add game form with this fixture's data
                                  const matchDate = new Date(fixture.utcDate);
                                  setNewGame({
                                    homeTeam: fixture.homeTeam,
                                    awayTeam: fixture.awayTeam,
                                    league: fixture.competition,
                                    date: matchDate.toISOString().split('T')[0],
                                    time: matchDate.toTimeString().slice(0, 5),
                                    predictions: []
                                  });
                                  // Scroll to the add game form
                                  document.querySelector('.admin-data-card:nth-child(3)')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="admin-btn-secondary small"
                              >
                                Add Predictions
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loadingFixtures && fixtures.length === 0 && !fixturesError && (
                <div className="admin-empty-state">
                  <div className="admin-empty-text">
                    {apiConfigured ? 'No fixtures found for this date' : 'Football API key is not configured'}
                  </div>
                  <div className="admin-empty-subtitle">
                    {apiConfigured
                      ? 'Try selecting a different date or check back later.'
                      : 'Add FOOTBALL_API_KEY on the backend host to load real football-data.org fixtures.'}
                  </div>
                </div>
              )}
            </form>
          </div>}

          {/* Bulk Import Matches */}
          {activeGamesSection === 'bulk' && <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Plus className="admin-icon-inline" />
              Bulk Import Matches
            </h3>
            <form className="admin-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Select League</label>
                <select
                  value={newGame.league}
                  onChange={(e) => setNewGame({ ...newGame, league: e.target.value })}
                  className="admin-form-select"
                >
                  <option value="">Select League</option>
                  {leagues && leagues.length > 0 ? leagues.map(league => (
                    <option key={league._id} value={league.name}>
                      {league.name} ({league.country})
                    </option>
                  )) : (
                    <option value="" disabled>No leagues available</option>
                  )}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Game Tier</label>
                <select
                  value={newGame.gameTier}
                  onChange={(e) => setNewGame({ ...newGame, gameTier: e.target.value })}
                  className="admin-form-select"
                >
                  <option value="none">Free / All Users</option>
                  <option value="vip">VIP Only</option>
                  <option value="vvip">VVIP Only</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Matches List</label>
                <textarea
                  value={newGame.homeTeam} // Using homeTeam field temporarily for bulk input
                  onChange={(e) => setNewGame({ ...newGame, homeTeam: e.target.value })}
                  className="admin-form-textarea"
                  placeholder="Enter matches, one per line:
Home Team vs Away Team | Date (YYYY-MM-DD) | Time (HH:MM)
Manchester United vs Liverpool FC | 2024-03-15 | 15:00
Chelsea FC vs Arsenal FC | 2024-03-16 | 17:30
..."
                  rows="10"
                />
                <p className="admin-form-help">Format: Home Team vs Away Team | Date (YYYY-MM-DD) | Time (HH:MM). All teams must exist in the selected league.</p>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Default Prediction</label>
                <div className="admin-form-grid-3">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Type</label>
                    <select
                      value={newGame.awayTeam} // Using awayTeam field temporarily for bulk prediction type
                      onChange={(e) => setNewGame({ ...newGame, awayTeam: e.target.value })}
                      className="admin-form-select"
                    >
                      <option value="win">Win</option>
                      <option value="over15">Over 1.5</option>
                      <option value="over25">Over 2.5</option>
                      <option value="corners">Corners</option>
                      <option value="ggng">GG/NG</option>
                      <option value="others">Others</option>
                      <option value="player">Player</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Prediction</label>
                    <input
                      type="text"
                      value={newGame.date} // Using date field temporarily for bulk prediction value
                      onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
                      className="admin-form-input"
                      placeholder="e.g., 1, X, 2, Over 2.5"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Confidence (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newGame.time} // Using time field temporarily for bulk confidence
                      onChange={(e) => setNewGame({ ...newGame, time: e.target.value })}
                      className="admin-form-input"
                      placeholder="e.g., 75"
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!newGame.league || !newGame.homeTeam.trim()) {
                    toast.error('Please select a league and enter match data');
                    return;
                  }

                  const matchLines = newGame.homeTeam
                    .split(/\n|\t| {2,}/)
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                  if (matchLines.length === 0) {
                    toast.error('Please enter at least one match');
                    return;
                  }

                  // Validate all teams exist in the selected league
                  const selectedLeague = leagues.find(l => l.name === newGame.league);
                  if (!selectedLeague || !selectedLeague.teams || selectedLeague.teams.length === 0) {
                    toast.error('Selected league has no teams. Please add teams first.');
                    return;
                  }

                  const leagueTeamNames = selectedLeague.teams.map(team => team.name);
                  const invalidTeams = [];

                  for (const line of matchLines) {
                    // Skip empty lines
                    if (!line.trim()) continue;

                    const matchData = line.split('|').map(part => part.trim());
                    if (matchData.length >= 3) {
                      const teamsPart = matchData[0];
                      const vsIndex = teamsPart.indexOf(' vs ');
                      if (vsIndex !== -1) {
                        const homeTeam = teamsPart.substring(0, vsIndex).trim();
                        const awayTeam = teamsPart.substring(vsIndex + 4).trim();

                        if (!leagueTeamNames.includes(homeTeam)) {
                          invalidTeams.push(homeTeam);
                        }
                        if (!leagueTeamNames.includes(awayTeam)) {
                          invalidTeams.push(awayTeam);
                        }
                      }
                    }
                  }

                  if (invalidTeams.length > 0) {
                    toast.error(`Invalid teams found: ${[...new Set(invalidTeams)].join(', ')}. Please ensure all teams exist in the selected league.`);
                    return;
                  }

                  try {
                    // Show progress
                    toast.loading(`Adding ${matchLines.length} matches...`);

                    // Add matches one by one to show progress
                    let successCount = 0;
                    let errorCount = 0;

                    for (const line of matchLines) {
                      try {
                        const matchData = line.split('|').map(part => part.trim());
                        if (matchData.length >= 3) {
                          const teamsPart = matchData[0];
                          const vsIndex = teamsPart.indexOf(' vs ');
                          if (vsIndex !== -1) {
                            const homeTeam = teamsPart.substring(0, vsIndex).trim();
                            const awayTeam = teamsPart.substring(vsIndex + 4).trim();
                            const date = matchData[1];
                            const time = matchData[2];

                            // Validate date format
                            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                            if (!dateRegex.test(date)) {
                              throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
                            }

                            // Validate time format
                            const timeRegex = /^\d{2}:\d{2}$/;
                            if (!timeRegex.test(time)) {
                              throw new Error(`Invalid time format: ${time}. Expected HH:MM.`);
                            }

                            await api.post('/api/matches', {
                              homeTeam,
                              awayTeam,
                              league: newGame.league,
                              date,
                              time,
                              predictions: [{
                                type: newGame.awayTeam || 'win',
                                prediction: newGame.date || 'home',
                                confidence: parseInt(newGame.time) || 50,
                                visibility: 'all'
                              }],
                              gameTier: newGame.gameTier || 'none'
                            });
                            successCount++;
                          }
                        }
                      } catch (err) {
                        errorCount++;
                        console.error(`Failed to add match ${line}:`, err);
                      }
                    }

                    // Show final result
                    toast.dismiss();
                    if (errorCount === 0) {
                      toast.success(`Successfully added ${successCount} matches to ${newGame.league}!`);
                    } else {
                      toast.success(`Added ${successCount} matches successfully. ${errorCount} failed.`);
                    }

                    // Clear form
                    setNewGame({
                      homeTeam: '',
                      awayTeam: '',
                      league: '',
                      date: '',
                      time: '',
                      gameTier: 'none',
                      predictions: []
                    });
                    fetchData(); // Refresh games list
                  } catch (err) {
                    toast.dismiss();
                    toast.error('Failed to import matches');
                  }
                }}
                className="admin-btn-warning"
              >
                Import {newGame.homeTeam.trim().split('\n').filter(line => line.trim()).length > 0 ? `(${newGame.homeTeam.trim().split('\n').filter(line => line.trim()).length} matches)` : ''} Matches
              </button>
            </form>
          </div>}

          {/* Add Game Form */}
          {activeGamesSection === 'add' && <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Calendar className="admin-icon-inline" />
              Add New Game
            </h3>
            <form className="admin-form">
              {/* Match Details */}
              <div className="admin-form-grid-3">
                <div className="admin-form-group">
                  <label className="admin-form-label">Home Team</label>
                  <select
                    value={newGame.homeTeam}
                    onChange={(e) => setNewGame({ ...newGame, homeTeam: e.target.value })}
                    className="admin-form-select"
                  >
                    <option value="">Select Home Team</option>
                    {newGame.league && leagueTeams[newGame.league] ? (
                      leagueTeams[newGame.league].map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))
                    ) : (
                      <option value="" disabled>Please select a league first</option>
                    )}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Away Team</label>
                  <select
                    value={newGame.awayTeam}
                    onChange={(e) => setNewGame({ ...newGame, awayTeam: e.target.value })}
                    className="admin-form-select"
                  >
                    <option value="">Select Away Team</option>
                    {newGame.league && leagueTeams[newGame.league] ? (
                      leagueTeams[newGame.league].map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))
                    ) : (
                      <option value="" disabled>Please select a league first</option>
                    )}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">League</label>
                  <select
                    value={newGame.league}
                    onChange={(e) => {
                      // Clear selected teams when league changes
                      setNewGame({
                        ...newGame,
                        league: e.target.value,
                        homeTeam: '',
                        awayTeam: ''
                      });
                    }}
                    className="admin-form-select"
                  >
                    <option value="">Select League</option>
                    {leagues && leagues.length > 0 ? leagues.map(league => (
                      <option key={league._id} value={league.name}>
                        {league.name} ({league.country})
                      </option>
                    )) : (
                      <option value="" disabled>No leagues available</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Date and Time */}
              <div className="admin-form-grid-3">
                <div className="admin-form-group">
                  <label className="admin-form-label">Match Date</label>
                  <input
                    type="date"
                    value={newGame.date}
                    onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Match Time</label>
                  <input
                    type="time"
                    value={newGame.time}
                    onChange={(e) => setNewGame({ ...newGame, time: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Game Tier</label>
                  <select
                    value={newGame.gameTier}
                    onChange={(e) => setNewGame({ ...newGame, gameTier: e.target.value })}
                    className="admin-form-select"
                  >
                    <option value="none">Free / All Users</option>
                    <option value="vip">VIP Only</option>
                    <option value="vvip">VVIP Only</option>
                  </select>
                </div>
              </div>

              {/* Predictions */}
              <div className="admin-form-section">
                <div className="admin-predictions-header">
                  <h4 className="admin-form-section-title">
                    <Trophy className="admin-icon-inline" />
                    Predictions
                  </h4>
                  <button
                    type="button"
                    onClick={() => setNewGame({
                      ...newGame,
                      predictions: [...newGame.predictions, {
                        type: 'win',
                        prediction: 'home',
                        confidence: 50
                      }]
                    })}
                    className="admin-btn-add-prediction"
                  >
                    <Plus className="admin-btn-icon" />
                    Add Prediction
                  </button>
                </div>

                {newGame.predictions.map((pred, index) => (
                  <div key={index} className="admin-prediction-item">
                    <div className="admin-prediction-item-header">
                      <h5 className="admin-prediction-item-title">Prediction #{index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedPredictions = newGame.predictions.filter((_, i) => i !== index);
                          setNewGame({ ...newGame, predictions: updatedPredictions });
                        }}
                        className="admin-btn-remove"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="admin-form-grid-4">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Type</label>
                        <select
                          value={pred.type}
                          onChange={(e) => {
                            const updatedPredictions = [...newGame.predictions];
                            updatedPredictions[index] = { ...pred, type: e.target.value };
                            setNewGame({ ...newGame, predictions: updatedPredictions });
                          }}
                          className="admin-form-select"
                        >
                          <option value="win">Win</option>
                          <option value="over15">Over 1.5</option>
                          <option value="over25">Over 2.5</option>
                          <option value="corners">Corners</option>
                          <option value="ggng">GG/NG</option>
                          <option value="others">Others</option>
                          <option value="player">Player</option>
                        </select>
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Prediction</label>
                        {pred.type === 'win' ? (
                          <select
                            value={pred.prediction}
                            onChange={(e) => {
                              const updatedPredictions = [...newGame.predictions];
                              updatedPredictions[index] = { ...pred, prediction: e.target.value };
                              setNewGame({ ...newGame, predictions: updatedPredictions });
                            }}
                            className="admin-form-select"
                          >
                            <option value="1">Home Win (1)</option>
                            <option value="X">Draw (X)</option>
                            <option value="2">Away Win (2)</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={pred.prediction}
                            onChange={(e) => {
                              const updatedPredictions = [...newGame.predictions];
                              updatedPredictions[index] = { ...pred, prediction: e.target.value };
                              setNewGame({ ...newGame, predictions: updatedPredictions });
                            }}
                            className="admin-form-input"
                            placeholder="Enter prediction"
                          />
                        )}
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Confidence (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pred.confidence}
                          onChange={(e) => {
                            const updatedPredictions = [...newGame.predictions];
                            updatedPredictions[index] = { ...pred, confidence: parseInt(e.target.value) || 0 };
                            setNewGame({ ...newGame, predictions: updatedPredictions });
                          }}
                          className="admin-form-input"
                        />
                      </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Visibility</label>
                  <select
                    value={pred.visibility || 'all'}
                    onChange={(e) => {
                      const updatedPredictions = [...newGame.predictions];
                      updatedPredictions[index] = { ...pred, visibility: e.target.value };
                      setNewGame({ ...newGame, predictions: updatedPredictions });
                    }}
                    className="admin-form-select"
                  >
                    <option value="all">All Users</option>
                    <option value="vip">VIP Users Only</option>
                    <option value="vvip">VVIP Users Only</option>
                    <option value="both">VIP & VVIP Users</option>
                  </select>
                </div>
                    </div>
                  </div>
                ))}

                {newGame.predictions.length === 0 && (
                  <div className="admin-empty-predictions">
                    <p className="admin-empty-text">No predictions added yet</p>
                    <p className="admin-empty-subtitle">Click "Add Prediction" to add your first prediction</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!newGame.homeTeam || !newGame.awayTeam || !newGame.league || !newGame.date || !newGame.time) {
                    toast.error('Please fill in all required fields');
                    return;
                  }

                  if (newGame.predictions.length === 0) {
                    toast.error('Please add at least one prediction');
                    return;
                  }

                  try {
                    await api.post('/api/matches', {
                      homeTeam: newGame.homeTeam,
                      awayTeam: newGame.awayTeam,
                      league: newGame.league,
                      date: newGame.date,
                      time: newGame.time,
                      predictions: newGame.predictions,
                      gameTier: newGame.gameTier || 'none'
                    });

                    toast.success(`Game "${newGame.homeTeam} vs ${newGame.awayTeam}" added successfully!`);
                    setNewGame({
                      homeTeam: '',
                      awayTeam: '',
                      league: '',
                      date: '',
                      time: '',
                      gameTier: 'none',
                      predictions: []
                    });
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to add game');
                  }
                }}
                className="admin-btn-warning"
              >
                Add Game
              </button>
            </form>
          </div>}

          {/* Recent Games */}
          {activeGamesSection === 'recent' && <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Target className="admin-icon-inline" />
              Recent Games
            </h3>

            <input
              type="search"
              value={gameSearchTerm}
              onChange={(e) => setGameSearchTerm(e.target.value)}
              className="admin-search-input"
              placeholder="Search recent games by team, league, or batch..."
            />

            {filteredGames.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-text">No games found</div>
                <div className="admin-empty-subtitle">Use another search term or add/import matches first.</div>
              </div>
            ) : (
              <div className="admin-games-list">
                {filteredGames
                  .sort((a, b) => new Date(b.createdAt || b.utcDate) - new Date(a.createdAt || a.utcDate))
                  .map((game, index) => (
                  <div key={game.id || index} className="admin-match-card">
                    <div className="admin-match-header">
                      <div className="admin-match-meta">
                        <div className="admin-match-meta-item">
                          <Calendar className="admin-match-icon" />
                          <span>{new Date(game.utcDate).toLocaleDateString()}</span>
                        </div>
                        <div className="admin-match-meta-item">
                          <span>{game.predictions?.length || 0} prediction{game.predictions?.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="admin-match-info">
                      <h3 className="admin-match-teams">
                        {game.homeTeam.name} vs {game.awayTeam.name}
                      </h3>
                      <p className="admin-match-league">{game.competition?.name || game.league}</p>
                      <div className="admin-game-tier-row">
                        <div className={`admin-review-status ${game.predictionStatus || 'manual'}`}>
                          {getPredictionStatusLabel(game.predictionStatus)}
                        </div>
                        <span className={`admin-tier-badge ${game.gameTier === 'none' || !game.gameTier ? 'free' : game.gameTier}`}>
                          {game.gameTier === 'vvip' ? 'VVIP' : game.gameTier === 'vip' ? 'VIP' : 'Free'}
                        </span>
                      </div>
                      {game.predictionsGeneratedBy && (
                        <p className="admin-ai-meta">
                          AI: {game.predictionsGeneratedBy}
                          {game.predictionsGeneratedAt ? ` • ${new Date(game.predictionsGeneratedAt).toLocaleString()}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="admin-predictions-list">
                      {game.predictions && game.predictions.length > 0 ? (
                        game.predictions.map((pred, predIndex) => (
                          <div key={predIndex} className="admin-prediction-item-display">
                            <div className="admin-prediction-type">
                              <span className="admin-prediction-type-label">
                                {getPredictionTypeLabel(pred.type)}
                              </span>
                            </div>

                            <div className="admin-prediction-details">
                              <div className="admin-prediction-value">{pred.prediction}</div>
                              <div className="admin-prediction-confidence">
                                {pred.confidence}% confidence • {getPredictionVisibilityLabel(pred.visibility)}
                              </div>
                            </div>

                            <div className="admin-prediction-review-actions">
                              <button
                                type="button"
                                className="admin-prediction-review-btn edit"
                                onClick={() => editPrediction(game, pred, predIndex)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="admin-prediction-review-btn delete"
                                onClick={() => deletePrediction(game, pred, predIndex)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="admin-no-predictions">
                          <span>No predictions added</span>
                        </div>
                      )}
                    </div>


                    <div className="admin-review-actions">
                      <button
                        type="button"
                        className="admin-match-action-btn delete"
                        onClick={() => handleDeleteMatch(game)}
                      >
                        Delete Match
                      </button>
                      {(game.predictionStatus === 'pending_review' || game.predictionStatus === 'unpublished') && (
                        <button
                          type="button"
                          className="admin-match-action-btn approve"
                          onClick={() => handlePredictionReviewAction(game.id, 'approve')}
                        >
                          Approve & Publish
                        </button>
                      )}
                      {game.predictionStatus === 'approved' && (
                        <button
                          type="button"
                          className="admin-match-action-btn unpublish"
                          onClick={() => handlePredictionReviewAction(game.id, 'unpublish')}
                        >
                          Unpublish
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>}
        </div>
      )}

      {/* Send Email */}
      {activeTab === 'email' && (
        <div className="admin-data-card">
          <h3 className="admin-data-title">
            <Mail className="admin-icon-inline" />
            Send Email to All Users
          </h3>
          {renderBroadcastEmailForm('Send an announcement to every active user with an email address.')}
        </div>
      )}

      {/* Manage Outcomes */}
      {activeTab === 'outcomes' && (
        <div className="admin-outcomes-section">
          {/* Recent Matches with Pending Outcomes */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <CheckCircle className="admin-icon-inline" />
              Manage Prediction Outcomes
            </h3>
            <p className="admin-section-description">
              Mark predictions as win or loss to update user outcomes and statistics
            </p>

            <input
              type="search"
              value={outcomeSearchTerm}
              onChange={(e) => setOutcomeSearchTerm(e.target.value)}
              className="admin-search-input"
              placeholder="Search outcomes by team or league..."
            />

            {loading ? (
              <div className="predictions-loading">
                <div className="predictions-loading-spinner"></div>
                <div className="predictions-loading-text">
                  <div className="predictions-loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  Loading matches...
                </div>
              </div>
            ) : (
              <div className="admin-matches-outcomes">
                {filteredOutcomeGames.map((game, index) => (
                  <div key={game.id || index} className="admin-match-card">
                    <div className="admin-match-outcome-header">
                      <div className="admin-match-outcome-teams">
                        <h4>{game.homeTeam.name} vs {game.awayTeam.name}</h4>
                        <p className="admin-match-outcome-league">{game.competition?.name || game.league}</p>
                        <p className="admin-match-outcome-date">{new Date(game.utcDate).toLocaleDateString()}</p>
                      </div>
                      {game.homeGoals !== null && game.awayGoals !== null && (
                        <div className="admin-match-outcome-score">
                          {game.homeGoals} - {game.awayGoals}
                        </div>
                      )}
                      {/* Game Edit/Delete Actions */}
                      <div className="admin-match-actions">
                        <button
                          onClick={() => {
                            const currentDate = new Date(game.utcDate);
                            setModal({
                              isOpen: true,
                              type: 'form',
                              title: 'Edit Match',
                              formData: {
                                homeTeam: game.homeTeam.name,
                                awayTeam: game.awayTeam.name,
                                league: game.competition?.name || game.league,
                                date: currentDate.toISOString().split('T')[0],
                                time: currentDate.toTimeString().slice(0, 5),
                                gameTier: game.gameTier || 'none'
                              },
                              formFields: [
                                { name: 'homeTeam', label: 'Home Team', type: 'text' },
                                { name: 'awayTeam', label: 'Away Team', type: 'text' },
                                { name: 'league', label: 'League', type: 'text' },
                                { name: 'date', label: 'Match Date', type: 'date' },
                                { name: 'time', label: 'Match Time', type: 'time' },
                                {
                                  name: 'gameTier',
                                  label: 'Game Tier',
                                  type: 'select',
                                  options: [
                                    { value: 'none', label: 'Free / All Users' },
                                    { value: 'vip', label: 'VIP Only' },
                                    { value: 'vvip', label: 'VVIP Only' }
                                  ]
                                }
                              ],
                              onConfirm: async (formData) => {
                                try {
                                  const response = await api.put(`/api/matches/${game.id}`, {
                                    homeTeam: formData.homeTeam,
                                    awayTeam: formData.awayTeam,
                                    league: formData.league,
                                    date: formData.date,
                                    time: formData.time,
                                    gameTier: formData.gameTier || 'none'
                                  });

                                  if (response.data.message) {
                                    toast.success(response.data.message);
                                    fetchData();
                                  } else {
                                    toast.error('Failed to update game');
                                  }
                                } catch (err) {
                                  toast.error('Error updating game');
                                }
                              }
                            });
                          }}
                          className="admin-match-action-btn edit"
                        >
                          Edit Match
                        </button>
                          <button
                            onClick={() => showConfirm(
                              'Delete Match',
                              `Delete match: ${game.homeTeam.name} vs ${game.awayTeam.name}? This will also delete all predictions for this match.`,
                              async () => {
                              try {
                                const response = await api.delete(`/api/matches/${game.id}`);

                                if (response.data.message) {
                                  toast.success(response.data.message);
                                  fetchData();
                                } else {
                                  toast.error('Failed to delete game');
                                }
                              } catch (err) {
                                toast.error('Error deleting game');
                              }
                            }
                          )}
                          className="admin-match-action-btn delete"
                        >
                          Delete Match
                        </button>
                      </div>
                    </div>

                    <div className="admin-match-outcome-predictions">
                      {game.predictions && game.predictions.map((pred, predIndex) => (
                        <div key={predIndex} className="admin-prediction-outcome">
                          <div className="admin-prediction-outcome-info">
                            <span className="admin-prediction-outcome-type">
                              {pred.type === 'win' ? 'Match Winner' :
                               pred.type === 'over15' ? 'Over/Under 1.5' :
                               pred.type === 'over25' ? 'Over/Under 2.5' :
                               pred.type === 'corners' ? 'Corners' :
                               pred.type === 'ggng' ? 'GG/NG' :
                               pred.type === 'others' ? 'Others' :
                               pred.type === 'player' ? 'Player' : 'Prediction'}
                            </span>
                            <span className="admin-prediction-outcome-value">{pred.prediction}</span>
                            <span className="admin-prediction-outcome-confidence">{pred.confidence}%</span>
                          </div>

                          <div className="admin-prediction-outcome-actions">
                            {(() => {
                              // Find the outcome for this prediction
                              const outcomeKey = `${game.id}-${pred.type}-${pred.prediction}`;
                              const selectedOutcome = selectedOutcomes[outcomeKey];
                              const existingOutcome = game.outcomes?.find(
                                o => o.predictionType === pred.type && o.prediction === pred.prediction
                              );

                              const currentOutcome = selectedOutcome || existingOutcome?.actualResult;

                              return (
                                <>
                                  <button
                                    onClick={() => handleMarkOutcome(game.id, pred.type, pred.prediction, 'win')}
                                    className={`admin-outcome-btn win ${currentOutcome === 'win' ? 'selected' : ''}`}
                                    disabled={currentOutcome === 'win'}
                                  >
                                    {currentOutcome === 'win' ? '✓ WIN (Selected)' : '✓ Win'}
                                  </button>
                                  <button
                                    onClick={() => handleMarkOutcome(game.id, pred.type, pred.prediction, 'loss')}
                                    className={`admin-outcome-btn loss ${currentOutcome === 'loss' ? 'selected' : ''}`}
                                    disabled={currentOutcome === 'loss'}
                                  >
                                    {currentOutcome === 'loss' ? '✗ LOSS (Selected)' : '✗ Loss'}
                                  </button>
                                </>
                              );
                            })()}
                            {/* Edit and Delete buttons for predictions */}
                            <button
                              onClick={() => {
                                setModal({
                                  isOpen: true,
                                  type: 'form',
                                  title: 'Edit Prediction',
                                  formData: {
                                    type: pred.type,
                                    prediction: pred.prediction,
                                    confidence: pred.confidence,
                                    visibility: pred.visibility || 'all'
                                  },
                                  formFields: [
                                    {
                                      name: 'type',
                                      label: 'Prediction Type',
                                      type: 'select',
                                      options: [
                                        { value: 'win', label: 'Win' },
                                        { value: 'over15', label: 'Over 1.5' },
                                        { value: 'over25', label: 'Over 2.5' },
                                        { value: 'corners', label: 'Corners' },
                                        { value: 'ggng', label: 'GG/NG' },
                                        { value: 'others', label: 'Others' },
                                        { value: 'player', label: 'Player' }
                                      ]
                                    },
                                    {
                                      name: 'prediction',
                                      label: 'Prediction',
                                      type: 'text',
                                      placeholder: 'Enter prediction value'
                                    },
                                    {
                                      name: 'confidence',
                                      label: 'Confidence (%)',
                                      type: 'number',
                                      placeholder: '0-100'
                                    },
                                    {
                                      name: 'visibility',
                                      label: 'Visibility',
                                      type: 'select',
                                      options: [
                                        { value: 'all', label: 'All Users' },
                                        { value: 'vip', label: 'VIP Users Only' },
                                        { value: 'vvip', label: 'VVIP Users Only' },
                                        { value: 'both', label: 'VIP & VVIP Users' }
                                      ]
                                    }
                                  ],
                                  onConfirm: async (formData) => {
                                    try {
                                      const response = await api.put(`/api/outcomes/${game.id}/prediction/${predIndex}`, {
                                        type: formData.type,
                                        prediction: formData.prediction,
                                        confidence: parseInt(formData.confidence) || pred.confidence,
                                        visibility: formData.visibility
                                      });

                                      if (response.data.success) {
                                        toast.success('Prediction updated successfully');
                                        fetchData();
                                      } else {
                                        toast.error('Failed to update prediction');
                                      }
                                    } catch (err) {
                                      console.error('Prediction update error:', err);
                                      toast.error('Error updating prediction');
                                    }
                                  }
                                });
                              }}
                              className="admin-outcome-btn edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => showConfirm(
                                'Delete Prediction',
                                `Delete prediction "${pred.prediction}"?`,
                                async () => {
                                  try {
                                    const response = await api.delete(`/api/outcomes/${game.id}/prediction/${predIndex}`);

                                    if (response.data.success) {
                                      toast.success('Prediction deleted successfully');
                                      fetchData();
                                    } else {
                                      toast.error('Failed to delete prediction');
                                    }
                                  } catch (err) {
                                    toast.error('Error deleting prediction');
                                  }
                                }
                              )}
                              className="admin-outcome-btn delete"
                            >
                              Del
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New Prediction Button */}
                    <div className="admin-match-add-prediction">
                      <button
                        onClick={() => {
                          setModal({
                            isOpen: true,
                            type: 'form',
                            title: `Add New Prediction to ${game.homeTeam.name} vs ${game.awayTeam.name}`,
                            formData: {
                              type: 'win',
                              prediction: 'home',
                              confidence: 50,
                              visibility: 'all'
                            },
                            formFields: [
                              {
                                name: 'type',
                                label: 'Prediction Type',
                                type: 'select',
                                options: [
                                  { value: 'win', label: 'Win' },
                                  { value: 'over15', label: 'Over 1.5' },
                                  { value: 'over25', label: 'Over 2.5' },
                                  { value: 'corners', label: 'Corners' },
                                  { value: 'ggng', label: 'GG/NG' },
                                  { value: 'others', label: 'Others' },
                                  { value: 'player', label: 'Player' }
                                ]
                              },
                              {
                                name: 'prediction',
                                label: 'Prediction',
                                type: 'text',
                                placeholder: 'Enter prediction value'
                              },
                              {
                                name: 'confidence',
                                label: 'Confidence (%)',
                                type: 'number',
                                placeholder: '0-100'
                              },
                              {
                                name: 'visibility',
                                label: 'Visibility',
                                type: 'select',
                                options: [
                                  { value: 'all', label: 'All Users' },
                                  { value: 'vip', label: 'VIP Users Only' },
                                  { value: 'vvip', label: 'VVIP Users Only' },
                                  { value: 'both', label: 'VIP & VVIP Users' }
                                ]
                              }
                            ],
                            onConfirm: async (formData) => {
                              try {
                                const response = await api.post(`/api/matches/${game.id}/prediction`, {
                                  type: formData.type,
                                  prediction: formData.prediction,
                                  confidence: parseInt(formData.confidence) || 50,
                                  visibility: formData.visibility
                                });

                                if (response.data.success) {
                                  toast.success('Prediction added successfully');
                                  fetchData();
                                } else {
                                  toast.error('Failed to add prediction');
                                }
                              } catch (err) {
                                console.error('Prediction add error:', err);
                                toast.error('Error adding prediction');
                              }
                            }
                          });
                        }}
                        className="admin-btn-add-prediction-small"
                      >
                        <Plus className="admin-btn-icon" />
                        Add Prediction
                      </button>
                    </div>
                  </div>
                ))}

                {filteredOutcomeGames.length === 0 && (
                  <div className="admin-empty-state">
                    <div className="admin-empty-text">No matching matches found</div>
                    <div className="admin-empty-subtitle">Try another team name or add matches first to manage their outcomes</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Management */}
      {activeTab === 'users' && (
        <div className="admin-data-card">
          <h3 className="admin-data-title">User Management</h3>

          {loading ? (
            <div className="predictions-loading">
              <div className="predictions-loading-spinner"></div>
              <div className="predictions-loading-text">
                <div className="predictions-loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Loading users...
              </div>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="admin-user-name">{user.username}</td>
                      <td className="admin-user-email">{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user._id, e.target.value)}
                          className={`admin-role-select ${user.role === 'admin' ? 'admin' : ''}`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className={`admin-status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="admin-user-joined">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="admin-user-actions">
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/vip/admin/set-tier/${user._id}`, { tier: 'vip' });
                                toast.success(`Upgraded ${user.username} to VIP`);
                                fetchData();
                              } catch (error) {
                                toast.error('Failed to set VIP');
                              }
                            }}
                            className="admin-user-action-btn vip"
                            disabled={user.vipTier === 'vip'}
                          >
                            <Crown size={13} /> VIP
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/vip/admin/set-tier/${user._id}`, { tier: 'vvip' });
                                toast.success(`Upgraded ${user.username} to VVIP`);
                                fetchData();
                              } catch (error) {
                                toast.error('Failed to set VVIP');
                              }
                            }}
                            className="admin-user-action-btn vvip"
                            disabled={user.vipTier === 'vvip'}
                          >
                            <Zap size={13} /> VVIP
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/vip/admin/set-tier/${user._id}`, { tier: 'none' });
                                toast.success(`Removed VIP from ${user.username}`);
                                fetchData();
                              } catch (error) {
                                toast.error('Failed to remove VIP');
                              }
                            }}
                            className="admin-user-action-btn remove-vip"
                            disabled={user.vipTier === 'none' || !user.vipTier}
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user._id, !user.isActive)}
                            className={`admin-user-action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="admin-user-action-btn delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bets Management */}
      {activeTab === 'bets' && (
        <div className="admin-data-card">
          <h3 className="admin-data-title">All Bets Management</h3>

          {loading ? (
            <div className="predictions-loading">
              <div className="predictions-loading-spinner"></div>
              <div className="predictions-loading-text">
                <div className="predictions-loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Loading bets...
              </div>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Match</th>
                    <th>Prediction</th>
                    <th>Stake</th>
                    <th>Odds</th>
                    <th>Result</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((bet, index) => (
                    <tr key={index}>
                      <td className="admin-user-name">{bet.username}</td>
                      <td>Match {bet.matchId}</td>
                      <td>
                        <span className="admin-bet-result win">{bet.prediction}</span>
                      </td>
                      <td>€{bet.stake}</td>
                      <td>{bet.odds}</td>
                      <td>
                        <span className={`admin-bet-result ${bet.result === 'win' ? 'win' : bet.result === 'loss' ? 'loss' : 'pending'}`}>
                          {bet.result === 'win' ? 'Won' : bet.result === 'loss' ? 'Lost' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {bet.result === 'pending' && (
                          <div className="admin-bet-actions">
                            <button
                              onClick={() => updateBetResult(bet.userId, bet._id, 'win')}
                              className="admin-bet-action-btn win"
                            >
                              Win
                            </button>
                            <button
                              onClick={() => updateBetResult(bet.userId, bet._id, 'loss')}
                              className="admin-bet-action-btn loss"
                            >
                              Loss
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIP Management */}
      {activeTab === 'vip' && (
        <div className="admin-vip-section">
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Star className="admin-icon-inline" />
              VIP Booking Codes
            </h3>
            <div className="admin-form-grid-3">
              <div className="admin-form-group">
                <label className="admin-form-label">Bookmaker</label>
                <select className="admin-form-select" value={bookingCodeForm.bookmaker} onChange={(e) => setBookingCodeForm({ ...bookingCodeForm, bookmaker: e.target.value })}>
                  <option value="sportybet">SportyBet</option>
                  <option value="bet9ja">Bet9ja</option>
                  <option value="footballcom">Football.com</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Booking Code</label>
                <input className="admin-form-input" value={bookingCodeForm.code} onChange={(e) => setBookingCodeForm({ ...bookingCodeForm, code: e.target.value })} placeholder="e.g. ABC123" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Odds</label>
                <input type="number" step="0.01" className="admin-form-input" value={bookingCodeForm.odds} onChange={(e) => setBookingCodeForm({ ...bookingCodeForm, odds: e.target.value })} placeholder="e.g. 2.45" />
              </div>
            </div>
            <div className="admin-form-grid-2">
              <div className="admin-form-group">
                <label className="admin-form-label">Title</label>
                <input className="admin-form-input" value={bookingCodeForm.title} onChange={(e) => setBookingCodeForm({ ...bookingCodeForm, title: e.target.value })} placeholder="VIP Banker Code" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Valid Until</label>
                <input type="datetime-local" className="admin-form-input" value={bookingCodeForm.validUntil} onChange={(e) => setBookingCodeForm({ ...bookingCodeForm, validUntil: e.target.value })} />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Description</label>
              <textarea className="admin-form-textarea" value={bookingCodeForm.description} onChange={(e) => setBookingCodeForm({ ...bookingCodeForm, description: e.target.value })} placeholder="Optional note shown with this code" />
            </div>
            <button className="admin-btn-success" type="button" onClick={saveBookingCode}>Save Booking Code</button>

            <div className="admin-table-wrapper" style={{ marginTop: '1rem' }}>
              <table className="admin-table">
                <thead>
                  <tr><th>Bookmaker</th><th>Code</th><th>Odds</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {bookingCodes.map(code => (
                    <tr key={code._id}>
                      <td>{code.bookmaker}</td>
                      <td className="admin-user-name">{code.code}</td>
                      <td>{Number(code.odds).toFixed(2)}</td>
                      <td><span className={`admin-status-badge ${code.isActive ? 'active' : 'inactive'}`}>{code.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className="admin-bet-actions">
                          <button className="admin-bet-action-btn win" onClick={() => toggleBookingCode(code)}>{code.isActive ? 'Disable' : 'Enable'}</button>
                          <button className="admin-bet-action-btn loss" onClick={() => deleteBookingCode(code)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending VIP Payments */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Star className="admin-icon-inline" />
              Pending VIP Payments
            </h3>

            {loading ? (
              <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
                <div className="admin-loading-text">Loading VIP payments...</div>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Amount</th>
                      <th>Payment Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vipPayments && vipPayments.length > 0 ? vipPayments.map((payment) => (
                      <tr key={payment._id}>
                        <td className="admin-user-name">{payment.user.username}</td>
                        <td className="admin-user-email">{payment.user.email}</td>
                        <td>₦{payment.amount.toLocaleString()}</td>
                        <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td>
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/vip/confirm-payment/${payment._id}`);
                                toast.success('VIP payment confirmed successfully!');
                                fetchData(); // Refresh data
                              } catch (error) {
                                toast.error('Failed to confirm VIP payment');
                              }
                            }}
                            className="admin-action-btn success"
                          >
                            Confirm VIP
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="admin-no-data">No pending VIP payments</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* VIP Users Management */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Star className="admin-icon-inline" />
              VIP Users Management
            </h3>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>VIP Status</th>
                    <th>VIP Expiry</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => (u.vipTier === 'vip' || u.vipTier === 'vvip') || u.role === 'admin').map((user) => (
                    <tr key={user._id}>
                      <td className="admin-user-name">{user.username}</td>
                      <td className="admin-user-email">{user.email}</td>
                      <td>
                        <span className={`admin-status-badge ${user.isVIP ? 'vip' : 'inactive'}`}>
                          {user.isVIP ? 'VIP' : 'Not VIP'}
                        </span>
                      </td>
                      <td>{user.vipExpiry ? new Date(user.vipExpiry).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <div className="admin-bet-actions">
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/vip/admin/set-tier/${user._id}`, { tier: 'vip' });
                                toast.success(`Upgraded ${user.username} to VIP`);
                                fetchData();
                              } catch (error) {
                                toast.error('Failed to set VIP');
                              }
                            }}
                            className="admin-action-btn success"
                            disabled={user.vipTier === 'vip'}
                          >
                            <Crown size={14} /> VIP
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/vip/admin/set-tier/${user._id}`, { tier: 'vvip' });
                                toast.success(`Upgraded ${user.username} to VVIP`);
                                fetchData();
                              } catch (error) {
                                toast.error('Failed to set VVIP');
                              }
                            }}
                            className="admin-action-btn primary"
                            disabled={user.vipTier === 'vvip'}
                          >
                            <Zap size={14} /> VVIP
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/vip/admin/set-tier/${user._id}`, { tier: 'none' });
                                toast.success(`Removed VIP from ${user.username}`);
                                fetchData();
                              } catch (error) {
                                toast.error('Failed to remove VIP');
                              }
                            }}
                            className="admin-action-btn danger"
                            disabled={user.vipTier === 'none' || !user.vipTier}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <div className="admin-settings-card">
          <h3 className="admin-settings-title">System Settings</h3>

          <div className="admin-settings-section">
            <h4 className="admin-settings-section-title">Homepage Announcement Banner</h4>
            <div className="admin-settings-fields">
              <div className="admin-settings-field">
                <label className="admin-settings-label">Banner Title</label>
                <input
                  type="text"
                  className="admin-settings-input"
                  value={siteSettings.announcements?.title || ''}
                  onChange={(e) => setSiteSettings(prev => ({
                    ...prev,
                    announcements: { ...prev.announcements, title: e.target.value }
                  }))}
                  placeholder="Optional banner title"
                />
              </div>
              <div className="admin-settings-field">
                <label className="admin-settings-label">Rotation Speed (ms)</label>
                <input
                  type="number"
                  className="admin-settings-input"
                  value={siteSettings.announcements?.rotationSpeed || 3500}
                  onChange={(e) => setSiteSettings(prev => ({
                    ...prev,
                    announcements: { ...prev.announcements, rotationSpeed: Number(e.target.value) || 3500 }
                  }))}
                />
              </div>
              <div className="admin-settings-field">
                <label className="admin-settings-label">Banner Enabled</label>
                <select
                  className="admin-settings-input"
                  value={siteSettings.announcements?.enabled ? 'enabled' : 'disabled'}
                  onChange={(e) => setSiteSettings(prev => ({
                    ...prev,
                    announcements: { ...prev.announcements, enabled: e.target.value === 'enabled' }
                  }))}
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div className="admin-settings-fields">
              {(siteSettings.announcements?.items || []).map((item, index) => (
                <div key={index} className="admin-settings-field admin-settings-announcement-item">
                  <label className="admin-settings-label">Message {index + 1}</label>
                  <textarea
                    className="admin-settings-input admin-settings-textarea"
                    value={item.text}
                    onChange={(e) => updateAnnouncementItem(index, 'text', e.target.value)}
                    placeholder="e.g. New Premier League season is here"
                  />
                  <div className="admin-settings-inline-actions">
                    <label className="admin-settings-checkbox-row">
                      <input
                        type="checkbox"
                        checked={item.isActive !== false}
                        onChange={(e) => updateAnnouncementItem(index, 'isActive', e.target.checked)}
                      />
                      <span>Active</span>
                    </label>
                    <button type="button" className="admin-action-btn danger" onClick={() => removeAnnouncementItem(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-settings-inline-actions">
              <button type="button" className="admin-action-btn success" onClick={addAnnouncementItem}>
                Add Message
              </button>
              <button type="button" className="admin-settings-save-btn" onClick={saveAnnouncementSettings}>
                Save Banner Settings
              </button>
            </div>
          </div>

          <div className="admin-settings-section">
            <h4 className="admin-settings-section-title">API Configuration</h4>
            <div className="admin-settings-fields">
              <div className="admin-settings-field">
                <label className="admin-settings-label">Football Data API Key</label>
                <input
                  type="password"
                  className="admin-settings-input"
                  placeholder="••••••••"
                />
              </div>
              <div className="admin-settings-field">
                <label className="admin-settings-label">TheOddsAPI Key</label>
                <input
                  type="password"
                  className="admin-settings-input"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="admin-settings-section">
            <h4 className="admin-settings-section-title">Prediction Settings</h4>
            <div className="admin-settings-fields">
              <div className="admin-settings-field">
                <label className="admin-settings-label">Home Advantage Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue="1.2"
                  className="admin-settings-input"
                />
              </div>
              <div className="admin-settings-field">
                <label className="admin-settings-label">Update Frequency (hours)</label>
                <input
                  type="number"
                  defaultValue="6"
                  className="admin-settings-input"
                />
              </div>
            </div>
          </div>

          <button className="admin-settings-save-btn">
            Save Settings
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        type={modal.type}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        initialValue={modal.initialValue}
        placeholder={modal.placeholder}
        inputType={modal.inputType}
        formData={modal.formData}
        formFields={modal.formFields}
      >
        {modal.message}
      </Modal>
    </div>
  );
};

export default Admin;
