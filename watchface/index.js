/**
 * Luv Diag Face — тестовый циферблат. Рисует только текст: что циферблат УМЕЕТ.
 *  - читает общую память, которую записал Luv Diag (проверка «2 Запись» и пробные службы) и Luv Sync;
 *  - пробует сам ЗАПИСАТЬ в общую память (ключ face) — Luv Diag на проверке «3 Чтение» покажет, увидел ли он это;
 *  - показывает, есть ли у циферблата таймеры и «наблюдатель» возврата на экран.
 * Обновляется при каждом возвращении на экран и раз в 5 секунд (если таймеры есть).
 */
import { createWidget, widget, prop, align } from '@zos/ui'
import * as zsh from '@zos/share-storage'
import * as zst from '@zos/storage'
import { DIAG_APP_ID, SYNC_APP_ID, SHARE_SCOPE, SHARE_FILE } from '../shared/const'

let body = null
let resumes = 0
let delegateOk = 'нет'
let timerInfo = 'нет'

function safe(fn) {
  try { const r = fn(); return r === undefined ? 'OK' : String(r) } catch (e) { return 'ОШИБКА ' + String(e && e.message ? e.message : e).slice(0, 40) }
}
function cut(s, n) { s = String(s); return s.length > n ? s.slice(0, n) + '…' : s }
function typedGet(id, key) {
  const v = new zsh.TypedStorage(id, SHARE_SCOPE).getString(key, '')
  return v ? '«' + cut(v, 22) + '»' : 'пусто'
}
function localGet(id, key) {
  const l = new zsh.LocalStorage(id, SHARE_FILE)
  if (!l.isExisted()) return 'файла нет'
  const v = String(l.getItem(key, ''))
  return v ? '«' + cut(v, 22) + '»' : 'пусто'
}
function svcAge(raw) {
  if (!raw) return 'отчёта нет'
  const r = JSON.parse(raw)
  return 'тик ' + r.n + ', ' + Math.max(0, Math.round((Date.now() - r.t) / 1000)) + ' с назад'
}

function refresh() {
  if (!body) return
  const stamp = Date.now() + '|' + resumes
  const lines = []
  lines.push('Luv Diag Face  res=' + resumes)
  lines.push('Diag typed ping: ' + safe(() => typedGet(DIAG_APP_ID, 'ping')))
  lines.push('Diag local ping: ' + safe(() => localGet(DIAG_APP_ID, 'ping')))
  lines.push('Diag typed luv_c: ' + safe(() => typedGet(DIAG_APP_ID, 'luv_c')))
  lines.push('Служба typed: ' + safe(() => svcAge(new zsh.TypedStorage(DIAG_APP_ID, SHARE_SCOPE).getString('svc', ''))))
  lines.push('Служба local: ' + safe(() => {
    const l = new zsh.LocalStorage(DIAG_APP_ID, SHARE_FILE)
    return l.isExisted() ? svcAge(String(l.getItem('svc', ''))) : 'файла нет'
  }))
  lines.push('Luv Sync typed luv_c: ' + safe(() => typedGet(SYNC_APP_ID, 'luv_c')))
  lines.push('Luv Sync local luv_c: ' + safe(() => localGet(SYNC_APP_ID, 'luv_c')))
  lines.push('Запись typed (face): ' + safe(() => { new zst.ShareTypedStorage(SHARE_SCOPE).putString('face', stamp) }))
  lines.push('Запись local (face): ' + safe(() => { new zst.ShareLocalStorage(SHARE_FILE).setItem('face', stamp) }))
  lines.push('Наблюдатель экрана: ' + delegateOk)
  lines.push('Таймер на циферблате: ' + timerInfo)
  try { body.setProperty(prop.TEXT, lines.join('\n')) } catch (e) { /* не страшно */ }
}

function onResume() { resumes++; refresh() }

WatchFace({
  build() {
    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: 432, h: 514, color: 0x000000 })
    body = createWidget(widget.TEXT, {
      x: 10, y: 8, w: 412, h: 498, color: 0xdddddd, text_size: 18,
      align_h: align.LEFT, align_v: align.TOP, text_style: 1, text: 'Luv Diag Face…'
    })
    try {
      createWidget(widget.WIDGET_DELEGATE, { resume_call: onResume, pause_call: function () {} })
      delegateOk = 'есть'
    } catch (e) { delegateOk = 'нет: ' + String(e).slice(0, 30) }
    try {
      if (typeof setInterval === 'function') { setInterval(refresh, 5000); timerInfo = 'setInterval есть (раз в 5 с)' } else timerInfo = 'setInterval НЕТ'
    } catch (e) { timerInfo = 'ОШИБКА ' + String(e).slice(0, 30) }
    refresh()
  },
  onInit() {},
  onDestroy() { body = null }
})
