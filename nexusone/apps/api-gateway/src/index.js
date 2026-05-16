import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { verifyToken, hashPassword, verifyPassword, signAccessToken, signRefreshToken } = require('../../../packages/shared-auth/src/index.js');
const app = express();
const { Pool } = pg;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'nexusone',
  user: process.env.POSTGRES_USER || 'nexus',
  password: process.env.POSTGRES_PASSWORD || 'nexus',
});

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

const orgLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  keyGenerator: (req) => req.user?.organization_id || req.ip,
});

const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
});

async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = verifyToken(token, ACCESS_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email,
      organization_id: payload.organization_id,
      roles: payload.roles,
      module_access: payload.module_access,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function audit(req, module, action, entity_type, entity_id, changes) {
  await pool.query(
    `INSERT INTO nexus_core.audit_logs (user_id,module,action,entity_type,entity_id,changes,ip_address,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [req.user?.id || null, module, action, entity_type, String(entity_id || ''), changes || {}, req.ip || null]
  );
}

app.post('/auth/register', authRateLimiter, async (req, res) => {
  const { org_name, org_slug, email, password, full_name } = req.body || {};
  if (!org_name || !org_slug || !email || !password || !full_name) {
    return res.status(400).json({ error: 'org_name, org_slug, email, password, full_name are required' });
  }
  const existingEmail = await pool.query('SELECT id FROM nexus_core.users WHERE email = $1', [email]);
  if (existingEmail.rowCount > 0) return res.status(409).json({ error: 'Email already registered' });
  const existingSlug = await pool.query('SELECT id FROM nexus_core.organizations WHERE slug = $1', [org_slug]);
  if (existingSlug.rowCount > 0) return res.status(409).json({ error: 'Organization slug already taken' });

  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const password_hash = await hashPassword(password);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO nexus_core.organizations (id,name,slug,plan,settings,created_at)
       VALUES ($1,$2,$3,'starter',$4,NOW())`,
      [orgId, org_name, org_slug, {}]
    );
    await client.query(
      `INSERT INTO nexus_core.users (id,email,password_hash,full_name,organization_id,roles,module_access,created_at,updated_at,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW(),true)`,
      [userId, email, password_hash, full_name, orgId, ['owner'], { comm: true, hrm: true, crm: true }]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      user: { id: userId, email, full_name, roles: ['owner'] },
      organization: { id: orgId, name: org_name, slug: org_slug },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Registration failed', detail: e.message });
  } finally {
    client.release();
  }
});

app.post('/auth/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const q = await pool.query('SELECT id,email,password_hash,full_name,roles,module_access,organization_id FROM nexus_core.users WHERE email = $1 AND is_active = true', [email]);
  const user = q.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });

  const payload = {
    sub: user.id,
    email: user.email,
    organization_id: user.organization_id,
    roles: user.roles,
    module_access: user.module_access,
  };
  const access_token = signAccessToken(payload, ACCESS_SECRET);
  const refresh_token = signRefreshToken(payload, REFRESH_SECRET);

  res.cookie('nexus_refresh', refresh_token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await pool.query('UPDATE nexus_core.users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
  return res.status(200).json({
    access_token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      module_access: user.module_access,
    },
  });
});

app.post('/auth/refresh', authRateLimiter, async (req, res) => {
  const token = req.cookies.nexus_refresh;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = verifyToken(token, REFRESH_SECRET);
    const access_token = signAccessToken({
      sub: payload.sub,
      email: payload.email,
      organization_id: payload.organization_id,
      roles: payload.roles,
      module_access: payload.module_access,
    }, ACCESS_SECRET);
    return res.status(200).json({ access_token });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/auth/logout', async (_req, res) => {
  res.cookie('nexus_refresh', '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    expires: new Date(0),
  });
  return res.status(200).json({ message: 'Logged out' });
});

