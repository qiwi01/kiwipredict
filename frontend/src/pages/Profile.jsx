import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { User, Heart, Plus, Trash2 } from 'lucide-react';
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

  return (
    <div className="profile-container">
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
