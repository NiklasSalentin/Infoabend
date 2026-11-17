// Ersatz für @netlify/blobs auf dem kiio-Server: speichert als Dateien unter BLOBS_DIR/<store>/<key>.
// Unterstützt ETags sowie onlyIfMatch / onlyIfNew (bedingtes Schreiben, atomar innerhalb des Prozesses).
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.env.BLOBS_DIR || '/data/blobs'
const enc = (k) => encodeURIComponent(k)
const dec = (f) => decodeURIComponent(f)
const etagOf = (buf) => '"' + crypto.createHash('sha1').update(buf).digest('hex') + '"'

// pro Datei nacheinander schreiben, damit Prüfen + Schreiben nicht verzahnt laufen
const locks = new Map()
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve()
  const next = prev.then(fn, fn)
  locks.set(key, next.catch(() => {}))
  return next
}

async function readBuf(file) { try { return await fs.readFile(file) } catch { return null } }

function convert(buf, type) {
  if (type === 'json') return JSON.parse(buf.toString('utf8'))
  if (type === 'arrayBuffer') return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  if (type === 'blob') return new Blob([buf])
  if (type === 'stream') return new Response(buf).body
  return buf.toString('utf8')
}

async function toBuf(value) {
  if (typeof value === 'string') return Buffer.from(value)
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (value instanceof Blob) return Buffer.from(await value.arrayBuffer())
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  return Buffer.from(String(value))
}

export function getStore(opts) {
  const name = typeof opts === 'string' ? opts : opts?.name
  const dir = path.join(ROOT, enc(name || 'default'))
  const file = (k) => path.join(dir, enc(k))

  async function write(key, data, o = {}) {
    return withLock(file(key), async () => {
      const cur = await readBuf(file(key))
      if (o.onlyIfNew && cur) return { modified: false }
      if (o.onlyIfMatch && (!cur || etagOf(cur) !== o.onlyIfMatch)) return { modified: false }
      await fs.mkdir(dir, { recursive: true })
      const t = `${file(key)}.${process.pid}.tmp`
      await fs.writeFile(t, data)
      await fs.rename(t, file(key))
      return { modified: true, etag: etagOf(data) }
    })
  }

  return {
    async get(key, o = {}) {
      const buf = await readBuf(file(key))
      return buf === null ? null : convert(buf, o.type)
    },
    async getWithMetadata(key, o = {}) {
      const buf = await readBuf(file(key))
      if (buf === null) return null
      const etag = etagOf(buf)
      if (o.etag && o.etag === etag) return { data: null, etag, metadata: {} }
      return { data: convert(buf, o.type), etag, metadata: {} }
    },
    async getMetadata(key) {
      const buf = await readBuf(file(key))
      return buf === null ? null : { etag: etagOf(buf), metadata: {} }
    },
    async set(key, value, o = {}) { return write(key, await toBuf(value), o) },
    async setJSON(key, value, o = {}) { return write(key, Buffer.from(JSON.stringify(value)), o) },
    async delete(key) { await withLock(file(key), () => fs.rm(file(key), { force: true })) },
    async list(o = {}) {
      let files = []
      try { files = (await fs.readdir(dir)).filter((f) => !f.endsWith('.tmp')) } catch {}
      let keys = files.map(dec).filter((k) => !o.prefix || k.startsWith(o.prefix)).sort()
      const directories = new Set()
      if (o.directories) {
        const plen = (o.prefix || '').length
        keys = keys.filter((k) => {
          const rest = k.slice(plen)
          const i = rest.indexOf('/')
          if (i === -1) return true
          directories.add(k.slice(0, plen + i))
          return false
        })
      }
      const blobs = await Promise.all(keys.map(async (key) => {
        const buf = await readBuf(file(key))
        return { key, etag: buf ? etagOf(buf) : '' }
      }))
      return { blobs, directories: [...directories] }
    },
  }
}
export const getDeployStore = getStore
