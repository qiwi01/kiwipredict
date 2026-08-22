import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import {
  User,
  Heart,
  Plus,
  Trash2,
  Crown,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  MessageSquareMore,
  Target,
  TrendingUp,
  Zap,
  Star
} from 'lucide-react';
import api from '../utils/api';
import '../css/Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [newFavorite, setNewFavorite] = useState('');
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    if (user) {
      setFavorites(user.favoriteTeams || []);
    }
  }, [user]);

  useEffect(() => {
    api.get('/api/site-settings')
      .then(res => setSiteSettings(res.data))
      .catch(() => setSiteSettings(null));
  }, []);

  const activeAnnouncements = useMemo(() => (
    siteSettings?.announcements?.items?.filter(item => item.isActive) || []
  ), [siteSettings]);

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
  const planLabel = user.vipTier === 'vvip' ? 'VVIP' : user.vipTier === 'vip' ? 'VIP' : 'Free';
  const memberSince = new Date(user.createdAt).toLocaleDateString();
  const daysActive = Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const yearsActive = Math.max(1, Math.floor(daysActive / 365));
  const vipLink = (user.vipTier === 'vip' || user.vipTier === 'vvip') ? '/predictions/vip' : '/vip';
  const announcementTitle = siteSettings?.announcements?.title?.trim() || '';

  return (
    <div className="profile-container">
      {siteSettings?.announcements?.enabled && activeAnnouncements.length > 0 && (
        <section className="profile-announcement-card" aria-label="Site announcements">
          {announcementTitle && (
            <div className="profile-announcement-label">
              <span className="profile-announcement-pulse"></span>
              <MessageSquareMore size={16} />
              <strong>{announcementTitle}</strong>
            </div>
          )}

          <div className="profile-announcement-track">
            <div className="profile-announcement-message profile-announcement-marquee">
              {[...activeAnnouncements, ...activeAnnouncements].map((announcement, index) => (
                <span key={`${announcement.text}-${index}`} className="profile-announcement-marquee-item">
                  {announcement.text}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="profile-dashboard-hero profile-dashboard-standard">
        <div className="profile-dashboard-copy">
          <span className="profile-dashboard-badge">
            <LayoutDashboard size={16} />
            Member Console
          </span>
          <h1 className="profile-dashboard-title">Welcome back, {user.username}</h1>
          <p className="profile-dashboard-subtitle">
            Start from today&apos;s picks, check your membership status, save teams you follow, and move quickly to VIP tools.
          </p>
          <div className="profile-dashboard-actions">
            <Link to="/predictions/today/win" className="profile-dashboard-primary-btn">
              Open Today&apos;s Picks
              <ArrowRight className="profile-btn-icon" />
            </Link>
            <Link to={vipLink} className="profile-dashboard-secondary-btn">
              <Crown size={18} />
              {user.vipTier === 'none' ? 'Upgrade Membership' : 'Open VIP Area'}
            </Link>
          </div>
        </div>
      </section>

      <section className="profile-stats">
        <div className="profile-stats-header">
          <div>
            <span className="profile-section-eyebrow">Your workspace</span>
            <h2 className="profile-stats-title">Dashboard Summary</h2>
          </div>
          <span className={`profile-status-pill ${user.isActive ? 'active' : 'inactive'}`}>
            {user.isActive ? 'Active Account' : 'Inactive Account'}
          </span>
        </div>
        <div className="profile-stats-grid">
          <div className="profile-stat-item">
            <Heart className="profile-stat-icon" />
            <div className="profile-stat-value">{favorites.length}</div>
            <div className="profile-stat-label">Favorite Teams</div>
          </div>
          <div className="profile-stat-item">
            <Crown className="profile-stat-icon" />
            <div className="profile-stat-value">{planLabel}</div>
            <div className="profile-stat-label">Plan</div>
          </div>
          <div className="profile-stat-item">
            <CalendarDays className="profile-stat-icon" />
            <div className="profile-stat-value">{yearsActive}</div>
            <div className="profile-stat-label">Years Active</div>
          </div>
          <div className="profile-stat-item">
            <ShieldCheck className="profile-stat-icon" />
            <div className="profile-stat-value">{user.isActive ? 'Active' : 'Inactive'}</div>
            <div className="profile-stat-label">Status</div>
          </div>
        </div>
      </section>

      <div className="profile-dashboard-grid">
        <section className="profile-section profile-actions-panel">
          <div className="profile-section-header">
            <Target className="profile-section-icon" />
            <div>
              <h2 className="profile-section-title">Quick Actions</h2>
              <p className="profile-section-subtitle">Use these shortcuts to continue from the most important areas.</p>
            </div>
          </div>

          <div className="profile-action-list">
            <Link to="/predictions/top-picks" className="profile-action-card">
              <TrendingUp className="profile-action-icon" />
              <div>
                <strong>Today&apos;s Top Picks</strong>
                <span>Go straight to the strongest available prediction list.</span>
              </div>
              <ArrowRight size={18} />
            </Link>
            <Link to="/predictions/today/over25" className="profile-action-card">
              <Zap className="profile-action-icon" />
              <div>
                <strong>Goal Markets</strong>
                <span>Open popular over/under prediction markets quickly.</span>
              </div>
              <ArrowRight size={18} />
            </Link>
            <Link to={vipLink} className="profile-action-card premium">
              <Star className="profile-action-icon" />
              <div>
                <strong>VIP Area</strong>
                <span>{user.vipTier === 'none' ? 'Upgrade when you want premium selections.' : 'Continue to your premium picks and tools.'}</span>
              </div>
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-header">
            <Heart className="profile-section-icon" />
            <div>
              <h2 className="profile-section-title">Favorite Teams</h2>
              <p className="profile-section-subtitle">Save teams you follow for faster prediction discovery.</p>
            </div>
          </div>

          <div className="profile-add-favorite">
            <input
              type="text"
              placeholder="Add team name..."
              className="profile-input"
              value={newFavorite}
              onChange={(e) => setNewFavorite(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFavorite()}
            />
            <button
              type="button"
              onClick={addFavorite}
              className="profile-add-btn"
            >
              <Plus className="profile-btn-icon" />
              <span>Add</span>
            </button>
          </div>

          <div className="profile-favorites-list">
            {favorites.length === 0 ? (
              <div className="profile-empty-panel">
                <Heart size={28} />
                <p className="profile-empty-text">No favorite teams yet. Add your first team above.</p>
              </div>
            ) : (
              favorites.map((team, index) => (
                <div key={index} className="profile-favorite-item">
                  <span className="profile-favorite-name">{team}</span>
                  <button
                    type="button"
                    onClick={() => removeFavorite(team)}
                    className="profile-remove-btn"
                    aria-label={`Remove ${team}`}
                  >
                    <Trash2 className="profile-remove-icon" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="profile-dashboard-summary-card profile-dashboard-summary-last">
          <div className="profile-summary-top">
            <LayoutDashboard className="profile-summary-icon" />
            <div>
              <h2>Dashboard Summary</h2>
              <p>Your current account snapshot.</p>
            </div>
          </div>
          <div className="profile-summary-row">
            <span className="profile-summary-label"><Crown size={16} /> Membership</span>
            <strong className="profile-summary-value">{vipLabel}</strong>
          </div>
          <div className="profile-summary-row">
            <span className="profile-summary-label"><CalendarDays size={16} /> Joined</span>
            <strong className="profile-summary-value">{memberSince}</strong>
          </div>
          <div className="profile-summary-row">
            <span className="profile-summary-label"><ShieldCheck size={16} /> Access</span>
            <strong className="profile-summary-value">{user.role === 'admin' ? 'Administrator' : 'Member'}</strong>
          </div>
          <div className="profile-summary-mini-actions">
            <Link to="/outcomes">View outcomes</Link>
            <Link to="/vip/converter">Bet converter</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;