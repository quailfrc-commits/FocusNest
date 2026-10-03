import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(HERE, '.env') });

const PORT = +process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
// 主要模型忙碌（503/429）或下架（404）時，依序改試這些模型
const GEMINI_BACKUPS = (process.env.GEMINI_BACKUP_MODELS || 'gemini-flash-lite-latest').split(',').map(s => s.trim()).filter(Boolean);

/* ---------- database ---------- */
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let dbReady = false;
async function initDb(){
  // users：帳號＋密碼雜湊（scrypt）＋整包遊戲狀態。tokens：登入憑證（只存雜湊，不存明文）。
  await pool.query(`CREATE TABLE IF NOT EXISTS users(
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    pass_hash TEXT, pass_salt TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    state JSONB,
    updated_at BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS tokens(
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  dbReady = true;
}

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') });
const USERNAME_OK = /^[A-Za-z0-9_一-鿿]{3,20}$/;
const DEMO_NAME = 'admin';
const ALLOW_DEMO = process.env.ALLOW_DEMO !== '0'; // 展示帳號預設開啟；正式使用時在 .env 設 ALLOW_DEMO=0 關閉
async function issueToken(userId){
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO tokens(token_hash, user_id) VALUES($1, $2)', [sha(token), userId]);
  return token;
}
// 登入失敗太多次的 IP 暫時擋住（10 分鐘內 10 次）
const fails = new Map();
const tooMany = ip => { const f = fails.get(ip); return f && Date.now() - f.t0 < 600000 && f.n >= 10; };
const noteFail = ip => { const f = fails.get(ip); if(!f || Date.now() - f.t0 >= 600000) fails.set(ip, { n: 1, t0: Date.now() }); else f.n++; };

/* ---------- Gemini ---------- */
async function geminiOnce(model, prompt, json){
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: json ? { responseMimeType: 'application/json' } : {}
    }),
    signal: AbortSignal.timeout(20000)
  });
  if(!r.ok) throw Object.assign(new Error('gemini_' + r.status + '(' + model + ')'), { status: 502, retry: [404, 429, 500, 503].includes(r.status) });
  const data = await r.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  if(!text) throw Object.assign(new Error('empty'), { status: 502 });
  return text;
}
async function gemini(prompt, json){
  if(!GEMINI_KEY) throw Object.assign(new Error('no_key'), { status: 503 });
  let err;
  for(const model of [GEMINI_MODEL, ...GEMINI_BACKUPS]){
    try{ return { text: await geminiOnce(model, prompt, json), model }; }
    catch(e){ err = e; if(!e.retry) break; }
  }
  throw err;
}

/* ---------- app ---------- */
const app = express();
app.set('trust proxy', false);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const needDb = (req, res, next) => dbReady ? next() : res.status(503).json({ error: 'db_unavailable' });
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e.message); res.status(e.status || 500).json({ error: e.message }); });

app.get('/api/health', (req, res) => res.json({ ok: true, db: dbReady, ai: !!GEMINI_KEY, demo: ALLOW_DEMO }));

const bad = (status, error) => Object.assign(new Error(error), { status });
const auth = (req, res, next) => (async () => {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  if(!t) throw bad(401, 'unauthorized');
  const r = await pool.query('SELECT u.id, u.username, u.is_demo FROM tokens k JOIN users u ON u.id = k.user_id WHERE k.token_hash = $1', [sha(t)]);
  if(!r.rows.length) throw bad(401, 'unauthorized');
  req.user = r.rows[0]; req.token = t; next();
})().catch(e => res.status(e.status || 500).json({ error: e.message }));
const userOut = u => ({ username: u.username, demo: !!u.is_demo });

app.post('/api/auth/register', needDb, wrap(async (req, res) => {
  const username = String(req.body.username || '').trim(), pw = String(req.body.password || '');
  if(!USERNAME_OK.test(username)) throw bad(400, 'bad_username');
  if(pw.length < 6 || pw.length > 72) throw bad(400, 'bad_password');
  const name = username.toLowerCase(), { salt, hash } = hashPw(pw), id = crypto.randomUUID();
  try{ await pool.query('INSERT INTO users(id, username, pass_hash, pass_salt) VALUES($1, $2, $3, $4)', [id, name, hash, salt]); }
  catch(e){ if(e.code === '23505') throw bad(409, 'username_taken'); throw e; }
  res.json({ token: await issueToken(id), user: { username: name, demo: false } });
}));

app.post('/api/auth/login', needDb, wrap(async (req, res) => {
  if(tooMany(req.ip)) throw bad(429, 'too_many_attempts');
  const name = String(req.body.username || '').trim().toLowerCase(), pw = String(req.body.password || '');
  const r = await pool.query('SELECT id, username, is_demo, pass_hash, pass_salt FROM users WHERE username = $1', [name]);
  const u = r.rows[0];
  const ok = u && u.pass_hash && crypto.timingSafeEqual(Buffer.from(hashPw(pw, u.pass_salt).hash), Buffer.from(u.pass_hash));
  if(!ok){ noteFail(req.ip); throw bad(401, 'wrong_credentials'); }
  res.json({ token: await issueToken(u.id), user: userOut(u) });
}));

// 展示帳號：不用密碼，一鍵進入（沒有就建立）。只給展示用，資料可以一鍵重置。
app.post('/api/auth/demo', needDb, wrap(async (req, res) => {
  if(!ALLOW_DEMO) throw bad(403, 'demo_disabled');
  let r = await pool.query('SELECT id, username, is_demo FROM users WHERE username = $1', [DEMO_NAME]);
  if(!r.rows.length) r = await pool.query('INSERT INTO users(id, username, is_demo) VALUES($1, $2, true) RETURNING id, username, is_demo', [crypto.randomUUID(), DEMO_NAME]);
  res.json({ token: await issueToken(r.rows[0].id), user: userOut(r.rows[0]) });
}));

app.post('/api/auth/logout', needDb, auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM tokens WHERE token_hash = $1', [sha(req.token)]);
  res.json({ ok: true });
}));

app.get('/api/state', needDb, auth, wrap(async (req, res) => {
  const r = await pool.query('SELECT state, updated_at FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: userOut(req.user), state: r.rows[0].state, updatedAt: +r.rows[0].updated_at });
}));

app.put('/api/state', needDb, auth, wrap(async (req, res) => {
  const updatedAt = Date.now();
  await pool.query('UPDATE users SET state = $2, updated_at = $3 WHERE id = $1', [req.user.id, req.body.state, updatedAt]);
  res.json({ updatedAt });
}));

/* 即時專注狀態：手機專注中每秒傳上來，電腦來讀，就能同步看到「手機正在專注」。
   只放記憶體（不進資料庫）；超過 15 秒沒更新就當作已經結束（例如手機沒電、斷線）。 */
const live = new Map(); // userId -> 最新狀態
const liveLog = (event, user, state) => console.log(`  即時專注｜${event}｜${user}｜${state.deviceName || '未知裝置'}｜${state.task || '自由專注'}`);
app.put('/api/live', needDb, auth, wrap(async (req, res) => {
  const b = req.body || {};
  const prev = live.get(req.user.id);
  if(!b.active){
    if(prev){
      const event = prev.overlay === 'result' ? '番茄鐘完成' : prev.overlay === 'fail' ? '專注失敗' : prev.overlay === 'quit' ? '取消專注' : '專注結束';
      liveLog(event, req.user.username, prev); live.delete(req.user.id);
    }
    return res.json({ ok: true });
  }
  const next = {
    active: true, device: String(b.device || '').slice(0, 40), phase: b.phase === 'break' ? 'break' : 'focus',
    deviceName: String(b.deviceName || '').slice(0, 60),
    task: String(b.task || '').slice(0, 100), total: +b.total || 0, remain: Math.max(0, +b.remain || 0),
    picks: +b.picks || 0, picked: !!b.picked, paused: !!b.paused, overlay: String(b.overlay || '').slice(0, 12), at: Date.now()
  };
  if(!prev || prev.device !== next.device) liveLog('番茄鐘開始', req.user.username, next);
  else if(prev.picked !== next.picked) liveLog(next.picked ? '手機拿起' : '手機放回', req.user.username, next);
  else if(prev.phase !== next.phase) liveLog(next.phase === 'break' ? '休息開始' : '專注開始', req.user.username, next);
  live.set(req.user.id, next);
  res.json({ ok: true });
}));
app.get('/api/live', needDb, auth, wrap(async (req, res) => {
  const l = live.get(req.user.id), now = Date.now();
  if(!l) return res.json({ active: false });
  if(now - l.at > 15000){ liveLog('裝置失去連線', req.user.username, l); live.delete(req.user.id); return res.json({ active: false }); }
  res.json({ ...l, age: now - l.at });
}));

app.post('/api/ai/split', needDb, auth, wrap(async (req, res) => {
  const title = String(req.body.title || '').slice(0, 100);
  const prompt = '你是一個幫大學生拆解任務的助理。把下面這個大任務拆成 4 到 6 個具體、可直接開始執行的小任務，依執行順序排列。每個小任務要用動詞開頭，預估 10 到 180 分鐘，並附上一句可客觀判斷是否完成的完成條件。使用繁體中文，標題不超過 18 個字，完成條件不超過 45 個字。不要再建立下一層任務。\n大任務：「' + title + '」\n只回傳 JSON 陣列，格式：[{"title":"...","criteria":"完成時應具備的具體成果","minutes":40}]';
  const started = Date.now(), out = await gemini(prompt, true), r = JSON.parse(out.text), receivedAt = new Date().toISOString();
  console.log(`  Gemini 真實回傳：任務拆解 · ${out.model} · ${Date.now() - started}ms`);
  res.json({ list: Array.isArray(r) ? r : (r && r.tasks) || [], provider: 'Gemini', model: out.model, receivedAt });
}));

app.post('/api/ai/diary', needDb, auth, wrap(async (req, res) => {
  const b = req.body;
  const prompt = '你是一隻叫「' + b.petName + '」的鵪鶉寵物，住在一個幫主人專注讀書的 App 裡。請用第一人稱、' + b.tone + '的語氣，寫一篇 80 到 120 字的繁體中文日記，回顧主人今天的表現。不要用表情符號，不要加標題。\n今天的數據：完成番茄鐘 ' + b.n + ' 顆（' + b.min + ' 分鐘）、專注中拿起手機 ' + b.picks + ' 次、連續專注天數 ' + b.streak + ' 天、今天完成的任務：' + (b.done && b.done.length ? b.done.join('、') : '沒有') + '。';
  const started = Date.now(), out = await gemini(prompt, false), receivedAt = new Date().toISOString();
  console.log(`  Gemini 真實回傳：寵物日記 · ${out.model} · ${Date.now() - started}ms`);
  res.json({ text: out.text, provider: 'Gemini', model: out.model, receivedAt });
}));

/* 網頁版：client build 後由這裡直接提供 */
const dist = path.join(HERE, '../client/dist');
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html'), err => err && res.status(404).end()));

app.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('專注小窩後端已啟動');
  console.log('  本機：http://localhost:' + PORT);
  ips.forEach(ip => console.log('  區網（手機用）：http://' + ip + ':' + PORT));
  console.log('  展示帳號 admin：' + (ALLOW_DEMO ? '開啟（登入畫面可以一鍵進入）' : '關閉'));
  console.log('  Gemini：' + (GEMINI_KEY ? '已設定（' + GEMINI_MODEL + '）' : '未設定，AI 會改用範本'));
});
initDb().then(() => console.log('  資料庫：已連線')).catch(e => console.log('  資料庫：無法連線（' + (e.message || e.code || (e.errors && e.errors[0] && e.errors[0].code) || '未知錯誤') + '），同步功能暫停，App 仍可離線使用'));
