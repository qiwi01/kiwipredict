import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import api, { rawApi, decodeJwt } from './utils/api';

// Contexts
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Navbar from './components/Navbar';
import SmartsuppChat from './components/SmartsuppChat';
import Home from './pages/Home';
import Predictions from './pages/Predictions';
import Profile from './pages/Profile';
import VIP from './pages/VIP';
import UpgradeVIP from './pages/UpgradeVIP';
import VIPSuccess from './pages/VIPSuccess';
import BetConverter from './pages/BetConverter';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import Login from './pages/Login';
import Register from './pages/Register';
import Outcomes from './pages/Outcomes';
import Livescore from './pages/Livescore';
import MatchDetails from './pages/MatchDetails';
import MatchHistory from './pages/MatchHistory';
import Contact from './pages/Contact';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect to login with the current location as state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Auth Context
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

function AppContent() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const previewMode = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1';

  // Check if current path is admin-related
  const isAdminPath = location.pathname.startsWith('/admin');

  useEffect(() => {
    // Only run authentication check in browser environment
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    if (previewMode) {
      setUser({
        id: 'preview-user',
        username: 'Preview User',
        email: 'preview@localhost.test',
        favoriteTeams: ['Arsenal', 'Barcelona'],
        role: 'admin',
        vipTier: 'vvip',
        createdAt: new Date().toISOString(),
        isActive: true
      });
      setLoading(false);
      return;
    }

        // Check if user is logged in by making a request to profile endpoint
    // The backend will use httpOnly cookies + Authorization header
    // (localStorage token) to authenticate. Timeout is generous to cover
    // server cold-starts so users are not logged out prematurely.
    //
    // On Safari (and other ITP browsers) the httpOnly cookie can be blocked,
    // so we rely on the Authorization header from localStorage. If the server
    // is slow to respond (cold start) or the cookie is missing we fall back
    // to decoding the JWT token so the user stays logged in on refresh.
    const authTimeout = setTimeout(() => {
      const storedToken = localStorage.getItem('kiwi_token');
      if (storedToken) {
        const decoded = decodeJwt(storedToken);
        if (decoded && decoded.id) {
          setUser({
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
          });
          console.log('[Auth] Recovered user from token (timeout fallback)');
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }, 25000);

    api.get('/api/auth/profile', {
      timeout: 25000
    })
      .then(res => {
        setUser(res.data);
      })
      .catch(async (error) => {
        const storedToken = localStorage.getItem('kiwi_token');

        if (!storedToken) {
          // No stored token — definitive logout
          setUser(null);
          return;
        }

        // We have a stored token. Only clear it if the server explicitly
        // rejected it (401/403). For network errors (cold start, etc.)
        // keep the user logged in from the token.
        const isAuthError = error?.response?.status === 401 ||
                            error?.response?.status === 403;

        if (isAuthError) {
          // Token is invalid/expired — try one refresh before logging out
          try {
            const refreshRes = await rawApi.post('/api/auth/refresh', {}, {
              timeout: 15000,
              _skipRetry: true,
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            if (refreshRes.data?.token) {
              localStorage.setItem('kiwi_token', refreshRes.data.token);
              const decoded = decodeJwt(refreshRes.data.token);
              if (decoded && decoded.id) {
                setUser(decoded);
                return;
              }
            }
          } catch (refreshError) {
            // refresh failed — fall through to logout
          }
          localStorage.removeItem('kiwi_token');
          setUser(null);
        } else {
          // Network error (server sleeping, timeout, etc.) with a valid token.
          // Decode the JWT and keep the user logged in. The profile will be
          // refreshed later when the server responds.
          const decoded = decodeJwt(storedToken);
          if (decoded && decoded.id) {
            setUser({
              id: decoded.id,
              username: decoded.username,
              role: decoded.role
            });
            console.log('[Auth] Kept user logged in via token (network error)');

            // Best-effort: try to fetch full profile in the background
            setTimeout(() => {
              api.get('/api/auth/profile', { timeout: 15000, _skipRetry: true })
                .then(res => {
                  setUser(prev => ({ ...prev, ...res.data }));
                })
                .catch(() => {});
            }, 5000);
          } else {
            setUser(null);
          }
        }
      })
      .finally(() => {
        clearTimeout(authTimeout);
        setLoading(false);
      });

    return () => clearTimeout(authTimeout);
  }, [previewMode]);

  const login = (userData, token) => {
    setUser(userData);
    if (token) {
      try {
        localStorage.setItem('kiwi_token', token);
      } catch (e) {
        // ignore storage errors
      }
    }
    toast.success('Logged in successfully!');
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      try {
        localStorage.removeItem('kiwi_token');
      } catch (e) {
        // ignore storage errors
      }
      setUser(null);
      toast.success('Logged out successfully!');
    }
  };

  const register = (userData, token) => {
    setUser(userData);
    if (token) {
      try {
        localStorage.setItem('kiwi_token', token);
      } catch (e) {
        // ignore storage errors
      }
    }
    toast.success('Account created successfully!');
  };

  if (loading) {
    return (
      <div className="predictions-loading">
        <div className="predictions-loading-spinner"></div>
        <div className="predictions-loading-text">
          <div className="predictions-loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          Initializing application...
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      <div className="app-container">
        {!isAdminPath && <Navbar />}
        <main className="app-main">
          <Routes>
            {/* Home page - accessible without authentication */}
            <Route path="/" element={<Home />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/livescore" element={<Livescore />} />
            <Route path="/match/:id" element={<MatchDetails />} />
            <Route path="/match/:id/history" element={<MatchHistory />} />

            {/* All other routes require authentication */}
            <Route path="/predictions" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />

            {/* Top Picks */}
            <Route path="/predictions/top-picks" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/top-picks/win" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/top-picks/over15" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/top-picks/over25" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/top-picks/over35" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/top-picks/corners" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/top-picks/ggng" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/top-picks/others" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/top-picks/players" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />

            {/* VIP */}
            <Route path="/predictions/vip" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />

            {/* Today's Predictions */}
            <Route path="/predictions/today/win" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/today/over15" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/today/over25" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/today/over35" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/today/corners" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/today/ggng" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/today/others" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/today/players" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />

            {/* All Predictions */}
            <Route path="/predictions/win" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/over15" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/over25" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/over35" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/corners" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/ggng" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/others" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="/predictions/player" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />
            {/* Keep the old route for backward compatibility */}
            <Route path="/predictions/players" element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            } />

            {/* Profile - requires authentication */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={user?.role === 'admin' ? <Navigate to="/admin/dashboard" /> : <AdminLogin />}
            />
            <Route
              path="/admin/dashboard"
              element={user?.role === 'admin' ? <Admin /> : <Navigate to="/admin" />}
            />

            {/* Auth routes - accessible without authentication */}
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to="/" />}
            />
            <Route
              path="/register"
              element={!user ? <Register /> : <Navigate to="/" />}
            />

            {/* VIP and Outcomes - require authentication */}
            <Route path="/vip" element={
              <ProtectedRoute>
                <VIP />
              </ProtectedRoute>
            } />
            <Route path="/upgrade-vip" element={
              <ProtectedRoute>
                <UpgradeVIP />
              </ProtectedRoute>
            } />
            <Route path="/vip/success" element={
              <ProtectedRoute>
                <VIPSuccess />
              </ProtectedRoute>
            } />
            <Route path="/vip/converter" element={
              <ProtectedRoute>
                <BetConverter />
              </ProtectedRoute>
            } />
            <Route path="/outcomes" element={
              <ProtectedRoute>
                <Outcomes />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'kiwi-toast',
          }}
        />
        <SmartsuppChat />
      </div>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
