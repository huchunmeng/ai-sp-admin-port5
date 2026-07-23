import { ref, onUnmounted } from 'vue'

export function useSignature() {
  const canvasRef = ref(null)
  let drawing = false
  let ctx = null

  function init() {
    const c = canvasRef.value
    if (!c) return
    ctx = c.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1F2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    c.addEventListener('mousedown', onStart)
    c.addEventListener('mousemove', onMove)
    c.addEventListener('mouseup', onEnd)
    c.addEventListener('mouseleave', onEnd)
    c.addEventListener('touchstart', onTouchStart, { passive: false })
    c.addEventListener('touchmove', onTouchMove, { passive: false })
    c.addEventListener('touchend', onEnd)
  }

  function getPos(e) {
    const c = canvasRef.value
    if (!c) return { x: 0, y: 0 }
    const r = c.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function getTouchPos(e) {
    const c = canvasRef.value
    if (!c || !e.touches || !e.touches[0]) return { x: 0, y: 0 }
    const r = c.getBoundingClientRect()
    const t = e.touches[0]
    return { x: t.clientX - r.left, y: t.clientY - r.top }
  }

  function onStart(e) {
    drawing = true
    const p = getPos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function onMove(e) {
    if (!drawing) return
    const p = getPos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function onEnd() {
    drawing = false
  }

  function onTouchStart(e) {
    e.preventDefault()
    drawing = true
    const p = getTouchPos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function onTouchMove(e) {
    e.preventDefault()
    if (!drawing) return
    const p = getTouchPos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function clear() {
    const c = canvasRef.value
    if (c && ctx) {
      ctx.clearRect(0, 0, c.width, c.height)
    }
  }

  function destroy() {
    const c = canvasRef.value
    if (!c) return
    c.removeEventListener('mousedown', onStart)
    c.removeEventListener('mousemove', onMove)
    c.removeEventListener('mouseup', onEnd)
    c.removeEventListener('mouseleave', onEnd)
    c.removeEventListener('touchstart', onTouchStart)
    c.removeEventListener('touchmove', onTouchMove)
    c.removeEventListener('touchend', onEnd)
  }

  onUnmounted(destroy)

  return { canvasRef, init, clear, destroy }
}
