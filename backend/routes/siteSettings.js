const express = require('express');
const SiteSettings = require('../models/SiteSettings');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

const SETTINGS_KEY = 'global';

const getOrCreateSettings = async () => {
  let settings = await SiteSettings.findOne({ key: SETTINGS_KEY });

  if (!settings) {
    settings = await SiteSettings.create({ key: SETTINGS_KEY });
  }

  return settings;
};

router.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/announcements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { enabled, title, rotationSpeed, items } = req.body;

    const sanitizedItems = Array.isArray(items)
      ? items
          .map(item => ({
            text: String(item?.text || '').trim(),
            isActive: item?.isActive !== false
          }))
          .filter(item => item.text)
      : [];

    const settings = await getOrCreateSettings();
    settings.announcements = {
      enabled: enabled !== false,
      title: String(title || 'Latest Update').trim() || 'Latest Update',
      rotationSpeed: Math.min(Math.max(Number(rotationSpeed) || 3500, 1500), 15000),
      items: sanitizedItems.length ? sanitizedItems : settings.announcements.items
    };

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;