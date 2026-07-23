function escapeHtml(str) {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(String(str)))
  return div.innerHTML
}

function uid() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 11)
}

function formatTime() {
  const d = new Date()
  return d.toTimeString().slice(0, 8) + ' ' + d.toLocaleDateString()
}

function SubscriberHub() {
  let subs = []
  function off(fn) {
    for (let i = subs.length - 1; i >= 0; i--) {
      if (subs[i] === fn) { subs.splice(i, 1) }
    }
  }
  return {
    on: function(fn) {
      subs.push(fn)
      return function() { off(fn) }
    },
    off: off,
    emit: function(data) { subs.forEach(function(fn) { fn(data) }) }
  }
}

function injectSpCoreStyles() {
  if (document.getElementById('sp-core-styles')) return
  let style = document.createElement('style')
  style.id = 'sp-core-styles'
  style.textContent =
    '.sp-req-mask{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:1090;display:none;}' +
    '.sp-req-mask.show{display:block;}' +
    '.sp-req-drawer{position:fixed;top:0;right:-540px;width:520px;height:100vh;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,0.1);z-index:1100;transition:right .3s;display:flex;flex-direction:column;}' +
    '.sp-req-drawer.open{right:0;}' +
    '.sp-req-drawer-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:14px;flex-shrink:0;}' +
    '.sp-req-tabs{display:flex;border-bottom:1px solid #e5e7eb;flex-shrink:0;}' +
    '.sp-req-tab{padding:8px 16px;font-size:13px;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;user-select:none;}' +
    '.sp-req-tab:hover{color:#2563eb;}' +
    '.sp-req-tab.active{color:#2563eb;border-bottom-color:#2563eb;font-weight:600;}' +
    '.sp-req-tab-content{flex:1;overflow-y:auto;display:none;}' +
    '.sp-req-tab-content.active{display:block;}' +
    '.sp-req-tab-body{padding:20px;font-size:13px;color:#374151;line-height:1.8;}' +
    '.sp-req-tab-body h1{font-size:18px;color:#111827;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;text-align:center;}' +
    '.sp-req-tab-body h2{font-size:15px;color:#1f2937;margin:20px 0 10px;padding:6px 10px;background:#f3f4f6;border-radius:6px;}' +
    '.sp-req-tab-body h3{font-size:14px;color:#2563eb;margin:14px 0 8px;padding-bottom:5px;border-bottom:2px solid #eff6ff;}' +
    '.sp-req-tab-body h3:first-child{margin-top:0;}' +
    '.sp-req-tab-body h4{font-size:13px;color:#374151;margin:10px 0 6px;font-weight:600;}' +
    '.sp-req-tab-body p{margin:4px 0 8px;}' +
    '.sp-req-tab-body ul,.sp-req-tab-body ol{margin:4px 0 8px;padding-left:20px;}' +
    '.sp-req-tab-body li{margin:2px 0;}' +
    '.sp-req-tab-body table{width:100%;border-collapse:collapse;margin:8px 0 12px;font-size:12px;}' +
    '.sp-req-tab-body th{background:#f3f4f6;color:#374151;font-weight:600;padding:6px 8px;border:1px solid #e5e7eb;text-align:left;font-size:11px;}' +
    '.sp-req-tab-body td{padding:5px 8px;border:1px solid #e5e7eb;font-size:12px;}' +
    '.sp-req-tab-body code{background:#f0f5ff;color:#2563eb;padding:1px 5px;border-radius:3px;font-size:11px;font-family:monospace;}' +
    '.sp-req-tab-body pre{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;overflow-x:auto;font-size:11px;line-height:1.6;font-family:monospace;margin:6px 0 10px;}' +
    '.sp-req-tab-body hr{border:none;border-top:1px solid #e5e7eb;margin:16px 0;}' +
    '.sp-req-tab-body strong{color:#111827;}' +
    '.sp-req-tab-body .req-badge{display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:4px;}' +
    '.sp-req-tab-body .req-badge.platform{background:#dbeafe;color:#1e40af;}' +
    '.sp-req-tab-body .req-badge.province{background:#fef3c7;color:#92400e;}' +
    '.sp-req-tab-body .req-badge.inst{background:#d1fae5;color:#065f46;}' +
    '.sp-req-tab-body .req-item{margin-bottom:8px;padding-left:12px;border-left:2px solid #e5e7eb;}' +
    '.sp-req-tab-body .req-id{font-weight:700;color:#2563eb;font-size:11px;}' +
    '.sp-req-tab-body .req-desc{margin-top:2px;font-size:12px;}' +
    '.sp-req-tab-body .req-status{display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px;}' +
    '.sp-req-tab-body .req-status.done{background:#d1fae5;color:#065f46;}' +
    '.sp-req-tab-body .req-status.flow{background:#dbeafe;color:#1e40af;}' +
    '.sp-req-tab-body .req-status.error{background:#fee2e2;color:#991b1b;}' +
    '.sp-ap-item{margin:8px 12px;padding:12px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;transition:all .2s;}' +
    '.sp-ap-item:hover{border-color:#c7d2fe;box-shadow:0 2px 8px rgba(37,99,235,0.06);}' +
    '.sp-ap-item .sp-ap-elem{font-weight:600;color:#1f2937;font-size:13px;margin-bottom:6px;display:flex;align-items:center;gap:6px;}' +
    '.sp-ap-item .sp-ap-elem .sp-ap-status{display:inline-block;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:500;flex-shrink:0;}' +
    '.sp-ap-item .sp-ap-elem .sp-ap-status.pending{background:#fef3c7;color:#b45309;}' +
    '.sp-ap-item .sp-ap-elem .sp-ap-status.fixed{background:#dbeafe;color:#1e40af;}' +
    '.sp-ap-item .sp-ap-comment{margin-top:6px;color:#374151;line-height:1.6;padding:8px 10px;background:#f9fafb;border-radius:6px;border-left:3px solid #2563eb;}' +
    '.sp-ap-item .sp-ap-time{font-size:11px;color:#9ca3af;margin-top:8px;display:flex;align-items:center;gap:4px;}' +
    '.sp-ap-item .sp-ap-actions{display:flex;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid #f3f4f6;}' +
    '.sp-ap-item .sp-ap-actions button{font-size:11px;padding:4px 12px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;transition:all .15s;}' +
    '.sp-ap-item .sp-ap-actions button:hover{background:#f3f4f6;}' +
    '.sp-ap-item .sp-ap-actions button.mark-unfixed{color:#f59e0b;border-color:#fcd34d;background:#fffbeb;}' +
    '.sp-ap-item .sp-ap-actions button.edit{color:#2563eb;border-color:#bfdbfe;background:#eff6ff;}' +
    '.sp-ap-item .sp-ap-actions button.del{color:#ef4444;border-color:#fecaca;background:#fef2f2;}' +
    '.sp-ap-export{display:flex;justify-content:flex-end;align-items:center;gap:6px;padding:10px 14px;border-bottom:1px solid #e5e7eb;flex-shrink:0;background:#fafafa;}' +
    '.sp-ap-export button{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#6b7280;transition:all .15s;}' +
    '.sp-ap-export button:hover{background:#f3f4f6;}' +
    '#sp-anno-clear-all{color:#ef4444;border-color:#fca5a5;background:#fef2f2;}' +
    '#sp-anno-clear-all:hover{background:#fee2e2;}' +
    '.review-disabled{opacity:0.6;}' +
    '.review-mode-active *{cursor:crosshair;}' +
    '.sp-marker-badge{font-family:system-ui,sans-serif;}'
  document.head.appendChild(style)
}
if (typeof document !== 'undefined') { injectSpCoreStyles() }

// ============================================================
//  评审引擎
// ============================================================

let ANNO_STORAGE_KEY = 'ai-sp-review-annotations'

