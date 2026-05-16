const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const queue = [];
let active = 0;
const MAX_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT || 3);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function withRetry(fn, retries = 3) {
  let err;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e) { err = e; await sleep(2 ** i * 300); }
  }
  throw err;
}

function enqueue(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    runQueue();
  });
}

async function runQueue() {
  if (active >= MAX_CONCURRENT || queue.length === 0) return;
  active += 1;
  const item = queue.shift();
  try { item.resolve(await item.task()); } catch (e) { item.reject(e); } finally { active -= 1; runQueue(); }
}

function buildSystemPrompt(context_type, context_data, orgName = 'organization') {
  if (context_type === 'hrm') return `You are an HR assistant for ${orgName}. Here is relevant data: ${JSON.stringify(context_data)}`;
  if (context_type === 'crm') return `You are a sales assistant for ${orgName}. Here are open deals and CRM context: ${JSON.stringify(context_data)}`;
  if (context_type === 'comm') return `You are a communication assistant for ${orgName}. Summarize and analyze these threads/messages: ${JSON.stringify(context_data)}`;
  return `You are a general assistant for ${orgName}. Use this context: ${JSON.stringify(context_data)}`;
}

async function anthropicCall({ system, message, stream = false }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is missing');
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    stream,
    system,
    messages: [{ role: 'user', content: message }],
  };
  return withRetry(async () => {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    return res;
  });
}

function actionPrompt(actionType, payload) {
  return {
    summarize_thread: `Summarize this thread:\n${JSON.stringify(payload)}`,
    screen_resume: `Score this resume 0-100 and explain:\n${JSON.stringify(payload)}`,
    enrich_contact: `Enrich this contact with useful public-profile style insights:\n${JSON.stringify(payload)}`,
    forecast_deal: `Predict win probability and reasoning for this deal:\n${JSON.stringify(payload)}`,
    draft_email: `Draft a high quality email from this context:\n${JSON.stringify(payload)}`,
    generate_report: `Generate a concise report from this data:\n${JSON.stringify(payload)}`,
    detect_anomaly: `Detect unusual patterns and explain anomalies:\n${JSON.stringify(payload)}`,
  }[actionType] || `Handle this action ${actionType}: ${JSON.stringify(payload)}`;
}

module.exports = { enqueue, anthropicCall, buildSystemPrompt, actionPrompt };
