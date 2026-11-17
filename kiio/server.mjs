// kiio-Server: kleiner Node-Server statt Netlify.
// - liefert die Seite aus DIST_DIR (mit SPA-Fallback auf index.html, außer SPA=0)
// - führt die Netlify Functions (v2: Request → Response) unter ihren Pfaden aus (auch /pfad/:param)
// - "-background"-Functions antworten sofort mit 202 und laufen im Hintergrund weiter
// - liest [[redirects]] und [[headers]] aus netlify.toml (NETLIFY_TOML)
// - Netlify Forms: POST mit "form-name" wird unter FORMS_DIR gespeichert;
//   die Function "submission-created" läuft nur mit FORM_HOOK=1
// - geplante Functions (config.schedule) laufen nur mit SCHEDULES=1
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

const PORT = Number(process.env.PORT || 3000)
const DIST = path.resolve(process.env.DIST_DIR || '/app/dist')
const FN_DIR = process.env.FN_DIR || '/app/fn'
const API_PREFIX = (process.env.API_PREFIX || '').replace(/\/+$/, '')
const SPA = process.env.SPA !== '0'
const FORMS_DIR = process.env.FORMS_DIR || '/data/forms'
const FORM_HOOK = process.env.FORM_HOOK === '1'
const SCHEDULES = process.env.SCHEDULES === '1'
const TOML = process.env.NETLIFY_TOML || '/app/netlify.toml'

globalThis.Netlify ??= {
  env: { get: (k) => process.env[k], has: (k) => k in process.env, toObject: () => ({ ...process.env }), set: (k, v) => { process.env[k] = v }, delete: (k) => { delete process.env[k] } },
}

// ---------- netlify.toml (nur redirects + headers) ----------
function parseToml(file) {
  const out = { redirects: [], headers: [] }
  if (!fs.existsSync(file)) return out
  let cur = null
  let sub = null
  for (let line of fs.readFileSync(file, 'utf8').split('\n')) {
    line = line.replace(/\s+#.*$/, '').trim()
    if (!line || line.startsWith('#')) continue
    if (line === '[[redirects]]') { cur = {}; sub = null; out.redirects.push(cur); continue }
    if (line === '[[headers]]') { cur = { values: {} }; sub = null; out.headers.push(cur); continue }
    if (line === '[headers.values]' && cur?.values) { sub = cur.values; continue }
    if (line.startsWith('[')) { cur = null; sub = null; continue }
    const m = line.match(/^("?)([^"=]+?)\1\s*=\s*(.+)$/)
    if (!m || !cur) continue
    let v = m[3].trim()
    if (/^".*"$/.test(v)) v = JSON.parse(v)
    else if (v === 'true' || v === 'false') v = v === 'true'
    else if (/^\d+$/.test(v)) v = Number(v)
    ;(sub || cur)[m[2].trim()] = v
  }
  return out
}
const toml = parseToml(TOML)

function matchPattern(pattern, p) {
  // "/a/:id", "/a/*", "/*" → { params, splat } oder null
  const pp = pattern.split('/'), xs = p.split('/')
  const params = {}
  for (let i = 0; i < pp.length; i++) {
    if (pp[i] === '*') { params.splat = xs.slice(i).join('/'); return params }
    if (pp[i].endsWith('*')) { if (i < xs.length && xs[i].startsWith(pp[i].slice(0, -1))) return params; return null }
    if (i >= xs.length) return null
    if (pp[i].startsWith(':')) { if (!xs[i]) return null; params[pp[i].slice(1)] = decodeURIComponent(xs[i]); continue }
    if (pp[i] !== xs[i]) return null
  }
  return xs.length === pp.length || (xs.length === pp.length + 1 && xs[xs.length - 1] === '') ? params : null
}
const fill = (to, params) => to.replace(/:([a-z_]+)/gi, (_, k) => (k in params ? params[k] : `:${k}`))
const redirects = toml.redirects.filter((r) => r.from && r.to && r.from.startsWith('/'))

function headersFor(p) {
  const h = {}
  for (const rule of toml.headers) if (rule.for && matchPattern(rule.for, p)) Object.assign(h, Object.fromEntries(Object.entries(rule.values).map(([k, v]) => [k.toLowerCase(), String(v)])))
  return h
}