export const review = {
  _active: false,
  _filterStatus: null,
  _annotations: [],
  _viewName: '',
  _editedIndex: -1,
  _hub: SubscriberHub(),

  isActive: function() { return this._active },
  setViewName: function(name) { this._viewName = name || '' },
  getAnnotations: function() { return this._annotations.slice() },

  canToggle: function() {
    return true
  },

  _loadFromStorage: function() {
    try {
      let raw = localStorage.getItem(ANNO_STORAGE_KEY)
      if (raw) {
        let parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          for (let i = 0; i < parsed.length; i++) {
            if (!parsed[i].fixStatus) parsed[i].fixStatus = 'pending'
            if (!parsed[i].replies) parsed[i].replies = []
            if (!parsed[i].elemPath) parsed[i].elemPath = ''
          }
          this._annotations = parsed
          this._emit()
          this._mergeFromFile()
        }
      }
    } catch (e) { console.error('[annotations] localStorage 读取失败:', e.message) }
  },

  _mergeFromFile: function() {
    let self = this
    if (isStaticProduction()) return
    try {
      let xhr = new XMLHttpRequest()
      xhr.open('GET', '/api/save-annotations', true)
      xhr.onerror = function() {}
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            let fileData = JSON.parse(xhr.responseText)
            let fileAnnos = Array.isArray(fileData) ? fileData : (fileData.annotations || [])
            // 服务端返回空数据时不覆盖本地批注，防止网络波动/服务重启导致数据丢失
            if (fileAnnos.length === 0) return
            let fileIdMap = {}
            for (let k = 0; k < fileAnnos.length; k++) {
              fileIdMap[fileAnnos[k].id] = true
            }
            let localMap = {}
            for (let j = 0; j < self._annotations.length; j++) {
              localMap[self._annotations[j].id] = j
            }
            let changed = false
            for (let i = 0; i < fileAnnos.length; i++) {
              let fa = fileAnnos[i]
              let localIdx = localMap[fa.id]
              if (localIdx === undefined) {
                if (!fa.fixStatus) fa.fixStatus = 'pending'
                if (!fa.replies) fa.replies = []
                if (!fa.elemPath) fa.elemPath = ''
                self._annotations.push(fa)
                changed = true
              } else {
                let a = self._annotations[localIdx]
                if (fa.fixStatus && a.fixStatus !== fa.fixStatus) { a.fixStatus = fa.fixStatus; changed = true }
                if (fa.replies && fa.replies.length > 0) {
                  if (!a.replies) a.replies = []
                  if (JSON.stringify(fa.replies) !== JSON.stringify(a.replies)) { a.replies = fa.replies; changed = true }
                }
              }
            }
            for (let ri = self._annotations.length - 1; ri >= 0; ri--) {
              if (!fileIdMap[self._annotations[ri].id]) {
                self._annotations.splice(ri, 1)
                changed = true
              }
            }
            if (changed) {
              self._saveToStorage()
              self._emit()
              self._refreshPanel()
            }
          } catch (e) { console.error('[annotations] 文件数据解析失败:', e.message) }
        }
      }
      xhr.send()
    } catch (e) { console.error('[annotations] XHR 发送失败:', e.message) }
  },

  _saveToStorage: function() {
    try {
      let json = JSON.stringify(this._annotations)
      localStorage.setItem(ANNO_STORAGE_KEY, json)
      this._saveToFile(json)
    } catch (e) { console.error('[annotations] localStorage 写入失败:', e.message) }
  },

  _saveToFile: function(json) {
    if (isStaticProduction()) return
    try {
      let xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/save-annotations', true)
      xhr.setRequestHeader('Content-Type', 'application/json')
		xhr.onerror = function() {}
		xhr.onload = function() {}
      xhr.send(json || JSON.stringify(this._annotations))
    } catch (e) { /* 非本地调试环境静默忽略 */ console.error('[annotations] 文件保存失败:', e.message) }
  },

  clearAll: function() {
    this._annotations = []
    try { localStorage.removeItem(ANNO_STORAGE_KEY) } catch (e) { console.error('[annotations] localStorage 删除失败:', e.message) }
    if (!isStaticProduction()) { try { let xhr = new XMLHttpRequest(); xhr.open('DELETE', '/api/save-annotations', true); xhr.send() } catch (e) { console.error('[annotations] 删除请求失败:', e.message) } }
    this._removeMarkers()
    this._emit()
    this._refreshPanel()
  },

  getAllFormatted: function() {
    if (this._annotations.length === 0) return '暂无批注记录'
    return this._annotations.map(function(a, i) {
      return '[' + (i + 1) + '] ' + a.elem + '\n   批注：' + a.comment + '\n   页面：' + (a.page || '') + ' | ' + a.time
    }).join('\n\n')
  },

  getAnnotationsByPage: function(pageName) {
    return this._annotations.filter(function(a) { return a.page === pageName })
  },

  addAnnotation: function(elemDesc, comment, pageName) {
    let anno = {
      id: uid(),
      elem: elemDesc,
      comment: comment,
      page: pageName || this._viewName,
      time: formatTime(),
      status: 'pending',
      fixStatus: 'pending',
      elemPath: this._lastClickedPath || '',
      replies: []
    }
    this._annotations.push(anno)
    this._saveToStorage()
    this._emit()
    this._refreshPanel()
    this._renderMarkers()
    return anno
  },

  updateAnnotation: function(id, comment) {
    for (let i = 0; i < this._annotations.length; i++) {
      if (this._annotations[i].id === id) {
        this._annotations[i].comment = comment
        this._annotations[i].time = formatTime()
        this._saveToStorage()
        this._emit()
        this._refreshPanel()
        return true
      }
    }
    return false
  },

  removeAnnotation: function(id) {
    for (let i = this._annotations.length - 1; i >= 0; i--) {
      if (this._annotations[i].id === id) {
        this._annotations.splice(i, 1)
        this._saveToStorage()
        this._emit()
        this._refreshPanel()
        this._renderMarkers()
        return true
      }
    }
    return false
  },

  markUnfixed: function(id) {
    for (let i = 0; i < this._annotations.length; i++) {
      if (this._annotations[i].id === id) {
        this._annotations[i].fixStatus = 'pending'
        this._saveToStorage()
        this._emit()
        this._refreshPanel()
        this._renderMarkers()
        return true
      }
    }
    return false
  },

  addReply: function(id, text) {
    for (let i = 0; i < this._annotations.length; i++) {
      if (this._annotations[i].id === id) {
        if (!this._annotations[i].replies) this._annotations[i].replies = []
        this._annotations[i].replies.push({ text: text, time: formatTime() })
        this._annotations[i].fixStatus = 'pending'
        this._saveToStorage()
        this._emit()
        this._refreshPanel()
        return true
      }
    }
    return false
  },

  markFixed: function(id) {
    for (let i = 0; i < this._annotations.length; i++) {
      if (this._annotations[i].id === id) {
        this._annotations[i].fixStatus = 'fixed'
        this._saveToStorage()
        this._emit()
        this._refreshPanel()
        this._renderMarkers()
        return true
      }
    }
    return false
  },

  getPendingCount: function() {
    let count = 0
    for (let i = 0; i < this._annotations.length; i++) {
      if (this._annotations[i].fixStatus !== 'fixed') count++
    }
    return count
  },

  exportMarkdown: function() {
    if (this._annotations.length === 0) return ''
    let md = '# 评审批注汇总报告\n\n生成时间：' + new Date().toLocaleString() + '\n\n'
    this._annotations.forEach(function(a, i) {
      let fixLabel = a.fixStatus === "fixed" ? "✅ 已修改" : "🔧 待修改"
      md += '### ' + (i + 1) + '. ' + a.elem + ' ' + fixLabel + '\n'
      md += '- **批注**：' + a.comment + '\n'
      md += '- **页面**：' + (a.page || '') + ' | **时间**：' + a.time + ' | **修改状态**：' + (a.fixStatus === "fixed" ? '已修改' : '待修改') + '\n\n'
    })
    return md
  },

  toggle: function(viewName) {
    if (!this.canToggle()) {
      if (typeof toast !== 'undefined' && toast.show) {
        toast.show('评审模式未激活，请使用特殊方式激活', 'warning', 2500)
      }
      return false
    }
    this._active = !this._active
    if (viewName) this._viewName = viewName
    if (this._active) {
      this._mergeFromFile()
      this._refreshPanel()
      this._enableCapture()
      this._applyDOMLock(true)
      document.body.classList.add('review-mode-active')
      this._renderMarkers()
      this._bindMarkerEvents()
    } else {
      this._disableCapture()
      this._applyDOMLock(false)
      document.body.classList.remove('review-mode-active')
      this._removeMarkers()
      this._unbindMarkerEvents()
    }
    this._emit()
    return this._active
  },

  _markerScrollHandler: null,
  _markerResizeHandler: null,

  _bindMarkerEvents: function() {
    let self = this
    if (!this._markerScrollHandler) {
      this._markerScrollHandler = function() { self._updateMarkerPositions() }
      this._markerResizeHandler = function() { self._updateMarkerPositions() }
    }
    window.addEventListener('scroll', this._markerScrollHandler, true)
    window.addEventListener('resize', this._markerResizeHandler)
  },

  _unbindMarkerEvents: function() {
    if (this._markerScrollHandler) {
      window.removeEventListener('scroll', this._markerScrollHandler, true)
      window.removeEventListener('resize', this._markerResizeHandler)
    }
  },

  cleanup: function() {
    if (this._active) {
      this._disableCapture()
      this._applyDOMLock(false)
      document.body.classList.remove('review-mode-active')
      this._removeMarkers()
      this._unbindMarkerEvents()
      this._active = false
    }
    this._removeModal()
    this._saveToStorage()
    this._emit()
  },

  onStateChange: function(fn) { this._hub.on(fn) },
  offStateChange: function(fn) { this._hub.off(fn) },

  _emit: function() {
    this._hub.emit({
      active: this._active,
      annotations: this._annotations.slice(),
      viewName: this._viewName
    })
  },

  _getElemDesc: function(el) {
    if (!el) return '未命名元件'
    let r = el.getAttribute && el.getAttribute('data-reviewable')
    if (r) return r
    let tag = (el.tagName || '').toLowerCase()
    if (el.placeholder) return '输入框：' + el.placeholder.slice(0, 40)
    if (tag === 'button') return '按钮：' + (el.textContent || '').trim().slice(0, 30)
    if (tag === 'input') return '输入框' + (el.value ? '：' + el.value.slice(0, 30) : '')
    if (tag === 'textarea') return '文本域'
    if (tag === 'select') return '下拉菜单'
    if (tag === 'img') return '图片：' + ((el.alt || el.src || '').split('/').pop() || '未命名').slice(0, 40)
    if (tag === 'svg') return '图标：' + ((el.getAttribute('aria-label') || el.getAttribute('data-icon') || 'SVG')).slice(0, 30)
    if (tag === 'video') return '视频'
    if (tag === 'audio') return '音频'
    if (tag === 'a') return '链接：' + (el.textContent || el.href || '').trim().slice(0, 40)
    if (tag === 'label') return '标签：' + (el.textContent || '').trim().slice(0, 40)
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return '标题：' + (el.textContent || '').trim().slice(0, 50)
    if (tag === 'p') return '段落：' + (el.textContent || '').trim().slice(0, 50)
    if (tag === 'span') return '文本：' + (el.textContent || '').trim().slice(0, 50)
    // 背景图容器
    let style = el.style && el.style.backgroundImage
    if (!style) { try { style = window.getComputedStyle(el).backgroundImage } catch(e) { /* 跨域 iframe 元素可能无法访问样式 */ } }
    if (style && style !== 'none') return '背景图区域'
    let cls = (el.className && el.className.baseVal) || el.className || ''
    let clsStr = typeof cls === 'string' ? cls : ''
    let t = (el.textContent || el.innerText || '').trim()
    if (t) return t.slice(0, 50)
    if (clsStr) return clsStr.split(' ').filter(Boolean).slice(0, 2).join('.')
    return tag || '未知元件'
  },

  _getElemPath: function(el) {
    if (!el || el === document.body || el === document.documentElement) return ''
    // 向上找到最近的有意义元素（button, a, input 等），避免因点击内部 span/i 导致路径指向容器
    let target = el
    let semanticTags = { button:1, a:1, input:1, select:1, textarea:1, label:1, h1:1, h2:1, h3:1, h4:1, h5:1, h6:1, img:1, video:1, audio:1, form:1, nav:1, header:1, footer:1, main:1, section:1, article:1, aside:1, table:1, li:1, dt:1, dd:1, th:1, td:1 }
    while (target && target !== document.body && target !== document.documentElement) {
      if (target.id) break
      if (semanticTags[target.tagName.toLowerCase()]) break
      if (target.getAttribute && target.getAttribute('role')) break
      let inlineEls = { i:1, span:1, b:1, strong:1, em:1, small:1, u:1, s:1, sub:1, sup:1, code:1, mark:1 }
      if (target.className && typeof target.className === 'string' && target.className.trim() && !inlineEls[target.tagName.toLowerCase()]) break
      if (!target.parentElement || target.parentElement === document.body) break
      target = target.parentElement
    }
    if (!target || target === document.body || target === document.documentElement) target = el
    if (target.id) return '#' + CSS.escape(target.id)
    let parts = []
    let cur = target
    while (cur && cur !== document.body && cur !== document.documentElement) {
      let tag = cur.tagName.toLowerCase()
      let cls = (cur.className && typeof cur.className === 'string') ? cur.className.trim().split(/\s+/).filter(function(c) { return c && !c.match(/^(hover|active|focus|selected|disabled|open|show|hide|visible|hidden|expanded|collapsed)$/) }).slice(0, 2).join('.') : ''
      if (cls) tag += '.' + cls.replace(/:/g, '\:')
      let parent = cur.parentElement
      if (parent) {
        let siblings = []
        for (let s = parent.firstElementChild; s; s = s.nextElementSibling) {
          if (s.tagName === cur.tagName) siblings.push(s)
        }
        if (siblings.length > 1) {
          let idx = siblings.indexOf(cur) + 1
          tag += ':nth-of-type(' + idx + ')'
        }
      }
      parts.unshift(tag)
      if (parent && (parent.id || parent === document.body || parent === document.documentElement)) break
      cur = parent
    }
    return parts.join(' > ')
  },

  _lastClickedEl: null,
  _lastClickedPath: '',

  _markerContainer: null,
  _markerEls: [],

  _renderMarkers: function() {
    this._removeMarkers()
    let self = this
    let container = document.createElement('div')
    container.id = 'sp-marker-overlay'
    container.setAttribute('data-review-exempt', '')
    container.style.cssText = 'position:fixed;inset:0;z-index:998;pointer-events:none;'
    document.body.appendChild(container)
    this._markerContainer = container

    // 按元素路径分组，同一元素可能有多条批注
    let groups = {}
    for (let i = 0; i < this._annotations.length; i++) {
      let a = this._annotations[i]
      let path = a.elemPath || ''
      if (!path) continue
      if (!groups[path]) groups[path] = []
      groups[path].push(a)
    }

    let paths = Object.keys(groups)
    for (let p = 0; p < paths.length; p++) {
      try {
        let el = document.querySelector(paths[p])
        if (!el) continue
        let annos = groups[paths[p]]
        let needFix = 0, fixedCount = 0
        for (let q = 0; q < annos.length; q++) {
          if (annos[q].fixStatus === 'fixed') fixedCount++
          else needFix++
        }
        let rect = el.getBoundingClientRect()
        let badge = document.createElement('div')
        badge.className = 'sp-marker-badge'
        badge.setAttribute('data-review-exempt', '')
        let color = needFix > 0 ? '#f59e0b' : '#3b82f6'
        let count = annos.length
        badge.style.cssText = 'position:fixed;top:' + Math.max(0, rect.top - 8) + 'px;left:' + Math.min(window.innerWidth - 24, rect.right - 8) + 'px;' +
          'width:' + (count > 9 ? 'auto' : '20px') + ';min-width:20px;height:20px;padding:' + (count > 9 ? '0 5px' : '0') + ';' +
          'background:' + color + ';color:#fff;border-radius:10px;font-size:11px;font-weight:700;' +
          'line-height:20px;text-align:center;pointer-events:auto;cursor:pointer;z-index:1001;' +
          'box-shadow:0 2px 6px rgba(0,0,0,0.2);transition:transform .15s;'
        badge.textContent = count
        badge.title = count + ' 条批注 (' + (needFix > 0 ? needFix + ' 待修改' : '') + (fixedCount > 0 ? (needFix > 0 ? ', ' : '') + fixedCount + ' 已修改' : '') + ')'
        ;(function(capturedAnnos) {
          badge.addEventListener('click', function(e) {
            e.stopPropagation()
            self._showMarkerDetail(capturedAnnos)
          })
        })(annos)
        badge.addEventListener('mouseenter', function() { this.style.transform = 'scale(1.2)' })
        badge.addEventListener('mouseleave', function() { this.style.transform = 'scale(1)' })
        container.appendChild(badge)
        self._markerEls.push({ badge: badge, path: paths[p] })
      } catch (e) { console.error('[annotations] 标记创建失败:', e.message) }
    }
  },

  _updateMarkerPositions: function() {
    for (let i = 0; i < this._markerEls.length; i++) {
      try {
        let item = this._markerEls[i]
        let el = document.querySelector(item.path)
        if (!el) continue
        let rect = el.getBoundingClientRect()
        item.badge.style.top = Math.max(0, rect.top - 8) + 'px'
        item.badge.style.left = Math.min(window.innerWidth - 24, rect.right - 8) + 'px'
      } catch (e) { /* 元素已从 DOM 移除时位置更新可能失败 */ }
    }
  },

  _removeMarkers: function() {
    for (let i = 0; i < this._markerEls.length; i++) {
      if (this._markerEls[i].badge.parentNode) {
        this._markerEls[i].badge.parentNode.removeChild(this._markerEls[i].badge)
      }
    }
    this._markerEls = []
    if (this._markerContainer && this._markerContainer.parentNode) {
      this._markerContainer.parentNode.removeChild(this._markerContainer)
    }
    this._markerContainer = null
  },

  _showMarkerDetail: function(annos) {
    let self = this
    this._removeModal()
    let overlay = document.createElement('div')
    overlay.className = 'sp-annotation-modal modal-overlay'
    overlay.setAttribute('data-review-exempt', '')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:1001;display:flex;align-items:center;justify-content:center;'
    let h = '<div class="modal-box" style="background:#fff;border-radius:14px;padding:20px 24px;max-width:520px;width:92%;max-height:75vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.15);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<span style="font-size:16px;font-weight:600;">📋 批注详情（' + annos.length + ' 条）</span>' +
      '<button id="sp-marker-close" style="width:28px;height:28px;border-radius:50%;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:14px;color:#909399;display:flex;align-items:center;justify-content:center;">✕</button>' +
      '</div>'
    for (let i = 0; i < annos.length; i++) {
      let a = annos[i]
      let isFixed = a.fixStatus === 'fixed'
      let fixBadge = isFixed
        ? '<span style="display:inline-block;font-size:10px;padding:1px 8px;border-radius:10px;background:#dbeafe;color:#1e40af;font-weight:500;">已修改</span>'
        : '<span style="display:inline-block;font-size:10px;padding:1px 8px;border-radius:10px;background:#fef3c7;color:#b45309;font-weight:500;">待修改</span>'
      let replies = a.replies || []
      let repliesHtml = ''
      if (replies.length > 0) {
        repliesHtml += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #e5e7eb;">'
        for (let ri = 0; ri < replies.length; ri++) {
          repliesHtml += '<div style="font-size:11px;color:#6b7280;padding:4px 8px;margin-bottom:3px;background:#f0fdf4;border-radius:6px;line-height:1.5;">' +
            '<span style="font-size:10px;color:#9ca3af;">↳ ' + escapeHtml(replies[ri].time) + '</span><br>' +
            escapeHtml(replies[ri].text) + '</div>'
        }
        repliesHtml += '</div>'
      }
      h += '<div class="sp-marker-item" data-anno-id="' + a.id + '" style="padding:12px 0;border-bottom:1px solid #f3f4f6;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
        fixBadge +
        '<span style="font-size:13px;font-weight:600;color:#1f2937;">' + escapeHtml(a.elem) + '</span>' +
        '</div>' +
        '<div style="font-size:13px;color:#374151;line-height:1.6;padding:8px 10px;background:#f9fafb;border-radius:6px;border-left:3px solid #2563eb;">' + escapeHtml(a.comment) + '</div>' +
        repliesHtml +
        '<div style="font-size:11px;color:#9ca3af;margin-top:6px;">📅 ' + escapeHtml(a.time) + ' · 📄 ' + escapeHtml(a.page) + '</div>' +
        '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">' +
        '<input class="sp-marker-reply-input" data-anno-id="' + a.id + '" placeholder="输入反馈回复…" style="flex:1;min-width:140px;font-size:11px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;outline:none;">' +
        '<button class="sp-marker-reply-btn" data-anno-id="' + a.id + '" style="font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid #a5b4fc;background:#eef2ff;color:#4338ca;cursor:pointer;white-space:nowrap;font-weight:500;">↩ 回复</button>' +
        (isFixed ? '<button class="sp-marker-unfixed-btn" data-anno-id="' + a.id + '" style="font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid #fcd34d;background:#fffbeb;color:#f59e0b;cursor:pointer;white-space:nowrap;">↩ 未修改</button>' : '') +
        '<button class="sp-marker-del-btn" data-anno-id="' + a.id + '" style="font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid #fecaca;background:#fef2f2;color:#ef4444;cursor:pointer;white-space:nowrap;">🗑 删除</button>' +
        '</div></div>'
    }
    h += '</div>'
    overlay.innerHTML = h
    document.body.appendChild(overlay)
    overlay.querySelector('#sp-marker-close').onclick = function() { overlay.remove() }
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove() }
    overlay.querySelectorAll('.sp-marker-reply-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        let input = overlay.querySelector('.sp-marker-reply-input[data-anno-id="' + btn.dataset.annoId + '"]')
        if (!input || !input.value.trim()) return
        self.addReply(btn.dataset.annoId, input.value.trim())
        input.value = ''
        let annos2 = []
        for (let k = 0; k < self._annotations.length; k++) {
          if (self._annotations[k].id === btn.dataset.annoId) annos2.push(self._annotations[k])
        }
        if (annos2.length > 0) self._showMarkerDetail(annos2)
      })
    })
    overlay.querySelectorAll('.sp-marker-reply-input').forEach(function(input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault()
          let btn = overlay.querySelector('.sp-marker-reply-btn[data-anno-id="' + input.dataset.annoId + '"]')
          if (btn) btn.click()
        }
      })
    })
    overlay.querySelectorAll('.sp-marker-unfixed-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.markUnfixed(btn.dataset.annoId)
        let annos2 = []
        for (let k = 0; k < self._annotations.length; k++) {
          if (self._annotations[k].id === btn.dataset.annoId) annos2.push(self._annotations[k])
        }
        if (annos2.length > 0) self._showMarkerDetail(annos2)
      })
    })
    overlay.querySelectorAll('.sp-marker-del-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.removeAnnotation(btn.dataset.annoId)
        overlay.remove()
      })
    })
  },

  _isExempt: function(el) {
    if (!el || !el.closest) return true
    if (el.closest('[data-review-exempt]')) return true
    const selectors = [
      '.floating-btns', '.bottom-left-buttons', '.sp-bottom-bar',
      '.sp-floating-bar', '.sp-bar-top', '.sp-bar-actions',
      '.sp-annotation-panel', '.sp-annotation-modal',
      '.sp-req-drawer', '.sp-req-mask',
      '.review-annotation-panel', '.requirement-panel',
      '.req-drawer', '.annotation-panel',
      '#sp-toast-container', '#sp-marker-overlay'
    ]
    for (let i = 0; i < selectors.length; i++) {
      if (el.closest(selectors[i])) return true
    }
    return false
  },

  _clickHandler: null,
  _keyHandler: null,

  _enableCapture: function() {
    let self = this
    if (!this._clickHandler) {
      this._clickHandler = function(e) {
        if (!self._active) return
        if (self._isExempt(e.target)) return
        let el = e.target
        if (!el || el === document.body || el === document.documentElement) return
        e.preventDefault()
        e.stopPropagation()
        self._lastClickedEl = el
        self._lastClickedPath = self._getElemPath(el)
        const desc = self._getElemDesc(el)
        self._showModal(desc)
      }
    }
    if (!this._keyHandler) {
      this._keyHandler = function(e) {
        if (e.key === 'Escape') {
          let modal = document.querySelector('.sp-annotation-modal')
          if (modal) {
            self._closeModal()
          } else {
            self.toggle()
          }
        }
      }
    }
    document.body.addEventListener('click', this._clickHandler, true)
    document.addEventListener('keydown', this._keyHandler)
  },

  _disableCapture: function() {
    if (this._clickHandler) {
      document.body.removeEventListener('click', this._clickHandler, true)
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler)
    }
  },

  _showModal: function(desc) {
    let self = this
    this._removeModal()
    let overlay = document.createElement('div')
    overlay.className = 'sp-annotation-modal modal-overlay'
    overlay.setAttribute('data-review-exempt', '')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;display:flex;align-items:center;justify-content:center;'
    overlay.innerHTML =
      '<div class="modal-box" style="background:#fff;border-radius:16px;padding:28px;max-width:440px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,0.15);">' +
      '<div class="modal-title" style="font-size:18px;font-weight:600;margin-bottom:12px;">✏️ 添加批注</div>' +
      '<div class="modal-body" style="font-size:14px;color:#6b7280;margin-bottom:20px;line-height:1.6;">' +
      '<div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">元件：<strong>' + escapeHtml(desc) + '</strong></div>' +
      '<textarea class="input" id="sp-anno-comment" rows="6" placeholder="请输入评审意见…" style="resize:vertical;padding:10px 14px;border-radius:8px;font-size:14px;border:1px solid #e5e7eb;width:100%;outline:none;"></textarea>' +
      '</div>' +
      '<div class="modal-actions" style="display:flex;gap:12px;justify-content:flex-end;">' +
      '<button class="btn btn-default" id="sp-anno-cancel" style="display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#6b7280;">取消</button>' +
      '<button class="btn btn-primary" id="sp-anno-submit" style="display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;border:none;background:#2563eb;color:#fff;">确认添加</button>' +
      '</div></div>'
    document.body.appendChild(overlay)
    overlay.querySelector('#sp-anno-cancel').onclick = function() { overlay.remove() }
    overlay.querySelector('#sp-anno-submit').onclick = function() {
      let comment = overlay.querySelector('#sp-anno-comment').value.trim()
      if (!comment) { alert('请填写批注内容'); return }
      self.addAnnotation(desc, comment)
      overlay.remove()
    }
    overlay.querySelector('#sp-anno-comment').focus()
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove() }
  },

  _removeModal: function() {
    const modal = document.querySelector('.sp-annotation-modal')
    if (modal) modal.remove()
  },

  _refreshPanel: function() {
    let list = document.getElementById('sp-req-anno-list')
    if (!list) return
    let self = this
    let needFixCount = this.getPendingCount()
    let fixedCount = this._annotations.length - needFixCount
    let activeFilter = this._filterStatus
    let toolbarHtml = ''
    if (this._annotations.length > 0) {
      let allActive = !activeFilter ? 'font-weight:700;' : ''
      let needFixActive = activeFilter === 'needFix' ? 'box-shadow:0 0 0 2px #b45309;' : ''
      let fixedActive = activeFilter === 'fixed' ? 'box-shadow:0 0 0 2px #1e40af;' : ''
      toolbarHtml = '<div class="sp-ap-toolbar" style="display:flex;align-items:center;padding:12px 14px;border-bottom:1px solid #e5e7eb;flex-shrink:0;background:#fafafa;">' +
        '<span style="font-size:13px;color:#374151;flex:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '<strong class="sp-filter-all" style="color:#1f2937;cursor:pointer;' + allActive + '">共 ' + this._annotations.length + ' 条</strong>' +
        (needFixCount > 0 ? '<span class="sp-filter-needfix" style="display:inline-flex;align-items:center;gap:3px;font-size:12px;background:#fef3c7;color:#b45309;padding:2px 10px;border-radius:10px;cursor:pointer;' + needFixActive + '">' + needFixCount + ' 待修改</span>' : '') +
        (fixedCount > 0 ? '<span class="sp-filter-fixed" style="display:inline-flex;align-items:center;gap:3px;font-size:12px;background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:10px;cursor:pointer;' + fixedActive + '">' + fixedCount + ' 已修改</span>' : '') +
        '</span>' +
        '</div>'
    }
    if (this._annotations.length === 0) {
      list.innerHTML = toolbarHtml + '<div style="padding:40px 16px;font-size:13px;color:#9ca3af;text-align:center;">📝 暂无批注<br><span style="font-size:11px;color:#d1d5db;">点击左下角「评审」后点击页面元素添加</span></div>'
      return
    }
    let h = ''
    let filteredCount = 0
    for (let i = this._annotations.length - 1; i >= 0; i--) {
      let a = this._annotations[i]
      if (activeFilter === 'needFix' && a.fixStatus === 'fixed') continue
      if (activeFilter === 'fixed' && a.fixStatus !== 'fixed') continue
      filteredCount++
      let isFixed = a.fixStatus === 'fixed'
      let fixLabel = isFixed ? '已修改' : '待修改'
      let fixCls = isFixed ? 'fixed' : 'pending'
      let fixColor = isFixed ? 'background:#dbeafe;color:#1e40af;' : 'background:#fef3c7;color:#b45309;'
      let replies = a.replies || []
      let repliesHtml = ''
      if (replies.length > 0) {
        repliesHtml += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #e5e7eb;">'
        for (let ri = 0; ri < replies.length; ri++) {
          repliesHtml += '<div style="font-size:12px;color:#6b7280;padding:6px 8px;margin-bottom:4px;background:#f0fdf4;border-radius:6px;line-height:1.5;">' +
            '<span style="font-size:10px;color:#9ca3af;">↳ ' + escapeHtml(replies[ri].time) + '</span><br>' +
            '<span style="color:#374151;">' + escapeHtml(replies[ri].text) + '</span></div>'
        }
        repliesHtml += '</div>'
      }
      h += '<div class="sp-ap-item">' +
        '<div class="sp-ap-elem">' +
        '<span class="sp-ap-status ' + fixCls + '" style="' + fixColor + '">' + fixLabel + '</span>' +
        escapeHtml(a.elem) + '</div>' +
        '<div class="sp-ap-comment">' + escapeHtml(a.comment) + '</div>' +
        repliesHtml +
        '<div class="sp-ap-time">📅 ' + escapeHtml(a.time) + ' · 📄 ' + escapeHtml(a.page) + '</div>' +
        '<div style="margin-top:8px;display:flex;gap:6px;">' +
        '<input class="sp-ap-reply-input" data-anno-id="' + a.id + '" placeholder="输入反馈回复…" style="flex:1;font-size:12px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;outline:none;transition:border-color .2s;">' +
        '<button class="reply-btn" data-anno-id="' + a.id + '" style="font-size:11px;padding:5px 14px;border-radius:6px;border:1px solid #a5b4fc;background:#eef2ff;color:#4338ca;cursor:pointer;white-space:nowrap;font-weight:500;">↩ 回复</button>' +
        '</div>' +
        '<div class="sp-ap-actions">' +
        (isFixed ? '<button class="mark-unfixed" data-anno-id="' + a.id + '">↩ 未修改</button>' : '') +
        '<button class="edit" data-anno-id="' + a.id + '">✏️ 编辑</button>' +
        '<button class="del" data-anno-id="' + a.id + '">🗑 删除</button>' +
        '</div></div>'
    }
    list.innerHTML = toolbarHtml + h
    if (activeFilter && filteredCount === 0) {
      list.innerHTML = toolbarHtml + '<div style="padding:24px 16px;font-size:13px;color:#9ca3af;text-align:center;">没有匹配的批注</div>'
    }
    let allBtn = list.querySelector('.sp-filter-all')
    if (allBtn) allBtn.addEventListener('click', function() { self._filterStatus = null; self._refreshPanel() })
    let nfBtn = list.querySelector('.sp-filter-needfix')
    if (nfBtn) nfBtn.addEventListener('click', function() { self._filterStatus = 'needFix'; self._refreshPanel() })
    let fxBtn = list.querySelector('.sp-filter-fixed')
    if (fxBtn) fxBtn.addEventListener('click', function() { self._filterStatus = 'fixed'; self._refreshPanel() })
    list.querySelectorAll('.reply-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        let input = list.querySelector('.sp-ap-reply-input[data-anno-id="' + btn.dataset.annoId + '"]')
        if (!input || !input.value.trim()) return
        self.addReply(btn.dataset.annoId, input.value.trim())
        input.value = ''
      })
    })
    list.querySelectorAll('.sp-ap-reply-input').forEach(function(input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault()
          let btn = list.querySelector('.reply-btn[data-anno-id="' + input.dataset.annoId + '"]')
          if (btn) btn.click()
        }
      })
    })
    list.querySelectorAll('.mark-unfixed').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.markUnfixed(btn.dataset.annoId)
      })
    })
    list.querySelectorAll('.del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.removeAnnotation(btn.dataset.annoId)
      })
    })
    list.querySelectorAll('.edit').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self._showEditModal(btn.dataset.annoId)
      })
    })
  },

  _showEditModal: function(annoId) {
    let anno = null
    for (let i = 0; i < this._annotations.length; i++) {
      if (this._annotations[i].id === annoId) { anno = this._annotations[i]; break }
    }
    if (!anno) return
    let self = this
    this._removeModal()
    let overlay = document.createElement('div')
    overlay.className = 'sp-annotation-modal modal-overlay'
    overlay.setAttribute('data-review-exempt', '')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;display:flex;align-items:center;justify-content:center;'
    overlay.innerHTML =
      '<div class="modal-box" style="background:#fff;border-radius:16px;padding:28px;max-width:440px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,0.15);">' +
      '<div class="modal-title" style="font-size:18px;font-weight:600;margin-bottom:12px;">✏️ 编辑批注</div>' +
      '<div class="modal-body" style="font-size:14px;color:#6b7280;margin-bottom:20px;line-height:1.6;">' +
      '<div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">元件：<strong>' + escapeHtml(anno.elem) + '</strong></div>' +
      '<textarea class="input" id="sp-anno-comment" rows="6" style="resize:vertical;padding:10px 14px;border-radius:8px;font-size:14px;border:1px solid #e5e7eb;width:100%;outline:none;">' + escapeHtml(anno.comment) + '</textarea>' +
      '</div>' +
      '<div class="modal-actions" style="display:flex;gap:12px;justify-content:flex-end;">' +
      '<button class="btn btn-default" id="sp-anno-cancel" style="display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#6b7280;">取消</button>' +
      '<button class="btn btn-primary" id="sp-anno-submit" style="display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;border:none;background:#2563eb;color:#fff;">保存修改</button>' +
      '</div></div>'
    document.body.appendChild(overlay)
    let textarea = overlay.querySelector('#sp-anno-comment')
    overlay.querySelector('#sp-anno-cancel').onclick = function() { overlay.remove() }
    overlay.querySelector('#sp-anno-submit').onclick = function() {
      let comment = textarea.value.trim()
      if (!comment) { alert('请填写批注内容'); return }
      self.updateAnnotation(annoId, comment)
      overlay.remove()
    }
    textarea.focus()
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove() }
  },

  _copyAnnotations: function() {
    if (this._annotations.length === 0) return
    let lines = ['评审批注汇总报告', '生成时间：' + new Date().toLocaleString(), '']
    this._annotations.forEach(function(a, i) {
      lines.push((i + 1) + '. ' + a.elem)
      lines.push('   批注：' + a.comment)
      lines.push('   页面：' + (a.page || '') + ' | 时间：' + a.time)
      lines.push('')
    })
    let text = lines.join('\n')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() {
        let ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      })
    } else {
      let ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  },

  _applyDOMLock: function(mode) {
    const allInputs = document.querySelectorAll('input, textarea, select')
    allInputs.forEach(function(el) {
      if (el.closest && el.closest('[data-review-exempt]')) return
      if (mode) {
        if (!el.hasAttribute('data-orig-readonly')) {
          el.setAttribute('data-orig-readonly', el.readOnly ? '1' : '0')
        }
        el.readOnly = true
        el.classList.add('review-disabled')
      } else {
        let orig = el.getAttribute('data-orig-readonly')
        if (orig !== '1') el.readOnly = false
        el.classList.remove('review-disabled')
      }
    })
    const btns = document.querySelectorAll('button:not([data-review-exempt]), .btn:not([data-review-exempt])')
    btns.forEach(function(el) {
      if (el.closest && el.closest('[data-review-exempt]')) return
      if (mode) el.classList.add('review-disabled')
      else el.classList.remove('review-disabled')
    })
  },

  downloadJSON: function() {
    if (this._annotations.length === 0) return false
    let data = {
      generatedAt: new Date().toISOString(),
      total: this._annotations.length,
      annotations: this._annotations.slice()
    }
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    let url = URL.createObjectURL(blob)
    let a = document.createElement('a')
    a.href = url
    a.download = 'annotations_' + new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19) + '.json'
    a.click()
    URL.revokeObjectURL(url)
    return true
  }
}

