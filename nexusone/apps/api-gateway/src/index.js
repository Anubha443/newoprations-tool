import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { verifyToken } = require('../../../packages/shared-auth/src/index.js');
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

async function authRequired(req, res, next) {
  try {
    const token = req.cookies.access_token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing token' });
    req.user = verifyToken(token, ACCESS_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function audit(req, module, action, entity_type, entity_id, changes) {
  await pool.query(
    `INSERT INTO nexus_core.audit_logs (user_id,module,action,entity_type,entity_id,changes,ip_address,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [req.user?.sub || null, module, action, entity_type, String(entity_id || ''), changes || {}, req.ip || null]
  );
}

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