// ---------- Functions ----------
const routes = []
const byName = new Map()
const schedules = []
if (fs.existsSync(FN_DIR)) {
  for (const rel of fs.readdirSync(FN_DIR, { recursive: true })) {
    if (!/\.m?js$/.test(rel)) continue
    const parts = rel.split(path.sep)
    const file = parts[parts.length - 1].replace(/\.m?js$/, '')
    const name = parts.length > 1 && file === 'index' ? parts[parts.length - 2] : file
    if (parts.length > 1 && file !== 'index') continue
    const mod = await import(pathToFileURL(path.join(FN_DIR, rel)).href)
    const handler = mod.default ?? mod.handler
    if (typeof handler !== 'function') continue
    const fn = { name, handler, background: name.endsWith('-background') }
    byName.set(name, fn)
    const paths = mod.config?.path ? [].concat(mod.config.path) : []
    for (const p of paths) routes.push({ pattern: p, fn })
    routes.push({ pattern: `/.netlify/functions/${name}`, fn })
    if (mod.config?.schedule) schedules.push({ fn, cron: mod.config.schedule })
    console.log(`Function ${name}: ${['/.netlify/functions/' + name, ...paths].join(', ')}${mod.config?.schedule ? ` · Zeitplan ${mod.config.schedule}${SCHEDULES ? '' : ' (aus)'}` : ''}`)
  }
}
const findFn = (p) => { for (const r of routes) { const m = matchPattern(r.pattern, p); if (m) return { fn: r.fn, params: m } } return null }

// ---------- Static ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.pdf': 'application/pdf', '.map': 'application/json', '.wasm': 'application/wasm', '.ics': 'text/calendar; charset=utf-8', '.vcf': 'text/vcard; charset=utf-8' }

function staticFile(p) {
  let d
  try { d = decodeURIComponent(p) } catch { d = p }
  const file = path.normalize(path.join(DIST, d))
  if (!file.startsWith(DIST)) return null
  for (const c of [file, path.join(file, 'index.html'), file + '.html']) {
    try { if (fs.statSync(c).isFile()) return c } catch {}
  }
  return null
}

function sendFile(req, res, file, status = 200, extra = {}) {
  const ext = path.extname(file).toLowerCase()
  const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'x-content-type-options': 'nosniff', ...extra }
  const base = path.basename(file)
  if (!headers['cache-control']) {
    if (base === 'sw.js' || ext === '.html' || base.endsWith('.webmanifest')) headers['cache-control'] = 'no-cache'
    else if (file.includes(`${path.sep}assets${path.sep}`)) headers['cache-control'] = 'public, max-age=31536000, immutable'
  }
  res.writeHead(status, headers)
  if (req.method === 'HEAD') return res.end()
  fs.createReadStream(file).pipe(res)
}

// ---------- Function ausführen ----------
async function runFunction(fn, req, res, url, params = {}, bodyOverride, extraHeaders = {}) {
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
  const hasBody = !['GET', 'HEAD'].includes(req.method)
  const body = bodyOverride !== undefined ? bodyOverride : hasBody ? Readable.toWeb(req) : undefined
  const request = new Request(url, { method: req.method, headers, body, duplex: 'half' })
  const ip = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
  const context = makeContext(ip, params, url)
  if (fn.background) {
    res.writeHead(202); res.end()
    Promise.resolve().then(() => fn.handler(request, context)).catch((e) => console.error(`[${fn.name}]`, e))
    return
  }
  let out
  try { out = await fn.handler(request, context) } catch (e) {
    console.error(`[${fn.name}]`, e); res.writeHead(500, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: 'Interner Fehler' }))
  }
  if (!(out instanceof Response)) out = new Response(out == null ? null : String(out), { status: out == null ? 204 : 200 })
  const h = { ...extraHeaders }
  out.headers.forEach((v, k) => { h[k] = v })
  const cookies = out.headers.getSetCookie?.() || []
  if (cookies.length) h['set-cookie'] = cookies
  res.writeHead(out.status, h)
  if (!out.body || req.method === 'HEAD') return res.end()
  Readable.fromWeb(out.body).pipe(res)
}

function makeContext(ip, params, url) {
  const jar = []
  return {
    ip, params, requestId: crypto.randomUUID(), geo: {}, site: { url: url?.origin }, deploy: { context: 'production' }, account: {}, server: { region: 'kiio' },
    cookies: { get: () => undefined, set: (c) => jar.push(c), delete: () => {} },
    waitUntil: (p) => p?.catch?.((e) => console.error(e)),
    next: () => new Response('Not found', { status: 404 }),
  }
}

// ---------- Netlify Forms ----------
async function readBody(req, limit = 1e6) {
  const chunks = []; let n = 0
  for await (const c of req) { n += c.length; if (n > limit) throw new Error('zu groß'); chunks.push(c) }
  return Buffer.concat(chunks)
}
async function handleForm(req, res, raw) {
  const data = Object.fromEntries(new URLSearchParams(raw.toString('utf8')))
  const formName = data['form-name']
  const spam = !!data['bot-field']
  delete data['form-name']
  delete data['bot-field']
  const entry = { id: crypto.randomBytes(12).toString('hex'), form_name: formName, created_at: new Date().toISOString(), data, spam }
  fs.mkdirSync(FORMS_DIR, { recursive: true })
  fs.appendFileSync(path.join(FORMS_DIR, `${formName.replace(/[^a-z0-9_-]/gi, '')}.jsonl`), JSON.stringify(entry) + '\n')
  console.log(`Formular "${formName}" gespeichert${spam ? ' (Spam)' : ''}${FORM_HOOK ? '' : ' – Weiterleitung aus (FORM_HOOK)'}`)
  const hook = byName.get('submission-created')
  if (FORM_HOOK && hook && !spam) {
    const payload = JSON.stringify({ payload: { id: entry.id, form_name: formName, created_at: entry.created_at, data } })
    const r = await hook.handler(new Request('http://localhost/.netlify/functions/submission-created', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload }), makeContext('', {}))
      .catch((e) => { console.error('[submission-created]', e); return null })
    if (r && r.status >= 400) console.error(`[submission-created] Status ${r.status}`)
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end('<!doctype html><p>Danke!</p>')
}