// 初始化：从 localStorage 加载已持久化的批注，并通过文件同步合并远程修改状态
if (typeof localStorage !== 'undefined') { review._loadFromStorage() }

// ============================================================
//  需求引擎
// ============================================================

export const requirement = {
  _data: null,
  _loading: false,
  _loaded: false,
  _error: null,
  _fallbackHtml: '<p>需求说明加载中...</p>',
  _open: false,
  _hub: SubscriberHub(),

  load: function(paths) {
    let self = this
    paths = paths || ['./data/requirements.json', 'data/requirements.json']
    this._loading = true
    this._emit()
    function tryPath(index) {
      if (index >= paths.length) {
        self._loading = false
        self._error = '加载失败'
        self._emit()
        return
      }
      fetch(paths[index])
        .then(function(res) {
          if (res.ok) return res.json()
          throw new Error('not ok')
        })
        .then(function(data) {
          self._data = data
          self._loading = false
          self._loaded = true
          self._error = null
          self._emit()
        })
        .catch(function() { tryPath(index + 1) })
    }
    tryPath(0)
  },

  getPageContent: function(pageId) {
    if (!this._data) return this._fallbackHtml
    const pages = this._data.pages || {}
    if (pages[pageId]) return pages[pageId]
    return this._data.fallback || '当前页面暂无详细需求说明。'
  },

  getTabContent: function(pageId, tabId) {
    if (!this._data) return ''
    const tabs = (this._data.subTabs || {})[pageId] || {}
    return tabs[tabId] || ''
  },

  getCommonContent: function() {
    if (!this._data) return ''
    return this._data.common || ''
  },

  isLoading: function() { return this._loading },
  isLoaded: function() { return this._loaded },
  getError: function() { return this._error },

  show: function(pageId) {
    this._setupDrawer()
    this._currentPageId = pageId
    this._switchTab('req')
    this._updateDrawerContent(pageId)
    document.getElementById('sp-req-mask').classList.add('show')
    document.getElementById('sp-req-drawer').classList.add('open')
    this._open = true
  },

  hide: function() {
    const mask = document.getElementById('sp-req-mask')
    let drawer = document.getElementById('sp-req-drawer')
    if (mask) mask.classList.remove('show')
    if (drawer) drawer.classList.remove('open')
    this._open = false
  },

  toggle: function(pageId) {
    if (this._open) { this.hide() } else { this.show(pageId) }
  },

  isOpen: function() { return this._open },

  _activeTab: 'req',
  _currentPageId: '',

  _switchTab: function(tab) {
    this._activeTab = tab
    const tabs = document.querySelectorAll('.sp-req-tab')
    const contents = document.querySelectorAll('.sp-req-tab-content')
    tabs.forEach(function(el) { el.classList.toggle('active', el.dataset.tab === tab) })
    contents.forEach(function(el) { el.classList.toggle('active', el.dataset.tab === tab) })
    if (tab === 'anno') {
      review._refreshPanel()
    }
  },

  _setupDrawer: function() {
    if (document.getElementById('sp-req-drawer')) return
    const mask = document.createElement('div')
    mask.id = 'sp-req-mask'
    mask.className = 'sp-req-mask'
    mask.setAttribute('data-review-exempt', '')
    let self = this
    mask.onclick = function() { self.hide() }

    let drawer = document.createElement('div')
    drawer.id = 'sp-req-drawer'
    drawer.className = 'sp-req-drawer'
    drawer.setAttribute('data-review-exempt', '')
    drawer.innerHTML =
      '<div class="sp-req-drawer-header"><span>📋 页面说明</span>' +
      '<button class="btn btn-sm" id="sp-req-close" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#6b7280;">✕</button>' +
      '</div>' +
      '<div class="sp-req-tabs">' +
      '<div class="sp-req-tab active" data-tab="req">📄 需求说明</div>' +
      '<div class="sp-req-tab" data-tab="anno">📝 批注记录</div>' +
      '</div>' +
      '<div class="sp-req-tab-content active" data-tab="req">' +
      '<div class="sp-req-tab-body" id="sp-req-tab-body"></div>' +
      '</div>' +
      '<div class="sp-req-tab-content" data-tab="anno">' +
      '<div class="sp-ap-export"><button id="sp-anno-clear-all">清空全部</button><button id="sp-anno-json-btn" style="margin-left:4px;">导出JSON</button><button id="sp-anno-export-btn" style="margin-left:4px;">导出MD</button><button id="sp-anno-copy-btn" style="margin-left:4px;">复制</button></div>' +
      '<div id="sp-req-anno-list"></div>' +
      '</div>'

    document.body.appendChild(mask)
    document.body.appendChild(drawer)
    document.getElementById('sp-req-close').onclick = function() { self.hide() }

    const tabs = drawer.querySelectorAll('.sp-req-tab')
    tabs.forEach(function(el) {
      el.addEventListener('click', function() { self._switchTab(el.dataset.tab) })
    })

    document.getElementById('sp-anno-clear-all').onclick = function() {
      if (confirm('确定要清空所有批注吗？此操作不可恢复。')) {
        review.clearAll()
      }
    }
    document.getElementById('sp-anno-json-btn').onclick = function() {
      if (!review.downloadJSON()) { alert('暂无批注可导出') }
    }
    document.getElementById('sp-anno-export-btn').onclick = function() {
      let md = review.exportMarkdown()
      if (!md) { alert('暂无批注可导出'); return }
      let blob = new Blob([md], { type: 'text/markdown' })
      let url = URL.createObjectURL(blob)
      let a = document.createElement('a')
      a.href = url; a.download = 'review_' + Date.now() + '.md'
      a.click(); URL.revokeObjectURL(url)
    }
    document.getElementById('sp-anno-copy-btn').onclick = function() {
      review._copyAnnotations()
      let btn = this
      const orig = btn.textContent
      btn.textContent = '✓ 已复制'
      btn.style.color = '#059669'
      btn.style.borderColor = '#059669'
      setTimeout(function() { btn.textContent = orig; btn.style.color = ''; btn.style.borderColor = '' }, 1500)
    }
  },

  _updateDrawerContent: function(pageId) {
    const body = document.getElementById('sp-req-tab-body')
    if (!body) return
    const content = this.getPageContent(pageId)
    body.innerHTML = content
  },

  onStateChange: function(fn) { this._hub.on(fn) },
  offStateChange: function(fn) { this._hub.off(fn) },

  _emit: function() {
    this._hub.emit({
      loaded: this._loaded,
      loading: this._loading,
      error: this._error,
      _data: this._data
    })
  }
}

