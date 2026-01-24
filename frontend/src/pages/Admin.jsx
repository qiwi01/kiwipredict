import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { Users, UserCheck, Shield, BarChart3, Settings, Plus, Calendar, Trophy, Target, Gamepad2, Star, LogOut, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import Modal from '../components/Modal';
import '../css/Admin.css';

const Admin = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [bets, setBets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [newTeam, setNewTeam] = useState({ name: '', league: '' });
  const [newLeague, setNewLeague] = useState({ name: '', code: '', country: '', teams: [] });
  const [newTeamToAdd, setNewTeamToAdd] = useState({ name: '', code: '', founded: '', stadium: '' });
  const [selectedLeagueForTeams, setSelectedLeagueForTeams] = useState('');
  const [newGame, setNewGame] = useState({
    homeTeam: '',
    awayTeam: '',
    league: '',
    date: '',
    time: '',
    predictions: []
  });
  const [selectedOutcomes, setSelectedOutcomes] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLeagues, setFilteredLeagues] = useState([]);
  const [filteredHomeTeams, setFilteredHomeTeams] = useState([]);
  const [filteredAwayTeams, setFilteredAwayTeams] = useState([]);
  const [vipPayments, setVipPayments] = useState([]);

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
        const vipPaymentsRes = await api.get('/api/vip/pending-payments');
        setVipPayments(vipPaymentsRes.data);
      }
    } catch (err) {
      console.log(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
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

  const showPrompt = (title, message, initialValue = '', placeholder = '', inputType = 'text', onConfirm, onCancel = null) => {
    setModal({
      isOpen: true,
      type: 'prompt',
      title,
      message,
      initialValue,
      placeholder,
      inputType,
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm,
      onCancel
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
    { id: 'leagues', label: 'Leagues & Teams', icon: Trophy },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'outcomes', label: 'Manage Outcomes', icon: CheckCircle },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'vip', label: 'VIP Management', icon: Star },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

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
          <button onClick={logout} className="admin-logout-btn">
            <LogOut className="admin-logout-icon" />
            Logout
          </button>
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

          {/* Add Team to League */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Plus className="admin-icon-inline" />
              Add Team to League
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
          {/* Add Game Form */}
          <div className="admin-data-card">
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
                {/* VIP checkbox removed from match level - now per prediction */}
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
                        prediction: '1',
                        confidence: 50,
                        valueBet: false
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
          </div>

          {/* Recent Games */}
          <div className="admin-data-card">
            <h3 className="admin-data-title">
              <Target className="admin-icon-inline" />
              Recent Games
            </h3>

            {games.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-text">No games added yet</div>
                <div className="admin-empty-subtitle">Use the form above to add your first game</div>
              </div>
            ) : (
              <div className="admin-games-list">
                {games
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
                    </div>

                    <div className="admin-predictions-list">
                      {game.predictions && game.predictions.length > 0 ? (
                        game.predictions.map((pred, predIndex) => (
                          <div key={predIndex} className={`admin-prediction-item-display ${pred.valueBet ? 'admin-match-value' : ''}`}>
                            <div className="admin-prediction-type">
                              <span className="admin-prediction-type-label">
                                {pred.type === 'win' ? 'WIN' :
                                 pred.type === 'over15' ? 'OVER 1.5' :
                                 pred.type === 'over25' ? 'OVER 2.5' :
                                 pred.type === 'corners' ? 'CORNERS' :
                                 pred.type === 'ggng' ? 'GG/NG' :
                                 pred.type === 'others' ? 'OTHERS' :
                                 pred.type === 'player' ? 'PLAYER' : 'PREDICTION'}
                              </span>
                              {pred.valueBet && (
                                <div className="admin-value-badge-small">
                                  <Star className="admin-value-icon-small" />
                                  <span>VALUE</span>
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
                          <span>No predictions added</span>
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
                {games.map((game, index) => (
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
                                time: currentDate.toTimeString().slice(0, 5)
                              },
                              onConfirm: async (formData) => {
                                try {
                                  const response = await api.put(`/api/matches/${game.id}`, {
                                    homeTeam: formData.homeTeam,
                                    awayTeam: formData.awayTeam,
                                    league: formData.league,
                                    date: formData.date,
                                    time: formData.time
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
                                    confidence: pred.confidence
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
                                    }
                                  ],
                                  onConfirm: async (formData) => {
                                    try {
                                      const response = await api.put(`/api/outcomes/${game.id}/prediction/${predIndex}`, {
                                        type: formData.type,
                                        prediction: formData.prediction,
                                        confidence: parseInt(formData.confidence) || pred.confidence
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
                              prediction: '1',
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

                {games.length === 0 && (
                  <div className="admin-empty-state">
                    <div className="admin-empty-text">No recent matches found</div>
                    <div className="admin-empty-subtitle">Add some matches first to manage their outcomes</div>
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
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/api/vip/toggle-vip/${user._id}`);
                              toast.success(`VIP status ${user.isVIP ? 'removed' : 'granted'} successfully!`);
                              fetchData(); // Refresh data
                            } catch (error) {
                              toast.error('Failed to toggle VIP status');
                            }
                          }}
                          className="admin-action-btn primary"
                        >
                          {user.isVIP ? 'Remove VIP' : 'Grant VIP'}
                        </button>
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
