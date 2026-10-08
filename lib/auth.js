'use strict';
/* Auth helpers: password hashing, recovery codes, admin guard. */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const hashPassword = (pw) => bcrypt.hashSync(pw, 12);
const verifyPassword = (pw, hash) => bcrypt.compareSync(pw, hash);

/* Human-friendly one-time recovery code, e.g. "K7Q2-9XMD-4PLR" */
function genRecoveryCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from(crypto.randomBytes(4)).map(b => chars[b % chars.length]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}

/* Redirects unauthenticated visitors away from /admin/* (except allowlist). */
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.redirect('/admin/login');
}

module.exports = { hashPassword, verifyPassword, genRecoveryCode, requireAdmin };