// ============================================================
//  Toast
// ============================================================

export const toast = {
  _container: null,

  show: function(message, type, duration) {
    type = type || 'info'
    duration = duration || 3000
    if (!this._container) {
      this._container = document.createElement('div')
      this._container.id = 'sp-toast-container'
      this._container.setAttribute('data-review-exempt', '')
      this._container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;'
      document.body.appendChild(this._container)
    }
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' }
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
    const toast = document.createElement('div')
    toast.setAttribute('data-review-exempt', '')
    toast.style.cssText =
      'display:flex;align-items:center;gap:8px;padding:12px 20px;background:white;' +
      'border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);font-size:14px;' +
      'min-width:200px;max-width:400px;opacity:0;transform:translateX(20px);' +
      'transition:all 0.3s ease;border-left:4px solid ' + (colors[type] || colors.info) + ';'
    toast.innerHTML = '<span>' + (icons[type] || icons.info) + '</span>' + escapeHtml(message)
    this._container.appendChild(toast)
    requestAnimationFrame(function() {
      toast.style.opacity = '1'
      toast.style.transform = 'translateX(0)'
    })
    setTimeout(function() {
      toast.style.opacity = '0'
      toast.style.transform = 'translateX(20px)'
      setTimeout(function() { toast.remove() }, 300)
    }, duration)
  },

  success: function(msg, d) { this.show(msg, 'success', d) },
  error: function(msg, d) { this.show(msg, 'error', d) },
  warning: function(msg, d) { this.show(msg, 'warning', d) },
  info: function(msg, d) { this.show(msg, 'info', d) }
}

