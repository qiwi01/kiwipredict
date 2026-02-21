const express = require('express');
const League = require('../models/League');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all leagues with teams
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching leagues for user:', req.user?.id);
    const leagues = await League.find({})
      .sort({ name: 1 })
      .select('name code country teams');

    console.log(`Found ${leagues.length} leagues:`, leagues.map(l => ({ name: l.name, code: l.code })));
    res.json(leagues);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Get league by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }
    res.json(league);
  } catch (error) {
    console.error('Error fetching league:', error);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
});

// Create new league
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Creating new league:', req.body);

    const { name, code, country } = req.body;

    if (!name || !country) {
      return res.status(400).json({ error: 'Name and country are required' });
    }

    // Check for existing league with same name
    const existingName = await League.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    const leagueCode = code ? code.toUpperCase().trim() : name.trim().substring(0, 3).toUpperCase();
    const existingCode = await League.findOne({ code: leagueCode });

    if (existingName || existingCode) {
      const errorMsg = existingName
        ? 'League with this name already exists'
        : 'League with this code already exists';
      return res.status(400).json({ error: errorMsg });
    }

    const leagueData = {
      name: name.trim(),
      code: code ? code.toUpperCase().trim() : name.trim().substring(0, 3).toUpperCase(),
      country: country.trim(),
      teams: []
    };

    const league = new League(leagueData);
    await league.save();

    console.log('League created successfully:', league._id);

    res.status(201).json({
      success: true,
      message: 'League created successfully',
      league: league
    });
  } catch (error) {
    console.error('Error creating league:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'League with this name or code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create league' });
    }
  }
});

// Update league (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, code, country, teams } = req.body;

    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check for duplicate name/code if changed
    if (name && name.trim() !== league.name) {
      const existingName = await League.findOne({ name: name.trim(), _id: { $ne: league._id } });
      if (existingName) {
        return res.status(400).json({ error: 'League with this name already exists' });
      }
      league.name = name.trim();
    }

    if (code && code.toUpperCase().trim() !== league.code) {
      const existingCode = await League.findOne({ code: code.toUpperCase().trim(), _id: { $ne: league._id } });
      if (existingCode) {
        return res.status(400).json({ error: 'League with this code already exists' });
      }
      league.code = code.toUpperCase().trim();
    }

    if (country) league.country = country.trim();
    if (teams) league.teams = teams;

    await league.save();
    res.json(league);
  } catch (error) {
    console.error('Error updating league:', error);
    res.status(500).json({ error: 'Failed to update league' });
  }
});

// Add team to league (admin only)
router.post('/:id/teams', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, code, founded, stadium } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if team already exists in this league
    const existingTeam = league.teams.find(team =>
      team.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existingTeam) {
      return res.status(400).json({ error: 'Team already exists in this league' });
    }

    const newTeam = {
      name: name.trim(),
      code: code ? code.trim() : '',
      founded: founded ? parseInt(founded) : null,
      stadium: stadium ? stadium.trim() : ''
    };

    league.teams.push(newTeam);
    await league.save();

    res.status(201).json(newTeam);
  } catch (error) {
    console.error('Error adding team:', error);
    res.status(500).json({ error: 'Failed to add team' });
  }
});

// Remove team from league (admin only)
router.delete('/:id/teams/:teamIndex', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const teamIndex = parseInt(req.params.teamIndex);
    if (isNaN(teamIndex) || teamIndex < 0 || teamIndex >= league.teams.length) {
      return res.status(400).json({ error: 'Invalid team index' });
    }

    league.teams.splice(teamIndex, 1);
    await league.save();

    res.json({ message: 'Team removed successfully' });
  } catch (error) {
    console.error('Error removing team:', error);
    res.status(500).json({ error: 'Failed to remove team' });
  }
});

// Delete league (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const league = await League.findByIdAndDelete(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({ message: 'League deleted successfully' });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ error: 'Failed to delete league' });
  }
});

module.exports = router;
