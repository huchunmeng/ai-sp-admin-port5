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

  // ─── SP病例详情 ───
  console.log('1/3 SP病例详情...')
  await p.goto(BASE + '/case-detail/EM-20260526-X8K2', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(2000)
  await snap(p, '03-SP病例详情')

  // ─── MDT病例列表 ───
  console.log('2/3 MDT病例列表...')
  await p.goto(BASE + '/mdt-cases', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(1000)
  await snap(p, '05-MDT讨论列表')

  // ─── MDT病例详情(陈建国) ───
  console.log('3/3 MDT病例详情...')
  await p.goto(BASE + '/case-detail/EM-20260526-X8K2?from=mdt&mdtId=MDT-20260701-C4K7', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: HIDE_CSS })
  await p.waitForTimeout(2000)
  const mdtMode = await p.evaluate(() => {
    const el = document.querySelector('.mdt-layout')
    const bar = document.querySelector('.mdt-patient-bar')
    return { hasMDTLayout: !!el, hasBar: !!bar }
  })
  console.log('  MDT debug:', JSON.stringify(mdtMode))
  await snap(p, '06-MDT病例详情')

  await browser.close()
  console.log('\n完成!')
})()