// ============================================================
//  确认弹窗
// ============================================================

export function confirm(message, options) {
  options = options || {}
  return new Promise(function(resolve) {
    let overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.setAttribute('data-review-exempt', '')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100000;display:flex;align-items:center;justify-content:center;'
    overlay.innerHTML =
      '<div class="modal-box" style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,0.15);">' +
      '<div class="modal-title" style="font-size:18px;font-weight:600;margin-bottom:12px;">' + escapeHtml(options.title || '确认操作') + '</div>' +
      '<div class="modal-body" style="font-size:14px;color:#6b7280;margin-bottom:20px;line-height:1.6;">' +
      '<p>' + escapeHtml(message) + '</p>' +
      (options.extraHtml ? escapeHtml(String(options.extraHtml)) : '') +
      '</div>' +
      '<div class="modal-actions" style="display:flex;gap:12px;justify-content:flex-end;">' +
      '<button class="btn btn-default" style="display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#6b7280;">' + escapeHtml(options.cancelText || '取消') + '</button>' +
      '<button class="btn btn-primary" style="display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;border:none;background:#2563eb;color:#fff;">' + escapeHtml(options.okText || '确认') + '</button>' +
      '</div></div>'
    document.body.appendChild(overlay)
    overlay.querySelector('.btn-default').onclick = function() { overlay.remove(); resolve(false) }
    overlay.querySelector('.btn-primary').onclick = function() { overlay.remove(); resolve(true) }
    overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); resolve(false) } }
  })
}

