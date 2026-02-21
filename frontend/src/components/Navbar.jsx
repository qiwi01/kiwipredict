import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { LogOut, LogIn, UserPlus, Menu, X, ChevronDown, Trophy, Users, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';
import '../css/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPredictionsOpen, setIsPredictionsOpen] = useState(false);
  const [isTodaysSubmenuOpen, setIsTodaysSubmenuOpen] = useState(false);
  const [isTopPicksSubmenuOpen, setIsTopPicksSubmenuOpen] = useState(false);
  const [isAllPredictionsSubmenuOpen, setIsAllPredictionsSubmenuOpen] = useState(false);
  const [isTodaysMobileOpen, setIsTodaysMobileOpen] = useState(false);
  const [isPredictionsMobileOpen, setIsPredictionsMobileOpen] = useState(false);
  const predictionsDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProtectedNavigation = (path) => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if Top Picks navigation and user is not VVIP
    if (path.includes('top-picks') && user.vipTier !== 'vvip') {
      // Show VVIP required message
      toast.error('Top Picks are only available for VVIP members. Upgrade to VVIP to access exclusive top picks!');
      return;
    }

    navigate(path);
    // Close dropdown on navigation
    setIsPredictionsOpen(false);
    setIsTodaysSubmenuOpen(false);
    setIsTopPicksSubmenuOpen(false);
    setIsAllPredictionsSubmenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Close submenus when toggling main menu
    if (!isMobileMenuOpen) {
      setIsTodaysMobileOpen(false);
      setIsPredictionsMobileOpen(false);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsTodaysMobileOpen(false);
    setIsPredictionsMobileOpen(false);
  };

  const handleMobileNavigation = (path) => {
    // If user not logged in, send to login
    if (!user) {
      navigate('/login');
      closeMobileMenu();
      return;
    }

    // Restrict Top Picks to VVIP users only
    if (path.includes('top-picks') && user.vipTier !== 'vvip') {
      toast.error('Top Picks are only available for VVIP members. Upgrade to VVIP to access exclusive top picks!');
      closeMobileMenu();
      return;
    }

    navigate(path);
    closeMobileMenu();
  };

  const togglePredictions = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsPredictionsOpen(!isPredictionsOpen);
  };

  const toggleTodaysSubmenu = () => {
    setIsTodaysSubmenuOpen(!isTodaysSubmenuOpen);
    setIsTopPicksSubmenuOpen(false);
    setIsAllPredictionsSubmenuOpen(false);
  };

  const toggleTopPicksSubmenu = () => {
    setIsTopPicksSubmenuOpen(!isTopPicksSubmenuOpen);
    setIsTodaysSubmenuOpen(false);
    setIsAllPredictionsSubmenuOpen(false);
  };

  const toggleAllPredictionsSubmenu = () => {
    setIsAllPredictionsSubmenuOpen(!isAllPredictionsSubmenuOpen);
    setIsTodaysSubmenuOpen(false);
    setIsTopPicksSubmenuOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (predictionsDropdownRef.current && !predictionsDropdownRef.current.contains(event.target)) {
        setIsPredictionsOpen(false);
        setIsTodaysSubmenuOpen(false);
        setIsTopPicksSubmenuOpen(false);
        setIsAllPredictionsSubmenuOpen(false);
      }

      // Close mobile menu when clicking outside
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) &&
          !event.target.closest('.navbar-mobile-toggle')) {
        closeMobileMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon">
              <span className="navbar-logo-initials">KP</span>
            </div>
            <span className="navbar-logo-text">
              Kiwi Predict
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="navbar-links">
            <Link to="/" className="navbar-link">
              Home
            </Link>

            {/* Predictions Main Dropdown */}
            <div className="navbar-dropdown" ref={predictionsDropdownRef}>
              <button
                onClick={togglePredictions}
                className={`navbar-link navbar-dropdown-toggle ${isPredictionsOpen ? 'active' : ''}`}
              >
                <span>Predictions</span>
                <ChevronDown className="navbar-dropdown-icon" />
              </button>

              {isPredictionsOpen && (
                <div className="navbar-dropdown-menu navbar-dropdown-menu-wide">
                  {/* Today's Predictions Submenu */}
                  <div className="navbar-submenu">
                    <div className="navbar-submenu-header" onClick={toggleTodaysSubmenu}>
                      <span className="navbar-submenu-title">Today's Predictions</span>
                      <ChevronDown
                        className={`navbar-submenu-toggle ${isTodaysSubmenuOpen ? 'rotated' : ''}`}
                      />
                    </div>
                    {isTodaysSubmenuOpen && (
                      <div className="navbar-submenu-items">
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/today/win")}
                          className="navbar-dropdown-item"
                        >
                          <Trophy className="navbar-dropdown-item-icon" />
                          <span>Win/Draw</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/today/over15")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 1.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/today/over25")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 2.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/today/over35")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 3.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/today/corners")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">🎯</span>
                          <span>Corners</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/today/ggng")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>GG/NG</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/today/others")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">🎲</span>
                          <span>Others</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/today/players")}
                          className="navbar-dropdown-item"
                        >
                          <Users className="navbar-dropdown-item-icon" />
                          <span>Players</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Top Picks Submenu */}
                  <div className="navbar-submenu">
                    <div className="navbar-submenu-header" onClick={toggleTopPicksSubmenu}>
                      <span className="navbar-submenu-title">Top Picks</span>
                      <ChevronDown
                        className={`navbar-submenu-toggle ${isTopPicksSubmenuOpen ? 'rotated' : ''}`}
                      />
                    </div>
                    {isTopPicksSubmenuOpen && (
                      <div className="navbar-submenu-items">
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/top-picks/win")}
                          className="navbar-dropdown-item"
                        >
                          <Trophy className="navbar-dropdown-item-icon" />
                          <span>Win/Draw</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/top-picks/over15")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 1.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/top-picks/over25")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 2.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/top-picks/over35")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 3.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/top-picks/corners")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">🎯</span>
                          <span>Corners</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/top-picks/ggng")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>GG/NG</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/top-picks/others")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">🎲</span>
                          <span>Others</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/top-picks/players")}
                          className="navbar-dropdown-item"
                        >
                          <Users className="navbar-dropdown-item-icon" />
                          <span>Players</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* All Predictions Submenu */}
                  <div className="navbar-submenu">
                    <div className="navbar-submenu-header" onClick={toggleAllPredictionsSubmenu}>
                      <span className="navbar-submenu-title">All Predictions</span>
                      <ChevronDown
                        className={`navbar-submenu-toggle ${isAllPredictionsSubmenuOpen ? 'rotated' : ''}`}
                      />
                    </div>
                    {isAllPredictionsSubmenuOpen && (
                      <div className="navbar-submenu-items">
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/win")}
                          className="navbar-dropdown-item"
                        >
                          <Trophy className="navbar-dropdown-item-icon" />
                          <span>Win/Draw</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/over15")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 1.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/over25")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 2.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/over35")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>Over/Under 3.5</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/corners")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">🎯</span>
                          <span>Corners</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/ggng")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">⚽</span>
                          <span>GG/NG</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/others")}
                          className="navbar-dropdown-item"
                        >
                          <span className="navbar-dropdown-item-icon">🎲</span>
                          <span>Others</span>
                        </button>
                        <button
                          onClick={() => handleProtectedNavigation("/predictions/players")}
                          className="navbar-dropdown-item"
                        >
                          <Users className="navbar-dropdown-item-icon" />
                          <span>Players</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* VIP Button */}
            <button
              onClick={() => handleProtectedNavigation((user?.vipTier === 'vip' || user?.vipTier === 'vvip') ? "/predictions/vip" : "/vip")}
              className="navbar-link navbar-link-vip"
            >
              <Crown className="navbar-btn-icon" />
              <span>VIP - 99% Sure Games</span>
            </button>

            {/* Outcome Button */}
            <button
              onClick={() => handleProtectedNavigation("/outcomes")}
              className="navbar-link navbar-link-outcome"
            >
              <span>Outcomes</span>
            </button>

            {user && (
              <>
                <Link to="/profile" className="navbar-link">
                  Profile
                </Link>
              </>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="navbar-actions">
            {/* Mobile Menu Toggle - First */}
            <button
              onClick={toggleMobileMenu}
              className="navbar-mobile-toggle"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="navbar-mobile-toggle-icon" />
              ) : (
                <Menu className="navbar-mobile-toggle-icon" />
              )}
            </button>

            {/* Theme Toggle - Second */}
            <ThemeToggle />

            {user ? (
              <div className="navbar-user-section">
                <div className="navbar-user-info">
                  <div className="navbar-user-avatar">
                    <span className="navbar-user-initial">{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="navbar-user-details">
                    <span className="navbar-user-name">{user.username}</span>
                    <span className="navbar-user-role">{user.role}</span>
                  </div>
                </div>
                {/* Logout Button - Last, icon only */}
                <button onClick={handleLogout} className="navbar-logout-icon-btn">
                  <LogOut className="navbar-logout-icon" />
                </button>
              </div>
            ) : (
              <div className="navbar-auth-buttons">
                <Link to="/login" className="btn btn-primary">
                  <LogIn className="navbar-btn-icon" />
                  <span className="navbar-btn-text">Login</span>
                </Link>
                <Link to="/register" className="navbar-join-btn">
                  <UserPlus className="navbar-btn-icon" />
                  <span className="navbar-btn-text">Join Free</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div ref={mobileMenuRef} className={`navbar-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="navbar-mobile-links">
            <Link to="/" className="navbar-mobile-link" onClick={closeMobileMenu}>
              <span className="navbar-mobile-link-icon">🏠</span>
              <span>Home</span>
            </Link>

            {/* Today's Predictions Submenu */}
            <div className="navbar-mobile-submenu">
              <button
                className="navbar-mobile-submenu-header"
                onClick={() => setIsTodaysMobileOpen(!isTodaysMobileOpen)}
              >
                <span className="navbar-mobile-link-icon">📅</span>
                <span>Today's Predictions</span>
                <ChevronDown className={`navbar-mobile-submenu-toggle ${isTodaysMobileOpen ? 'rotated' : ''}`} />
              </button>
              {isTodaysMobileOpen && (
                <div className="navbar-mobile-submenu-items">
                  <button onClick={() => handleMobileNavigation("/predictions/today/win")} className="navbar-mobile-submenu-item">
                    🏆 Win/Draw
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/today/over15")} className="navbar-mobile-submenu-item">
                    ⚽ Over 1.5
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/today/over25")} className="navbar-mobile-submenu-item">
                    ⚽ Over 2.5
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/today/corners")} className="navbar-mobile-submenu-item">
                    🎯 Corners
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/today/ggng")} className="navbar-mobile-submenu-item">
                    ⚽ GG/NG
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/today/others")} className="navbar-mobile-submenu-item">
                    🎲 Others
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/today/players")} className="navbar-mobile-submenu-item">
                    👥 Players
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => handleMobileNavigation("/predictions/top-picks")} className="navbar-mobile-link">
              <span className="navbar-mobile-link-icon">⭐</span>
              <span>Top Picks</span>
            </button>

            <button onClick={() => handleMobileNavigation((user?.vipTier === 'vip' || user?.vipTier === 'vvip') ? "/predictions/vip" : "/vip")} className="navbar-mobile-link navbar-mobile-vip">
              <span className="navbar-mobile-link-icon">👑</span>
              <span>VIP - 99% Sure Games</span>
            </button>

            {/* Predictions Submenu */}
            <div className="navbar-mobile-submenu">
              <button
                className="navbar-mobile-submenu-header"
                onClick={() => setIsPredictionsMobileOpen(!isPredictionsMobileOpen)}
              >
                <span className="navbar-mobile-link-icon">🔮</span>
                <span>Predictions</span>
                <ChevronDown className={`navbar-mobile-submenu-toggle ${isPredictionsMobileOpen ? 'rotated' : ''}`} />
              </button>
              {isPredictionsMobileOpen && (
                <div className="navbar-mobile-submenu-items">
                  <button onClick={() => handleMobileNavigation("/predictions/win")} className="navbar-mobile-submenu-item">
                    🏆 Win/Draw
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/over15")} className="navbar-mobile-submenu-item">
                    ⚽ Over 1.5
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/over25")} className="navbar-mobile-submenu-item">
                    ⚽ Over 2.5
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/corners")} className="navbar-mobile-submenu-item">
                    🎯 Corners
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/ggng")} className="navbar-mobile-submenu-item">
                    ⚽ GG/NG
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/others")} className="navbar-mobile-submenu-item">
                    🎲 Others
                  </button>
                  <button onClick={() => handleMobileNavigation("/predictions/players")} className="navbar-mobile-submenu-item">
                    👥 Players
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => handleMobileNavigation("/outcomes")} className="navbar-mobile-link">
              <span className="navbar-mobile-link-icon">📈</span>
              <span>Outcomes</span>
            </button>

            {user && (
              <>
                <Link to="/profile" className="navbar-mobile-link" onClick={closeMobileMenu}>
                  <span className="navbar-mobile-link-icon">👤</span>
                  <span>Profile</span>
                </Link>
                <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="navbar-mobile-link">
                  <span className="navbar-mobile-link-icon">🚪</span>
                  <span>Logout</span>
                </button>
              </>
            )}
            {!user && (
              <>
                <Link to="/login" className="navbar-mobile-link" onClick={closeMobileMenu}>
                  <span className="navbar-mobile-link-icon">🔑</span>
                  <span>Login</span>
                </Link>
                <Link to="/register" className="navbar-mobile-link" onClick={closeMobileMenu}>
                  <span className="navbar-mobile-link-icon">📝</span>
                  <span>Join Free</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
