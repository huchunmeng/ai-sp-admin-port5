// MDT 会诊前发起流程冒烟测试 — 发起流程独立页面化后：prep 无角色卡片固定主诊·管床·主任，开始后跳转独立发起页（mdt-premeeting）完成申请→资料确认→确认进入讨论
// 用法: node scripts/test-mdt-roles.mjs [CASE_ID]
import { chromium } from 'playwright'

const BASE = 'http://localhost:5001'
const CASE_ID = process.argv[2] || 'MDT-20260701-C4K7'
const URL = `${BASE}/#/mdt-discussion/${CASE_ID}`

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  —  ' + detail : ''}`)
}

async function waitFor(page, fn, { timeout = 90000, interval = 400, desc = '' } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try { const v = await fn(); if (v) return v } catch (e) { /* 继续轮询 */ }
    await page.waitForTimeout(interval)
  }
  throw new Error(`waitFor 超时 [${desc}]`)
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // 登录身份（训练端）—— 用 addInitScript 在页面加载前注入，避免 hash 导航不重载 store
  await ctx.addInitScript(() => {
    localStorage.setItem('training-user-identity', JSON.stringify({ name: '测试学员', institution: '中大医院' }))
  })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // ── 1. prep：无角色卡片，固定主诊·管床·主任 ──
  const roleCards = await page.$$('.prep-role')
  check('prep 无角色选择卡片（.prep-role 数量=0）', roleCards.length === 0, `实际 ${roleCards.length} 个`)
  const fixedName = await page.$eval('.prep-role-fixed-name', el => el.textContent.trim()).catch(() => '')
  check('固定角色 = 主诊·管床·主任', fixedName === '主诊·管床·主任', fixedName)
  const bodyText = await page.evaluate(() => document.body.innerText)
  check('界面无「观察者」「住院医师」文案', !bodyText.includes('观察者') && !bodyText.includes('住院医师'))

  // ── 2. 开始讨论 → 跳转独立会诊前发起页（C4K7 启用 preMeeting）──
  await page.click('.prep-start')
  await waitFor(page, () => page.url().includes('mdt-premeeting'), { desc: '跳转发起页' })
  check('开始后跳转到独立发起页（URL 含 mdt-premeeting）', true, page.url())
  await waitFor(page, () => page.$('.pm-context-text'), { desc: '发起页情境' })
  check('发起页展示会诊前情境', true)
  const selected = await waitFor(page, () => {
    return page.$$('.pm-dept-option.selected').then(l => (l.length >= 2 ? l.length : null))
  }, { desc: '预填科室' })
  check('申请表预填邀请科室 ≥ 2', true, `选中 ${selected} 个`)
  check('发起页为独立页面（非讨论页弹窗）', page.url().includes('mdt-premeeting') && !page.url().includes('mdt-discussion'))
  await page.click('.pm-footer .btn-primary')   // 提交申请
  await waitFor(page, () => page.$('.pm-material-item'), { desc: '资料包步骤' })
  check('提交 → 切到资料包步骤', true)
  await page.click('.pm-footer .btn-primary')   // 确认进入会诊
  await waitFor(page, () => page.$('.steps-bar'), { desc: '进入讨论区' })
  check('确认进入会诊 → 跳回讨论区阶段条', true)

  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log('\n' + (failed.length === 0 ? '全部通过 ✓' : `失败 ${failed.length} 项 ✗`))
  process.exit(failed.length ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