// ============================================================
//  createDefaultActions（统一跨端跳转按钮配置）
// ============================================================

export function isStaticProduction() {
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1'
}

export function resolveAppUrls() {
  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  if (isLocal) {
    return {
      admin: 'http://localhost:5002',
      training: 'http://localhost:5001',
      exam: 'http://localhost:5003',
      ops: 'http://localhost:5005',
      appTraining: 'http://localhost:5004'
    }
  }
  // 生产环境：优先使用环境变量（Vite .env.producible），未注入时回退硬编码域名
  const PROD_URLS = {
    admin: 'https://aisp-78y8v019a.maozi.io/',
    training: 'https://aisptraining-q5h4z019a.maozi.io/',
    exam: 'https://aispexam-q5h4z019a.maozi.io/',
    ops: 'https://aispops-q5h4z019a.maozi.io/',
    appTraining: 'https://aisptrainingphone-q5h4z019a.maozi.io/'
  }
  return {
    admin: import.meta.env.VITE_ADMIN_URL || PROD_URLS.admin,
    training: import.meta.env.VITE_TRAINING_URL || PROD_URLS.training,
    exam: import.meta.env.VITE_EXAM_URL || PROD_URLS.exam,
    ops: import.meta.env.VITE_OPS_URL || PROD_URLS.ops,
    appTraining: import.meta.env.VITE_APP_TRAINING_URL || PROD_URLS.appTraining
  }
}

