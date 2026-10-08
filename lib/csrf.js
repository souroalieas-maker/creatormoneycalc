'use strict';
/* Tiny CSRF protection: per-session token, validated on state-changing POSTs. */
const crypto = require('crypto');

function csrfEnsure(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function csrfProtect(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.path === '/api/track') return next(); // same-origin analytics beacon
  const sent = req.body && req.body._csrf;
  if (sent && req.session.csrfToken && sent === req.session.csrfToken) return next();
  return res.status(403).send('Invalid form token. Please go back and try again.');
}

/*
 * Variant for GLOBAL middleware use: multipart forms (file uploads) are parsed
 * by multer inside their own route, so the global check must not reject the
 * unparsed body. Those routes apply plain csrfProtect per-route AFTER multer.
 */
csrfProtect.deferMultipart = function (req, res, next) {
  if (req.is('multipart/form-data')) return next();
  return csrfProtect(req, res, next);
};

module.exports = { csrfEnsure, csrfProtect };
