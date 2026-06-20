const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/leaderboard — top 50 students by accuracy (minimum 10 questions attempted
// so a single lucky streak doesn't dominate the board)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.username,
        p.total_attempted,
        p.total_correct,
        p.best_streak,
        ROUND(100.0 * p.total_correct / p.total_attempted, 1) AS accuracy
      FROM progress p
      JOIN users u ON u.id = p.user_id
      WHERE p.total_attempted >= 10
      ORDER BY accuracy DESC, p.total_attempted DESC
      LIMIT 50
    `);
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load leaderboard' });
  }
});

module.exports = router;
