const axios = require('axios');

// Keep-alive function to prevent Render from sleeping
const keepAlive = async () => {
  try {
    const url = process.env.KEEPALIVE_URL || `http://localhost:${process.env.PORT || 5000}`;
    console.log(`Keep-alive ping to: ${url}`);

    await axios.get(`${url}/health`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Render-KeepAlive/1.0'
      }
    });

    console.log('Keep-alive ping successful');
  } catch (error) {
    console.log('Keep-alive ping failed:', error.message);
  }
};

// Start keep-alive interval (every 10 minutes)
const startKeepAlive = () => {
  // Only run in production on Render
  if (process.env.RENDER_SERVICE_ID) {
    console.log('Starting keep-alive mechanism for Render...');
    setInterval(keepAlive, 10 * 60 * 1000); // Every 10 minutes
  }
};

module.exports = { keepAlive, startKeepAlive };