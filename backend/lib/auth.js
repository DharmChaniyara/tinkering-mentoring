// lib/auth.js
// JWT utility helpers for Vercel serverless functions.

const jwt = require('jsonwebtoken');

/**
 * Sign a JWT token with userId, name, and role.
 * @param {object} payload
 * @returns {string} Signed JWT string
 */
function signToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify the Bearer token from the Authorization header.
 * Returns the decoded payload or null if invalid.
 * @param {import('http').IncomingMessage} req
 * @returns {{ userId: number, name: string, role: string } | null}
 */
function verifyRequest(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Set CORS headers and handle OPTIONS preflight.
 * Returns true if request was an OPTIONS preflight (caller should return early).
 * @param {import('http').ServerResponse} res
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = { signToken, verifyRequest, handleCors };
