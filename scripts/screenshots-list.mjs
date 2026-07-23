import { chromium } from 'playwright'
import path from 'path'

const OUT_DIR = 'D:/klord的个人文件夹/02_work - 副本/00_我的工作区/10_虚拟病人产品/55_客户相关/20_东南大学中大医院/信息中心项目/8月8日演示版本设计文件/截图'
const BASE = 'http://localhost:5001/#'
const HIDE_CSS = `.sp-floating-bar { display: none !important; }`

async function snap(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, name + '.png') })
  console.log('OK:', name)
}

(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()

  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)

  await p.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const store = pinia._s.get('training')
    if (store) {
      store.clearActiveFlow()
      store.setSpecialty('急诊科')
    }
    localStorage.removeItem('active-training-flow')
  })

  console.log('SP病例列表...')
  await p.goto(BASE + '/case-list/急诊科', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(2000)
  await snap(p, '02-SP病例列表')

  await browser.close()
  console.log('完成!')
})()
