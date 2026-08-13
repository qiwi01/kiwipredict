import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { User, Heart, Plus, Trash2, Crown, CalendarDays, ShieldCheck, ArrowRight, LayoutDashboard } from 'lucide-react';
import api from '../utils/api';
import '../css/Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [newFavorite, setNewFavorite] = useState('');
  useEffect(() => {
    if (user) {
      setFavorites(user.favoriteTeams || []);
    }
  }, [user]);

  const addFavorite = async () => {
    if (!newFavorite.trim()) return;

    try {
      await api.post('/api/user/favorites', {
        teamName: newFavorite.trim()
      });
      setFavorites([...favorites, newFavorite.trim()]);
      setNewFavorite('');
      toast.success('Team added to favorites!');
    } catch (err) {
      toast.error('Failed to add favorite team');
    }
  };

  const removeFavorite = async (teamName) => {
    try {
      await api.delete(`/api/user/favorites/${teamName}`);
      setFavorites(favorites.filter(team => team !== teamName));
      toast.success('Team removed from favorites');
    } catch (err) {
      toast.error('Failed to remove favorite team');
    }
  };

  if (!user) return null;

  const vipLabel = user.vipTier === 'vvip' ? 'VVIP Member' : user.vipTier === 'vip' ? 'VIP Member' : 'Standard Member';

  return (
    <div className="profile-container">
      <section className="profile-dashboard-hero">
        <div className="profile-dashboard-copy">
          <span className="profile-dashboard-badge">
            <LayoutDashboard size={16} />
            Member Dashboard
          </span>
          <h1 className="profile-dashboard-title">Welcome back, {user.username}</h1>
          <p className="profile-dashboard-subtitle">
            Manage your account, track your membership status, and keep your favorite teams ready for quicker prediction discovery.
          </p>
          <div className="profile-dashboard-actions">
            <Link to="/predictions/today/win" className="profile-dashboard-primary-btn">
              View Today&apos;s Predictions
              <ArrowRight className="profile-btn-icon" />
            </Link>
            <Link to={(user.vipTier === 'vip' || user.vipTier === 'vvip') ? '/predictions/vip' : '/vip'} className="profile-dashboard-secondary-btn">
              {user.vipTier === 'none' ? 'Upgrade Membership' : 'Open VIP Area'}
            </Link>
          </div>
        </div>

        <div className="profile-dashboard-summary-card">
          <div className="profile-summary-row">
            <span className="profile-summary-label"><Crown size={16} /> Membership</span>
            <strong className="profile-summary-value">{vipLabel}</strong>
          </div>
          <div className="profile-summary-row">
            <span className="profile-summary-label"><CalendarDays size={16} /> Joined</span>
            <strong className="profile-summary-value">{new Date(user.createdAt).toLocaleDateString()}</strong>
          </div>
          <div className="profile-summary-row">
            <span className="profile-summary-label"><ShieldCheck size={16} /> Access</span>
            <strong className="profile-summary-value">{user.role === 'admin' ? 'Administrator' : 'Member'}</strong>
          </div>
        </div>
      </section>

      <div className="profile-header">
        <div className="profile-avatar">
          <User className="profile-avatar-icon" />
        </div>
        <h1 className="profile-name">{user.username}</h1>
        <p className="profile-email">{user.email}</p>
        <p className="profile-member-since">
          Member since {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="profile-content">
        <div className="profile-section profile-overview-panel">
          <div className="profile-section-header">
            <ShieldCheck className="profile-section-icon" />
            <h2 className="profile-section-title">Account Overview</h2>
          </div>

          <div className="profile-overview-grid">
            <div className="profile-overview-item">
              <span className="profile-overview-kicker">Status</span>
              <strong className="profile-overview-value">{user.isActive ? 'Active' : 'Inactive'}</strong>
            </div>
            <div className="profile-overview-item">
              <span className="profile-overview-kicker">Role</span>
              <strong className="profile-overview-value profile-overview-capitalize">{user.role}</strong>
            </div>
            <div className="profile-overview-item">
              <span className="profile-overview-kicker">Favorites</span>
              <strong className="profile-overview-value">{favorites.length}</strong>
            </div>
            <div className="profile-overview-item">
              <span className="profile-overview-kicker">Plan</span>
              <strong className="profile-overview-value">{user.vipTier?.toUpperCase?.() || 'NONE'}</strong>
            </div>
          </div>
        </div>

        {/* Favorite Teams */}
        <div className="profile-section">
          <div className="profile-section-header">
            <Heart className="profile-section-icon" />
            <h2 className="profile-section-title">Favorite Teams</h2>
          </div>

          {/* Add Favorite Team */}
          <div className="profile-add-favorite">
            <input
              type="text"
              placeholder="Add team name..."
              className="profile-input"
              value={newFavorite}
              onChange={(e) => setNewFavorite(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addFavorite()}
            />
            <button
              onClick={addFavorite}
              className="profile-add-btn"
            >
              <Plus className="profile-btn-icon" />
              <span>Add</span>
            </button>
          </div>

          {/* Favorite Teams List */}
          <div className="profile-favorites-list">
            {favorites.length === 0 ? (
              <p className="profile-empty-text">No favorite teams yet</p>
            ) : (
              favorites.map((team, index) => (
                <div
                  key={index}
                  className="profile-favorite-item"
                >
                  <span className="profile-favorite-name">{team}</span>
                  <button
                    onClick={() => removeFavorite(team)}
                    className="profile-remove-btn"
                  >
                    <Trash2 className="profile-remove-icon" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>


      </div>

      {/* Quick Stats */}
      <div className="profile-stats">
        <h2 className="profile-stats-title">Quick Stats</h2>
        <div className="profile-stats-grid">
          <div className="profile-stat-item">
            <div className="profile-stat-value">{favorites.length}</div>
            <div className="profile-stat-label">Favorite Teams</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