// ---------- Zeitpläne ----------
function cronMatch(expr, d) {
  const alias = { '@hourly': '0 * * * *', '@daily': '0 0 * * *', '@weekly': '0 0 * * 0', '@monthly': '0 0 1 * *', '@yearly': '0 0 1 1 *' }
  const f = (alias[expr] || expr).split(/\s+/)
  const vals = [d.getUTCMinutes(), d.getUTCHours(), d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCDay()]
  return f.every((part, i) => part.split(',').some((p) => {
    const [range, step] = p.split('/')
    const st = step ? Number(step) : 1
    let lo, hi
    if (range === '*') { lo = 0; hi = 59 } else if (range.includes('-')) [lo, hi] = range.split('-').map(Number); else { lo = hi = Number(range) }
    return vals[i] >= lo && vals[i] <= hi && (vals[i] - (range === '*' ? 0 : lo)) % st === 0
  }))
}
if (SCHEDULES && schedules.length) {
  const tick = () => {
    const now = new Date()
    for (const s of schedules) if (cronMatch(s.cron, now)) {
      console.log(`Zeitplan: ${s.fn.name}`)
      Promise.resolve().then(() => s.fn.handler(new Request('http://localhost/.netlify/functions/' + s.fn.name, { method: 'POST', body: JSON.stringify({ next_run: null }) }), makeContext('', {})))
        .catch((e) => console.error(`[${s.fn.name}]`, e))
    }
  }
  setTimeout(() => { tick(); setInterval(tick, 60_000) }, 60_000 - (Date.now() % 60_000) + 500)
}

// ---------- Server ----------
http.createServer(async (req, res) => {
  try {
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0]
    let url = new URL(req.url, `${proto}://${req.headers.host || 'localhost'}`)
    const extra = headersFor(url.pathname)

    // Netlify Forms
    const ct = String(req.headers['content-type'] || '')
    if (req.method === 'POST' && ct.includes('application/x-www-form-urlencoded') && !findFn(url.pathname)) {
      const raw = await readBody(req)
      if (new URLSearchParams(raw.toString('utf8')).get('form-name')) return await handleForm(req, res, raw)
      res.writeHead(404); return res.end()
    }

    // 1. Function mit eigenem Pfad
    let hit = findFn(url.pathname)
    if (!hit && API_PREFIX && url.pathname.startsWith(API_PREFIX + '/')) {
      const name = url.pathname.slice(API_PREFIX.length + 1).split('/')[0]
      if (byName.has(name)) hit = { fn: byName.get(name), params: {} }
    }
    if (hit) return await runFunction(hit.fn, req, res, url, hit.params, undefined, extra)

    // 2. vorhandene Datei (Redirects ohne force greifen erst danach)
    const file = (req.method === 'GET' || req.method === 'HEAD') ? staticFile(url.pathname) : null
    for (const r of redirects) {
      if (file && !r.force) continue
      const m = matchPattern(r.from, url.pathname)
      if (!m) continue
      const status = Number(r.status || 301)
      const to = fill(r.to, m)
      if (status >= 300 && status < 400) {
        const loc = to + (url.search && !to.includes('?') ? url.search : '')
        res.writeHead(status, { location: loc }); return res.end()
      }
      // Rewrite (200/404)
      const t = new URL(to, url)
      for (const [k, v] of url.searchParams) if (!t.searchParams.has(k)) t.searchParams.set(k, v)
      const fhit = findFn(t.pathname) || (t.pathname.startsWith('/.netlify/functions/') && byName.has(t.pathname.split('/')[3]) ? { fn: byName.get(t.pathname.split('/')[3]), params: {} } : null)
      if (fhit) return await runFunction(fhit.fn, req, res, t, { ...m, ...fhit.params }, undefined, extra)
      const f2 = staticFile(t.pathname)
      if (f2) return sendFile(req, res, f2, status === 404 ? 404 : 200, extra)
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end() }
    if (file) return sendFile(req, res, file, 200, extra)
    const nf = staticFile('/404.html')
    if (nf) return sendFile(req, res, nf, 404, extra)
    if (SPA && !path.extname(url.pathname)) { const idx = staticFile('/index.html'); if (idx) return sendFile(req, res, idx, 200, extra) }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Nicht gefunden')
  } catch (e) {
    console.error(e); if (!res.headersSent) res.writeHead(500); res.end()
  }
}).listen(PORT, () => console.log(`kiio-Server läuft auf Port ${PORT}`))
