const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

const ROLES = ['owner', 'admin', 'hr_manager', 'sales_rep', 'employee', 'viewer'];

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signAccessToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TTL });
}

function signRefreshToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TTL });
}

function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

function buildTokenPair(user, accessSecret, refreshSecret) {
  const payload = {
    sub: user.id,
    email: user.email,
    organization_id: user.organization_id,
    roles: user.roles,
    module_access: user.module_access
  };

  return {
    accessToken: signAccessToken(payload, accessSecret),
    refreshToken: signRefreshToken(payload, refreshSecret)
  };
}

module.exports = {
  ACCESS_TTL,
  REFRESH_TTL,
  ROLES,
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyToken,
  buildTokenPair
};