export function createDefaultActions(route, extra) {
  extra = extra || {}
  const reviewAction = extra.reviewAction || function() {}
  const requirementAction = extra.requirementAction || function() {}
  const btns = extra.btns || [
    { label: '管理端', url: 'http://localhost:5002', name: 'ai-sp-admin', style: { background: '#4A90E2', color: '#fff' } },
    { label: '训练端', url: 'http://localhost:5001', name: 'ai-sp-training', style: { background: '#7c3aed', color: '#fff' } },
    { label: '考试端', url: 'http://localhost:5003', name: 'ai-sp-exam', style: { background: '#059669', color: '#fff' } },
    { label: '运营平台', url: 'http://localhost:5005', name: 'ai-sp-ops', style: { background: '#7c3aed', color: '#fff' } },
    { label: '电子书包', url: 'http://localhost:5004', name: 'ai-sp-app-training', style: { background: '#059669', color: '#fff' } },
  ]

  const actions = [
    { type: 'review', label: '评审', labelActive: '⭐评审中', action: reviewAction },
    { type: 'requirement', label: '需求', action: requirementAction },
  ]

  btns.forEach(function(b) {
    if (b.url) {
      actions.push({
        label: b.label,
        action: function() { window.open(b.url, b.name) },
        style: b.style,
      })
    } else {
      actions.push({
        label: b.label,
        action: function() { toast.show('该端暂未部署上线，请使用本地开发环境访问', 'warning') },
        style: Object.assign({}, b.style, { opacity: '0.5', cursor: 'not-allowed' }),
      })
    }
  })

  return actions
}

// ============================================================
//  BottomActionBar（统一浮动按钮栏，可拖拽、可折叠）
// ============================================================

