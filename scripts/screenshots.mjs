import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const OUT_DIR = 'D:/klord的个人文件夹/02_work - 副本/00_我的工作区/10_虚拟病人产品/55_客户相关/20_东南大学中大医院/信息中心项目/8月8日演示版本设计文件/截图'
const BASE = 'http://localhost:5001/#'

const HIDE_CSS = `.sp-floating-bar { display: none !important; }`

async function snap(page, name, opts = {}) {
  await page.screenshot({ path: path.join(OUT_DIR, name + '.png'), ...opts })
  console.log('OK:', name)
}

(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })

  // ─── 1. 首页 ───
  console.log('1/7 首页...')
  let p = await ctx.newPage()
  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(800)
  await snap(p, '01-首页')

  // ─── 2. SP病例列表 ───
  console.log('2/7 SP病例列表...')
  await p.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    pinia._s.get('training')?.setSpecialty('急诊科')
  })
  await p.goto(BASE + '/case-list/急诊科', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(800)
  try { await p.click('.spec-modal-close', { timeout: 2000 }); await p.waitForTimeout(400) } catch {}
  await snap(p, '02-SP病例列表')

  // ─── 3. SP病例详情 ───
  console.log('3/7 SP病例详情...')
  await p.goto(BASE + '/case-detail/EM-20260526-X8K2', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(1200)
  await snap(p, '03-SP病例详情')

  // ─── 4. 病史采集（FloatInfoPanel + AI伴学 + 演示对话） ───
  console.log('4/7 病史采集...')
  await p.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    pinia._s.get('training').currentCase = { id: 'EM-20260526-X8K2', title: '急性心肌梗死', specialty: '急诊科', patient: { name: '王德胜', gender: '男', age: '58' } }
  })
  await p.goto(BASE + '/history-taking', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(2500)

  // 注入演示对话到 Vue 响应式 messages
  const injected = await p.evaluate(() => {
    function walk(vnode) {
      if (!vnode) return false
      const c = vnode.component
      if (c && c.setupState) {
        const s = c.setupState
        if (s.aisp && s.aisp.messages) {
          const ref = s.aisp.messages
          const arr = ref._value || ref.value || ref
          if (arr && Array.isArray(arr)) {
            arr.splice(0, arr.length,
              { role: 'user', content: '您好，我是今天的接诊医生。请问您哪里不舒服？', time: Date.now() - 300000 },
              { role: 'sp', content: '医生，我胸口疼得厉害...从下午两点左右开始的，疼了有两个多小时了，左边肩膀和胳膊也跟着疼。', time: Date.now() - 280000, emotion: 'pain' },
              { role: 'user', content: '疼痛程度如果用0-10分来描述，0分不疼10分最疼，您觉得现在大概几分？', time: Date.now() - 240000 },
              { role: 'sp', content: '至少八九分吧...从来没这么疼过，疼得我一身冷汗，还有点恶心想吐。开车开到一半突然疼起来的。', time: Date.now() - 220000, emotion: 'anxious' },
              { role: 'user', content: '您以前有过类似的胸痛吗？有没有高血压、糖尿病的病史？', time: Date.now() - 180000 },
              { role: 'sp', content: '以前没有这么疼过。血压高有七八年了，吃的氨氯地平，最近半年没怎么量过血压。血脂也高，之前吃过阿托伐他汀，后来自己停了。', time: Date.now() - 160000, emotion: 'calm' },
              { role: 'user', content: '您平时抽烟喝酒吗？家里人有没有心脏病史？', time: Date.now() - 120000 },
              { role: 'sp', content: '抽烟抽了三十年了，一天一包。酒偶尔喝一点。我父亲68岁的时候就是因为心梗走的...医生，我不会也是心脏的问题吧？', time: Date.now() - 100000, emotion: 'fear' },
            )
            return true
          }
        }
        if (s.messages && Array.isArray(s.messages)) { s.messages.splice(0); return false }
      }
      if (c && c.subTree && walk(c.subTree)) return true
      if (Array.isArray(vnode.children)) { for (const ch of vnode.children) { if (walk(ch)) return true } }
      if (vnode.dynamicChildren) { for (const ch of vnode.dynamicChildren) { if (walk(ch)) return true } }
      return false
    }
    const root = document.querySelector('#app').__vue_app__._instance
    return walk(root.subTree)
  })
  console.log('  消息注入:', injected ? '成功' : '未找到messages')
  await p.waitForTimeout(500)

  // 打开 FloatInfoPanel
  try { await p.click('.float-info-trigger', { timeout: 3000 }) } catch {}
  await p.waitForTimeout(400)

  // 展开 AI 伴学
  try { await p.click('.companion-trigger', { timeout: 3000 }) } catch {}
  await p.waitForTimeout(500)
  try { await p.click('.suggested-q:first-child', { timeout: 2000 }) } catch {}
  await p.waitForTimeout(1000)

  await snap(p, '04-病史采集-AI伴学')

  // ─── 5. MDT讨论列表 ───
  console.log('5/7 MDT讨论列表...')
  await p.goto(BASE + '/mdt-cases', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(1000)
  await snap(p, '05-MDT讨论列表')

  // ─── 6. MDT病例详情 ───
  console.log('6/7 MDT病例详情...')
  await p.goto(BASE + '/case-detail/EM-20260526-X8K2?from=mdt&mdtId=MDT-20260701-C4K7', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(1000)
  await snap(p, '06-MDT病例详情')

  // ─── 7. MDT讨论页面 ───
  console.log('7/7 MDT讨论页面...')
  await p.goto(BASE + '/mdt-discussion/MDT-20260701-C4K7', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(1000)
  await snap(p, '07-MDT讨论页面')

  await browser.close()
  console.log('\n全部截图完成!')
})()
