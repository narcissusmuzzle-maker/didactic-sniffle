// Прогон тестового циферблата в Node на заглушках.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dface-'))
for (const d of ['watchface', 'shared']) fs.cpSync(path.join(root, d), path.join(tmp, d), { recursive: true })
fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}')
const idx = path.join(tmp, 'watchface', 'index.js')
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace(/from '(\.\.\/shared\/\w+)'/g, "from '$1.js'"))
const mod = (name, code) => {
  const dir = path.join(tmp, 'node_modules', ...name.split('/'))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, type: 'module', main: 'index.js' }))
  fs.writeFileSync(path.join(dir, 'index.js'), code)
}
mod('@zos/ui', `
export const widget = { FILL_RECT: 'FILL_RECT', TEXT: 'TEXT', WIDGET_DELEGATE: 'WIDGET_DELEGATE' }
export const prop = { TEXT: 'text' }
export const align = { LEFT: 1, TOP: 2 }
export function createWidget(t, p) { const w = { t, p, setProperty(k, v) { w.p[k] = v } }; globalThis.__w.push(w); return w }`)
mod('@zos/storage', `
export class ShareTypedStorage { putString(k, v) { globalThis.__m.set('t:' + k, v) } }
export class ShareLocalStorage { setItem(k, v) { globalThis.__m.set('l:' + k, v) } }`)
mod('@zos/share-storage', `
export class TypedStorage { constructor(id) { this.id = id } getString(k, d) { const v = globalThis.__m.get(this.id + 't:' + k); return v === undefined ? d : v } }
export class LocalStorage { constructor(id) { this.id = id } isExisted() { return this.id === 1072513 } getItem(k, d) { const v = globalThis.__m.get(this.id + 'l:' + k); return v === undefined ? d : v } }`)
globalThis.__w = []
globalThis.__m = new Map()
let face = null
globalThis.WatchFace = (o) => { face = o }
let interval = null
globalThis.setInterval = (fn, ms) => { interval = { fn, ms }; return 1 }
await import(pathToFileURL(idx).href)
face.build()
const body = () => globalThis.__w.find((w) => w.t === 'TEXT').p.text
assert.match(body(), /Diag typed ping: пусто/)
assert.match(body(), /Diag local ping: пусто/)
assert.match(body(), /Запись typed \(face\): OK/)
assert.match(body(), /Наблюдатель экрана: есть/)
assert.match(body(), /setInterval есть/)
assert.equal(interval.ms, 5000)
// Luv Diag записал данные и отчёт службы
globalThis.__m.set('1072513t:ping', '1234567890')
globalThis.__m.set('1072513l:ping', '1234567890')
globalThis.__m.set('1072513t:svc', JSON.stringify({ n: 3, t: Date.now() - 4000 }))
globalThis.__w.find((w) => w.t === 'WIDGET_DELEGATE').p.resume_call()
assert.match(body(), /Diag typed ping: «1234567890»/)
assert.match(body(), /Diag local ping: «1234567890»/)
assert.match(body(), /Служба typed: тик 3, 4 с назад/)
assert.match(body(), /res=1/)
interval.fn()
console.log('diagface: ok')
