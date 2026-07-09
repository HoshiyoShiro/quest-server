const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4545;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const PROFILE_NAME_RE = /^[a-zA-Z0-9_-]{1,30}$/;
function profilePath(name) { return path.join(DATA_DIR, name + '.json'); }

const BACKUP_KEEP = 7;
// Snapshot a profile once per day before its first overwrite, keep the last 7.
function backupProfile(name) {
  const file = profilePath(name);
  if (!fs.existsSync(file)) return;
  const dir = path.join(DATA_DIR, '_backups', name);
  fs.mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const dest = path.join(dir, today + '.json');
  if (fs.existsSync(dest)) return;
  fs.copyFileSync(file, dest);
  const old = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  while (old.length > BACKUP_KEEP) fs.unlinkSync(path.join(dir, old.shift()));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 5 * 1024 * 1024) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  rel = rel.split('?')[0];
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    if (p === '/api/profiles' && req.method === 'GET') {
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
      return sendJson(res, 200, { profiles: files.map(f => f.slice(0, -5)) });
    }

    if (p === '/api/profiles' && req.method === 'POST') {
      const body = await readBody(req);
      const name = (body.name || '').trim();
      if (!PROFILE_NAME_RE.test(name)) {
        return sendJson(res, 400, { error: 'Profile names can only use letters, numbers, - and _, up to 30 characters.' });
      }
      const file = profilePath(name);
      if (fs.existsSync(file)) return sendJson(res, 409, { error: 'A profile with that name already exists.' });
      fs.writeFileSync(file, JSON.stringify({}), 'utf8');
      return sendJson(res, 200, { ok: true, name });
    }

    const profileMatch = p.match(/^\/api\/(?:state|profiles)\/([^/]+)$/);
    if (profileMatch) {
      const name = decodeURIComponent(profileMatch[1]);
      if (!PROFILE_NAME_RE.test(name)) return sendJson(res, 400, { error: 'Invalid profile name.' });
      const file = profilePath(name);

      if (p.startsWith('/api/state/') && req.method === 'GET') {
        if (!fs.existsSync(file)) return sendJson(res, 404, { error: 'Profile not found.' });
        const raw = fs.readFileSync(file, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(raw || '{}');
      }

      if (p.startsWith('/api/state/') && req.method === 'PUT') {
        const body = await readBody(req);
        try { backupProfile(name); } catch (e) { console.error('Backup failed for ' + name + ':', e.message); }
        fs.writeFileSync(file, JSON.stringify(body ?? {}), 'utf8');
        return sendJson(res, 200, { ok: true });
      }

      if (p.startsWith('/api/profiles/') && req.method === 'DELETE') {
        if (fs.existsSync(file)) fs.unlinkSync(file);
        return sendJson(res, 200, { ok: true });
      }
    }

    if (p.startsWith('/api/')) return sendJson(res, 404, { error: 'Unknown API route.' });

    return serveStatic(req, res, p);
  } catch (e) {
    return sendJson(res, 500, { error: e.message || 'Server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Quest Log server running on http://0.0.0.0:${PORT}`);
  console.log(`Data stored in: ${DATA_DIR}`);
});
