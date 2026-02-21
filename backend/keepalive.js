const axios = require('axios');

// Keep-alive function to prevent Render from sleeping
// This uses multiple strategies to keep the service awake

// Strategy 1: Self-ping (works when service is already awake)
const selfPing = async () => {
  try {
    const url = process.env.KEEPALIVE_URL || `http://localhost:${process.env.PORT || 5000}`;
    console.log(`[KeepAlive] Self-ping to: ${url}/health`);

    const response = await axios.get(`${url}/health`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'KiwiPredict-KeepAlive/1.0'
      }
    });

    console.log('[KeepAlive] Self-ping successful:', response.data?.status || 'OK');
    return true;
  } catch (error) {
    console.log('[KeepAlive] Self-ping failed:', error.message);
    return false;
  }
};

// Strategy 2: External ping (pings the actual deployed URL)
const externalPing = async () => {
  // List of URLs to ping (add your deployed URLs here)
  const urls = [
    process.env.BACKEND_URL, // e.g., https://kiwipredict-backend.onrender.com
    process.env.RENDER_EXTERNAL_URL, // Automatically set by Render
  ].filter(Boolean);

  if (urls.length === 0) {
    console.log('[KeepAlive] No external URLs configured for ping');
    return false;
  }

  for (const url of urls) {
    try {
      console.log(`[KeepAlive] External ping to: ${url}/health`);
      
      const response = await axios.get(`${url}/health`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'KiwiPredict-KeepAlive/1.0',
          'Cache-Control': 'no-cache'
        }
      });

      console.log(`[KeepAlive] External ping to ${url} successful`);
      return true;
    } catch (error) {
      console.log(`[KeepAlive] External ping to ${url} failed:`, error.message);
    }
  }

  return false;
};

// Main keep-alive function that tries multiple strategies
const keepAlive = async () => {
  console.log('[KeepAlive] Running keep-alive check...');
  
  // Try self-ping first
  const selfResult = await selfPing();
  
  // If self-ping works, also try external ping for redundancy
  if (selfResult && process.env.RENDER_SERVICE_ID) {
    await externalPing();
  }
};

// Start keep-alive interval
const startKeepAlive = () => {
  // Only run in production on Render
  if (process.env.RENDER_SERVICE_ID || process.env.NODE_ENV === 'production') {
    console.log('[KeepAlive] Starting keep-alive mechanism...');
    console.log('[KeepAlive] Service ID:', process.env.RENDER_SERVICE_ID || 'local');
    console.log('[KeepAlive] External URL:', process.env.RENDER_EXTERNAL_URL || 'not set');
    
    // Run immediately
    keepAlive();
    
    // Run every 5 minutes (300000ms) - well under Render's 15-minute sleep timeout
    setInterval(keepAlive, 5 * 60 * 1000);
    
    // Also run at random intervals to avoid predictable patterns
    setInterval(keepAlive, (4 + Math.random() * 2) * 60 * 1000);
  } else {
    console.log('[KeepAlive] Running in development mode - keep-alive disabled');
  }
};

// Export a manual wake-up endpoint handler
const wakeUpHandler = async (req, res) => {
  const status = {
    service: 'KiwiPredict Backend',
    status: 'awake',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(status);
};

module.exports = { 
  keepAlive, 
  startKeepAlive, 
  wakeUpHandler,
  selfPing,
  externalPing 
};