app.get('/auth/me', authRequired, async (req, res) => {
  const q = await pool.query(
    `SELECT u.id,u.email,u.full_name,u.avatar_url,u.roles,u.module_access,o.id AS org_id,o.name AS org_name,o.slug AS org_slug
     FROM nexus_core.users u
     JOIN nexus_core.organizations o ON o.id = u.organization_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  if (q.rowCount === 0) return res.status(404).json({ error: 'User not found' });
  const u = q.rows[0];
  return res.status(200).json({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    roles: u.roles,
    module_access: u.module_access,
    organization: { id: u.org_id, name: u.org_name, slug: u.org_slug },
  });
});

app.post('/auth/invite', authRequired, async (req, res) => {
  const { email, roles, module_access } = req.body || {};
  if (!email || !Array.isArray(roles) || typeof module_access !== 'object' || module_access === null) {
    return res.status(400).json({ error: 'email, roles (array), module_access (object) are required' });
  }
  const existing = await pool.query('SELECT id FROM nexus_core.users WHERE email = $1', [email]);
  if (existing.rowCount > 0) return res.status(409).json({ error: 'Email already registered' });

  await pool.query(
    `CREATE TABLE IF NOT EXISTS nexus_core.invites (
      id UUID PRIMARY KEY,
      org_id UUID NOT NULL,
      email TEXT NOT NULL,
      roles TEXT[] NOT NULL,
      module_access JSONB NOT NULL,
      token UUID NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  await pool.query(
    `INSERT INTO nexus_core.invites (id,org_id,email,roles,module_access,token,expires_at,created_by,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW() + INTERVAL '24 hours',$7,NOW())`,
    [id, req.user.organization_id, email, roles, module_access, token, req.user.id]
  );

  console.log(`INVITE EMAIL: To ${email}, token: ${token}`);
  return res.status(201).json({ message: 'Invite sent', email });
});

app.use(authRequired, orgLimiter);

app.post('/integrations/deal-won-notification', async (req, res) => {
  const { deal_name, amount, channel_id } = req.body;
  const msg = `🎉 Deal won: ${deal_name} for $${amount}`;
  await fetch('http://comm-service:8001/comm/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
    body: JSON.stringify({ channel: channel_id, topic_name: 'wins', content: msg, content_type: 'plain' }),
  });
  await audit(req, 'crm', 'create', 'message', channel_id, { content: msg });
  res.json({ ok: true });
});

app.post('/integrations/leave-approved-notification', async (req, res) => {
  const { employee_user_id, dm_id, leave_type, from_date, to_date } = req.body;
  const content = `Your leave (${leave_type}) from ${from_date} to ${to_date} has been approved.`;
  await fetch('http://comm-service:8001/comm/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
    body: JSON.stringify({ channel: dm_id, topic_name: 'leave', content, content_type: 'plain' }),
  });
  await audit(req, 'hrm', 'update', 'leave_request', employee_user_id, { approved: true });
  res.json({ ok: true });
});

app.post('/integrations/new-employee-setup', async (req, res) => {
  const { email, full_name, organization_id, default_channels = [] } = req.body;
  const userId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO nexus_core.users (id,email,password_hash,full_name,organization_id,roles,module_access,created_at,updated_at,is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW(),true)
     ON CONFLICT (email) DO NOTHING`,
    [userId, email, 'TEMP_RESET_REQUIRED', full_name, organization_id, ['employee'], { comm: true, hrm: true, crm: false }]
  );
  for (const c of default_channels) {
    await fetch('http://comm-service:8001/comm/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify({ org_id: organization_id, name: c, description: 'default', type: 'public' }),
    });
  }
  await audit(req, 'hrm', 'create', 'employee', userId, { email, full_name });
  res.json({ ok: true, user_id: userId });
});

app.get('/integrations/search', async (req, res) => {
  const q = req.query.q || '';
  const comm = await pool.query(`SELECT id, content AS label FROM nexus_comm.messages WHERE content ILIKE $1 LIMIT 10`, [`%${q}%`]);
  const hrm = await pool.query(`SELECT id, employee_code AS label FROM nexus_hrm.employees WHERE employee_code ILIKE $1 LIMIT 10`, [`%${q}%`]);
  const crm = await pool.query(`SELECT id, first_name || ' ' || last_name AS label FROM nexus_crm.contacts WHERE first_name ILIKE $1 OR last_name ILIKE $1 LIMIT 10`, [`%${q}%`]);
  res.json({ query: q, results: { comm: comm.rows, hrm: hrm.rows, crm: crm.rows } });
});

app.get('/health', (_req, res) => res.json({ service: 'api-gateway', status: 'ok' }));

app.listen(process.env.PORT || 4000, () => console.log('api-gateway ready'));
