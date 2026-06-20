const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/progress — fetch the logged-in user's stored progress
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT data FROM progress WHERE user_id = $1`, [req.userId]);
    if (result.rows.length === 0) {
      return res.json({ data: {} });
    }
    res.json({ data: result.rows[0].data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load progress' });
  }
});

// PUT /api/progress  { data: {...} } — upsert the full progress object
// Also extracts a few fields into plain columns so the leaderboard query stays fast.
router.put('/', requireAuth, async (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'data object is required' });
  }
  const totalAttempted = Number(data.totalAttempted) || 0;
  const totalCorrect = Number(data.totalCorrect) || 0;
  const bestStreak = Number(data.bestStreak) || 0;

  try {
    await pool.query(
      `INSERT INTO progress (user_id, data, total_attempted, total_correct, best_streak, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (user_id)
       DO UPDATE SET data = $2, total_attempted = $3, total_correct = $4, best_streak = $5, updated_at = now()`,
      [req.userId, data, totalAttempted, totalCorrect, bestStreak]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save progress' });
  }
});

module.exports = router;