export const bottomBar = {
  _bars: {},
  _init: false,

  _ensureStyles: function() {
    if (this._init) return
    this._init = true
    let style = document.createElement('style')
    style.id = 'sp-bottom-bar-styles'
    style.textContent = [
      '.sp-floating-bar{position:fixed;z-index:9999;user-select:none;}',
      '.sp-floating-bar .sp-bar-top{display:flex;align-items:center;gap:4px;background:#fff;border-radius:32px;padding:4px 4px 4px 8px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,.08);}',
      '.sp-floating-bar .sp-bar-drag{cursor:grab;color:#9ca3af;font-size:12px;letter-spacing:2px;padding:0 4px;line-height:1;}',
      '.sp-floating-bar .sp-bar-drag:active{cursor:grabbing;}',
      '.sp-floating-bar .sp-bar-toggle{width:30px;height:30px;border-radius:50%;border:1px solid #d1d5db;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all .2s;}',
      '.sp-floating-bar .sp-bar-toggle:hover{background:#f3f4f6;}',
      '.sp-floating-bar .sp-bar-actions{position:absolute;bottom:calc(100% + 8px);right:0;display:flex;flex-direction:column;gap:6px;opacity:0;visibility:hidden;transition:all .2s;pointer-events:none;}',
      '.sp-floating-bar.expanded .sp-bar-actions{opacity:1;visibility:visible;pointer-events:auto;}',
      '.sp-floating-bar .sp-bar-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 16px;border-radius:32px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:13px;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:all .2s;white-space:nowrap;min-width:72px;}',
      '.sp-floating-bar .sp-bar-btn:hover{background:#f3f4f6;border-color:#9ca3af;}',
      '.sp-floating-bar .sp-bar-btn.active{background:#2563eb;color:#fff;border-color:#2563eb;}',
      '.sp-floating-bar .sp-bar-btn.review-active{background:#f59e0b;color:#fff;border-color:#f59e0b;}',
    ].join('\n')
    document.head.appendChild(style)
  },

  render: function(actions, opts) {
    let self = this
    opts = opts || {}
    let barId = opts.barId || 'sp-floating-bar-' + Date.now()
    this._ensureStyles()

    if (this._bars[barId]) this.destroy(barId)

    let bar = document.createElement('div')
    bar.className = 'sp-floating-bar expanded'
    bar.id = barId
    bar.style.left = opts.left || 'auto'
    bar.style.right = opts.right || '20px'
    bar.style.bottom = opts.bottom || '20px'

    let topRow = document.createElement('div')
    topRow.className = 'sp-bar-top'

    let dragHandle = document.createElement('div')
    dragHandle.className = 'sp-bar-drag'
    dragHandle.textContent = '⋮⋮'
    topRow.appendChild(dragHandle)

    let toggle = document.createElement('div')
    toggle.className = 'sp-bar-toggle'
    toggle.textContent = '🔽'
    toggle.title = '收起'
    topRow.appendChild(toggle)

    bar.appendChild(topRow)

    let actionsWrap = document.createElement('div')
    actionsWrap.className = 'sp-bar-actions'
    bar.appendChild(actionsWrap)

    let btns = []

    actions.forEach(function(item) {
      let btn = document.createElement('div')
      btn.className = 'sp-bar-btn'
      if (item.type === 'review') btn.classList.add('review-btn')
      if (item.type === 'requirement') btn.classList.add('req-btn')
      if (item.style) {
        Object.keys(item.style).forEach(function(k) { btn.style[k] = item.style[k] })
      }
      btn.textContent = item.label || ''
      btn.title = item.label || ''

      btn.addEventListener('click', function(e) {
        e.stopPropagation()
        if (item.action) item.action()
      })

      actionsWrap.appendChild(btn)
      btns.push({ el: btn, item: item })
    })

    let expanded = true
    toggle.addEventListener('click', function(e) {
      e.stopPropagation()
      expanded = !expanded
      bar.classList.toggle('expanded', expanded)
      toggle.textContent = expanded ? '🔽' : '🔼'
      toggle.title = expanded ? '收起' : '展开'
    })

    let dragging = false, startX, startY, origLeft, origTop

    function onDragMove(e) {
      if (!dragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const left = Math.max(0, Math.min(window.innerWidth - bar.offsetWidth, origLeft + dx))
      const top = Math.max(0, Math.min(window.innerHeight - bar.offsetHeight, origTop + dy))
      bar.style.left = left + 'px'
      bar.style.top = top + 'px'
    }

    function onDragEnd() {
      dragging = false
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onDragMove)
      document.removeEventListener('mouseup', onDragEnd)
    }

    dragHandle.addEventListener('mousedown', function(e) {
      e.preventDefault()
      dragging = true
      startX = e.clientX
      startY = e.clientY
      origLeft = bar.offsetLeft
      origTop = bar.offsetTop
      bar.style.right = 'auto'
      bar.style.bottom = 'auto'
      bar.style.left = origLeft + 'px'
      bar.style.top = origTop + 'px'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onDragMove)
      document.addEventListener('mouseup', onDragEnd)
    })

    this._bars[barId] = { bar: bar, buttons: btns, actions: actions }

    const targetEl = opts.target
    if (!targetEl) {
      document.body.appendChild(bar)
    } else if (typeof targetEl === 'string') {
      let el = document.querySelector(targetEl)
      if (el) { el.innerHTML = ''; el.appendChild(bar) }
    } else {
      targetEl.innerHTML = ''
      targetEl.appendChild(bar)
    }

    this._syncButtons(barId)
    const unsub1 = review._hub.on(function() { self._syncButtons(barId) })
    const unsub2 = requirement._hub.on(function() { self._syncButtons(barId) })
    this._bars[barId]._unsubscribe = function() { unsub1(); unsub2() }
  },

  _syncButtons: function(barId) {
    const bar = this._bars[barId]
    if (!bar) return
    const reviewActive = review.isActive()
    const reqActive = requirement.isOpen()
    bar.buttons.forEach(function(b) {
      if (b.item.type === 'review') {
        b.el.textContent = reviewActive ? (b.item.labelActive || '⭐评审中') : (b.item.label || '评审')
        if (reviewActive) b.el.classList.add('review-active')
        else b.el.classList.remove('review-active')
      }
      if (b.item.type === 'requirement') {
        if (reqActive) b.el.classList.add('active')
        else b.el.classList.remove('active')
      }
    })
  },

  destroy: function(barId) {
    const bar = this._bars[barId]
    if (!bar) return
    if (bar._unsubscribe) bar._unsubscribe()
    if (bar.bar && bar.bar.parentNode) bar.bar.parentNode.removeChild(bar.bar)
    delete this._bars[barId]
  }
}

// ============================================================
//  Composables 导出
// ============================================================

export { useDebounce, useDebouncedRef } from './composables/useDebounce.js'

// ============================================================
//  考站方案编辑数据 — 共享读写（通过 Vite 插件持久化到 JSON 文件）
//  生产环境应替换为后端 API
// ============================================================

export { stationSchemesEdits } from '../data/station-schemes-edits.js'

// ============================================================
//  考站方案数据 — 共享给所有端使用
// ============================================================

export {
  loadAllSchemes,
  loadSchemesByPhase,
  saveSchemeEdit,
  removeSchemeEdit,
  resetAllEdits,
  residencySchemes,
  collegeSchemes,
  specialtySchemes,
  SPECIALTIES,
  getSpecialty,
  resolveSpecialty,
  resolveStationKey,
  ALL_CN_NAMES
} from '../data/station-schemes/index.js'

// ============================================================
//  考核记录演示数据 — 基于考站方案配置生成
// ============================================================

export { generateExamRecords } from '../data/exam-records-demo.js'

// ============================================================
//  考站/剖面/项目统一常量
// ============================================================

export {
  STATION_ID_TO_LABEL,
  STATION_TO_PROFILE_TYPE,
  STATION_TO_SESSION_KEY,
  PROFILE_TYPE_LABELS,
  PROFILE_CONFIG_MAP,
  STATION_LABEL_TO_IDS,
  STATION_LABEL_ALIASES,
  PROJECT_TAB_CONFIG,
  PROJECT_TO_STATION_TARGET,
  BUILTIN_STATIONS,
  getStationLabel,
  getProfileType,
  getStationIdsByLabel,
  getReportLookupPrefixes,
} from './station-constants.js'

// ============================================================
//  难度等级统一工具 — 三阶段七级 + 病例分级双标签体系
// ============================================================

export const TRAINING_LEVELS = [
  { value: 'U1', label: 'U1 - 见习', phase: '院校教育', caseLevel: 'basic' },
  { value: 'U2', label: 'U2 - 实习', phase: '院校教育', caseLevel: 'basic' },
  { value: 'R1', label: 'R1 - 住培一年级', phase: '住培阶段', caseLevel: 'advanced' },
  { value: 'R2', label: 'R2 - 住培二年级', phase: '住培阶段', caseLevel: 'advanced' },
  { value: 'R3', label: 'R3 - 住培三年级', phase: '住培阶段', caseLevel: 'advanced' },
  { value: 'F1', label: 'F1 - 专科进阶', phase: '专培阶段', caseLevel: 'difficult' },
  { value: 'F2', label: 'F2 - 独立专家', phase: '专培阶段', caseLevel: 'difficult' },
]

export const CASE_LEVEL_MAP = {
  basic: '基础病例',
  advanced: '高阶病例',
  difficult: '疑难病例',
}

export const LEVEL_TO_CASE_LEVEL = {
  U1: 'basic', U2: 'basic',
  R1: 'advanced', R2: 'advanced', R3: 'advanced',
  F1: 'difficult', F2: 'difficult',
}

export const LEVEL_LABEL_MAP = Object.fromEntries(TRAINING_LEVELS.map(l => [l.value, l.label]))

export const LEVEL_BADGE_CLASS = {
  'U1': 'badge-info', 'U2': 'badge-info',
  'R1': 'badge-success', 'R2': 'badge-warning', 'R3': 'badge-warning',
  'F1': 'badge-error', 'F2': 'badge-error',
}

export const CASE_LEVEL_BADGE_CLASS = {
  basic: 'badge-info',
  advanced: 'badge-warning',
  difficult: 'badge-error',
}

export function getDifficultyLabel(level) {
  if (!level) return ''
  return LEVEL_LABEL_MAP[level] || level
}

export function getCaseLevel(level) {
  if (!level) return ''
  return LEVEL_TO_CASE_LEVEL[level] || ''
}

export function getCaseLevelLabel(level) {
  const cl = getCaseLevel(level)
  return CASE_LEVEL_MAP[cl] || ''
}

export function getDifficultyBadgeClass(level) {
  return LEVEL_BADGE_CLASS[level] || 'badge-info'
}

export function getCaseLevelBadgeClass(level) {
  const cl = getCaseLevel(level)
  return CASE_LEVEL_BADGE_CLASS[cl] || 'badge-info'
}
