const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MAX_REQUESTS_PER_HOUR = 30;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function isRateLimited(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM ai_requests WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
    [userId]
  );
  return Number(result.rows[0].count) >= MAX_REQUESTS_PER_HOUR;
}

// POST /api/ai/explain  { question, officialExplanation, userContext }
// Requires login so the proxy can't be abused as a free, anonymous AI endpoint.
router.post('/explain', requireAuth, async (req, res) => {
  const { question, officialExplanation, userContext } = req.body || {};
  if (!question || !officialExplanation || !userContext) {
    return res.status(400).json({ error: 'question, officialExplanation, and userContext are required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'The AI tutor isn\'t configured on this server yet (missing GEMINI_API_KEY).' });
  }

  if (await isRateLimited(req.userId)) {
    return res.status(429).json({ error: 'You\'ve hit the hourly limit for AI explanations. Try again soon.' });
  }

  const systemPrompt = `You are a friendly, encouraging cybersecurity tutor helping a student build foundational understanding. You'll be given a practice question, the official explanation, and details about how the student answered. Write a SHORT (3-5 sentences), plain-language explanation that:
- If they got it wrong, gently addresses the likely misconception behind their specific wrong choice (don't just repeat the official explanation)
- Uses a simple real-world analogy if it helps
- Stays encouraging and never condescending
- Does not just restate the original explanation verbatim
Respond with plain text only, no markdown headers.`;

  const userMsg = `Question: ${question}\nOfficial explanation: ${officialExplanation}\n${userContext}\n\nExplain this differently so it clicks for them.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return res.status(502).json({ error: 'The AI tutor is unavailable right now. Try again shortly.' });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim();

    await pool.query(`INSERT INTO ai_requests (user_id) VALUES ($1)`, [req.userId]);

    res.json({ explanation: text || "Sorry, I couldn't generate an explanation just now — try again." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong reaching the AI tutor' });
  }
});

module.exports = router;
