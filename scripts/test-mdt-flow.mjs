// MDT 训练流程重构冒烟测试（flowVersion 2）
// 覆盖：prep 无角色卡片/固定主诊·管床·主任；C4K7 走会诊前（独立发起页 mdt-premeeting，提交申请→资料确认→确认进入）→病例汇报含摘要/住院经过→无 case-raw→专科依次发言→影像解读→拍板 plan01→确认最终方案→决策对照→反思收尾；
//       BRFH 直接进讨论→case-raw 卡→原始病历抽屉事件线→无影像解读；全程不得出现「初步诊断印象」任务卡（diag01 已移除）。
// 用法: node scripts/test-mdt-flow.mjs [--fast]
import { chromium } from 'playwright'

const BASE = 'http://localhost:5001'
const A = 'MDT-20260701-C4K7'     // premeeting + admissionContext + exhibit + 无 raw
const B = 'MDT-20260804-BRFH'     // 直接进讨论 + 有 raw + 无 exhibit

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  —  ' + detail : ''}`)
}

async function waitFor(page, fn, { timeout = 90000, interval = 400, desc = '' } = {}) {
  const start = Date.now()
  let last
  while (Date.now() - start < timeout) {
    try { const v = await fn(); if (v) return v; last = v } catch (e) { last = e }
    await page.waitForTimeout(interval)
  }
  throw new Error(`waitFor 超时 [${desc}]`)
}

const expertTexts = page => page.$$eval('.mdt-msg-text', els => els.map(e => e.textContent || ''))
const senderTexts = page => page.$$eval('.mdt-msg-sender', els => els.map(e => e.textContent.trim()))
const stepLabels = page => page.$$eval('.step-item .step-label', els => els.map(e => e.textContent.trim()))
const cardTitles = page => page.$$eval('.chat-card-title', els => els.map(e => e.textContent.trim()))

// 轮询等待某断言通过，并把断言结果记录为 check
async function expect(page, name, fn, { timeout = 90000, desc = '' } = {}) {
  try {
    const v = await waitFor(page, fn, { timeout, desc: name })
    check(name, true, typeof v === 'string' ? v : '')
  } catch (e) {
    check(name, false, e.message)
  }
}

// 新建页面并注入训练端登录身份
async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('training-user-identity', JSON.stringify({ name: '测试学员', institution: '中大医院' }))
  })
  const page = await ctx.newPage()
  return { ctx, page }
}

// 通用任务卡填写+提交（text 类）
async function fillAndSubmitTask(page, cardTitle, text) {
  const cards = await page.$$('.chat-card')
  const titles = await cardTitles(page)
  const idx = titles.findIndex(t => t.includes(cardTitle))
  if (idx < 0) throw new Error(`未找到任务卡「${cardTitle}」，现有: ${titles.join(' / ')}`)
  await cards[idx].click()
  await waitFor(page, () => page.$('.card-modal .flow-textarea'), { desc: '任务卡打开' })
  await page.fill('.card-modal .flow-textarea', text)
  const canSubmit = await page.$eval('.card-modal-footer .btn-primary', el => !el.disabled)
  if (!canSubmit) throw new Error(`任务「${cardTitle}」提交按钮不可用`)
  await page.click('.card-modal-footer .btn-primary')
}

// ── 用例 A：C4K7（会诊前 + 增强汇报 + 影像解读 + 拍板/决策/反思）──
async function runCaseA(browser) {
  console.log(`\n═══ 用例 A：${A}（premeeting + 摘要/住院经过 + 影像解读 + 无 raw）═══`)
  const { ctx, page } = await newPage(browser)
  await page.goto(`${BASE}/#/mdt-discussion/${A}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  // 1. prep：无角色卡片，固定主诊·管床·主任
  await expect(page, 'prep 面板出现（.prep-role-fixed）', () => page.$('.prep-role-fixed'))
  const roleCards = await page.$$('.prep-role')
  check('prep 无角色选择卡片（.prep-role 数量=0）', roleCards.length === 0, `实际 ${roleCards.length} 个`)
  const fixedName = await page.$eval('.prep-role-fixed-name', el => el.textContent.trim()).catch(() => '')
  check('固定角色 = 主诊·管床·主任', fixedName === '主诊·管床·主任', fixedName)
  const prepBody = await page.evaluate(() => document.body.innerText)
  check('prep 无「观察者」文案', !prepBody.includes('观察者'))
  check('prep 无「住院医师」文案', !prepBody.includes('住院医师'))

  // 2. 开始讨论 → 跳转独立会诊前发起页（流程在独立页面，不占讨论页聊天流）
  await page.click('.prep-start')
  await expect(page, '开始后跳转到会诊前发起页（URL 含 mdt-premeeting）', async () =>
    page.url().includes('mdt-premeeting') ? '✓' : null)
  await expect(page, '发起页展示会诊前情境', () => page.$('.pm-context-text'))
  await expect(page, '发起页含申请表（拟邀请科室）', () => page.$('.pm-dept-option'))
  const selectedDepts = await page.$$('.pm-dept-option.selected').then(l => l.length)
  check('申请表预填邀请科室 ≥ 2', selectedDepts >= 2, `选中 ${selectedDepts} 个`)
  check('发起页为独立页面（非讨论页弹窗）', page.url().includes('mdt-premeeting') && !page.url().includes('mdt-discussion'))
  await page.click('.pm-footer .btn-primary')   // 提交申请
  await expect(page, '审批通过 → 切到资料包步骤', () => page.$('.pm-material-item'))
  await expect(page, '审批通过提示出现', () => page.$('.pm-approved-msg'))
  await page.click('.pm-footer .btn-primary')   // 确认进入会诊

  // 3. 进入讨论 → 病例汇报（含病情摘要/住院经过）
  await expect(page, '确认进入会诊 → 讨论区阶段条', () => page.$('.steps-bar'))
  await expect(page, '病例汇报含【病情摘要】与【住院经过】', async () => {
    const t = (await expertTexts(page)).join('\n')
    return t.includes('病情摘要') && t.includes('住院经过') ? '✓' : null
  }, { desc: '汇报文本' })
  check('无 case-raw 卡（C4K7 未绑定原始病历）', (await page.$$('.case-raw-card')).length === 0)

  // 4. 专科意见：心内/心外/肾内依次发言
  for (const dept of ['心内科', '心外科', '肾内科']) {
    await expect(page, `专科发言：${dept}`, async () => (await senderTexts(page)).includes(dept) ? dept : null)
  }

  // 5. 影像解读（angio01 冠脉造影标注）
  await expect(page, '影像解读 → 出现任务卡「冠脉造影标注」', async () => {
    const t = await cardTitles(page)
    return t.includes('冠脉造影标注') ? '✓' : null
  })
  await page.click('.chat-card .chat-card-body')
  await expect(page, '影像任务卡打开', () => page.$('.card-modal .ct-placeholder'))
  await page.click('.ct-placeholder', { position: { x: 80, y: 60 } })
  await page.waitForTimeout(150)
  await page.click('.ct-placeholder', { position: { x: 140, y: 100 } })
  const markerCount = await page.$$('.ct-marker').then(l => l.length)
  check('影像标注点已添加 ≥ 2', markerCount >= 2, `${markerCount} 处`)
  await page.click('.card-modal-footer .btn-primary')
  await page.waitForTimeout(600)

  // 影像反馈播完 → 点继续进入自由讨论/拍板
  await expect(page, '影像反馈后继续可用', async () => {
    const d = await page.$eval('.btn-continue', el => el.disabled).catch(() => true)
    return d ? null : '✓'
  })
  await page.click('.btn-continue')

  // 6. 拍板决策：plan01 → 确认最终方案 → 决策对照
  await expect(page, '拍板 → 出现任务卡「主诊医师最终决策」', async () => {
    const t = await cardTitles(page)
    return t.includes('主诊医师最终决策') ? '✓' : null
  })
  await fillAndSubmitTask(page, '主诊医师最终决策', '1. 诊断：冠状动脉粥样硬化性心脏病（不稳定型心绞痛）\n2. 方案：药物强化 + 择期介入评估\n3. 依据：CTO 病变，多支血管受累，权衡血运重建风险收益')
  await expect(page, '提交后弹「确认最终方案」', async () => {
    const h3 = await page.$eval('.modal-header h3', el => el.textContent.trim()).catch(() => '')
    return h3.includes('确认最终方案') ? h3 : null
  })
  await page.click('.confirm-plan-footer .btn-primary')
  await expect(page, '主持人确认反馈后继续可用', async () => {
    const d = await page.$eval('.btn-continue', el => el.disabled).catch(() => true)
    return d ? null : '✓'
  })
  await page.click('.btn-continue')
  await expect(page, 'MDT 最终决策卡出现', () => page.$('.mdt-decision-card'))
  await expect(page, '随访计划卡出现', () => page.$('.followup-card-flow'))
  await expect(page, '参考文献卡出现', () => page.$('.references-card-flow'))
  check('拍板后未出现 diag01「初步诊断印象」任务卡', !(await cardTitles(page)).some(t => t.includes('初步诊断印象')))

  // 7. 反思收尾 → 结束
  await expect(page, '反思 → 出现任务卡「反思总结」', async () => {
    const t = await cardTitles(page)
    return t.includes('反思总结') ? '✓' : null
  })
  await fillAndSubmitTask(page, '反思总结', '本次讨论让我认识到多学科权衡的重要性，尤其血运重建与药物保守治疗的分歧点值得进一步学习。')
  await expect(page, '反思反馈后继续可用', async () => {
    const d = await page.$eval('.btn-continue', el => el.disabled).catch(() => true)
    return d ? null : '✓'
  })
  await page.click('.btn-continue')
  await expect(page, '讨论结束（继续按钮变「讨论已结束」）', async () => {
    const label = await page.$eval('.btn-continue', el => el.textContent.trim()).catch(() => '')
    return label.includes('讨论已结束') ? label : null
  })

  await ctx.close()
}

// ── 用例 B：BRFH（直接进讨论 + 原始病历抽屉 + 无影像解读）──
async function runCaseB(browser) {
  console.log(`\n═══ 用例 B：${B}（直接进讨论 + case-raw 抽屉 + 无影像解读）═══`)
  const { ctx, page } = await newPage(browser)
  await page.goto(`${BASE}/#/mdt-discussion/${B}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  await expect(page, 'prep 出现', () => page.$('.prep-role-fixed'))
  await page.click('.prep-start')

  // 直接进讨论（dept=1 不满足会诊前 ≥2 条件）
  await expect(page, '直接进入讨论区（无会诊前卡）', () => page.$('.steps-bar'))
  check('未出现「发起 MDT」会诊前卡', (await page.$$('.premeeting-cta-card')).length === 0)

  // case-raw 卡 + 原始病历抽屉（BRFH 源无 records 结构 → 走全文回退分支）
  await expect(page, '出现「查看原始病历」卡', () => page.$('.case-raw-card'))
  await page.click('.case-raw-card .btn-primary')
  await expect(page, '原始病历抽屉打开', () => page.$('.raw-drawer'))
  await expect(page, '抽屉渲染内容（事件线或全文回退）', async () => {
    const n = await page.$$('.raw-item').then(l => l.length)
    const fb = await page.$('.raw-fallback-title')
    if (n > 0) return `事件线 ${n} 条`
    if (fb) return '全文回退'
    return null
  })
  const rawItemsB = await page.$$('.raw-item').then(l => l.length)
  if (rawItemsB > 0) {
    await page.click('.raw-item .raw-item-header')
    await expect(page, '点击条目可展开全文', () => page.$('.raw-item .raw-item-body pre'))
  } else {
    await expect(page, '全文回退有正文', () => page.$('.raw-drawer .raw-item-body-pre'))
  }
  await page.click('.raw-drawer .modal-close')
  check('抽屉可关闭', !(await page.$('.raw-drawer')))

  // 无影像解读阶段
  const labels = await stepLabels(page)
  check('阶段条不含「影像解读」', !labels.includes('影像解读'), labels.join('→'))

  // 专科意见（神经内科）
  await expect(page, '专科发言：神经内科', async () => (await senderTexts(page)).includes('神经内科') ? '神经内科' : null)
  check('全流程未出现「初步诊断印象」任务卡', !(await cardTitles(page)).some(t => t.includes('初步诊断印象')))

  await ctx.close()
}

// ── 用例 C：1PY2（premeeting 快速通过 + 原始病历事件线 .raw-item）──
async function runCaseC(browser) {
  const C = 'MDT-20260806-1PY2'
  console.log(`\n═══ 用例 C：${C}（premeeting + 原始病历事件线渲染）═══`)
  const { ctx, page } = await newPage(browser)
  await page.goto(`${BASE}/#/mdt-discussion/${C}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  await expect(page, 'prep 出现', () => page.$('.prep-role-fixed'))
  await page.click('.prep-start')
  await expect(page, '跳转到会诊前发起页（含申请表）', () => page.$('.pm-dept-option'))
  await page.click('.pm-footer .btn-primary')   // 提交申请
  await expect(page, '审批通过 → 切到资料包步骤', () => page.$('.pm-material-item'))
  await page.click('.pm-footer .btn-primary')   // 确认进入会诊
  await expect(page, '进入讨论区', () => page.$('.steps-bar'))

  // case-raw 卡 → 打开抽屉 → 事件线（结构化 records 渲染）
  await expect(page, '出现「查看原始病历」卡', () => page.$('.case-raw-card'))
  await page.click('.case-raw-card .btn-primary')
  await expect(page, '原始病历抽屉打开', () => page.$('.raw-drawer'))
  await expect(page, '事件线渲染多条记录（.raw-item）', async () => {
    const n = await page.$$('.raw-item').then(l => l.length)
    return n >= 2 ? `${n} 条` : null
  })
  const types = await page.$$eval('.raw-item-type', els => els.map(e => e.textContent.trim()))
  check('记录带类型标签（如 入院记录/病程记录）', types.length > 0 && types.every(t => t && t.length > 0), types.slice(0, 4).join(' / '))
  await page.click('.raw-item .raw-item-header')
  await expect(page, '点击条目可展开全文', () => page.$('.raw-item .raw-item-body pre'))
  await page.click('.raw-drawer .modal-close')
  check('抽屉可关闭', !(await page.$('.raw-drawer')))

  await ctx.close()
}

// ── 用例 D：BRFH 旧流程会话（flowVersion=1）→ 进入自动重播新流程 ──
async function runCaseD(browser) {
  const D = 'MDT-20260804-BRFH'
  console.log(`\n═══ 用例 D：${D}（旧流程存档 flowVersion=1 → 重播新流程）═══`)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  // 注入登录身份 + 旧流程会话（v1，含 diag01 任务卡与旧消息）
  await ctx.addInitScript(({ D }) => {
    localStorage.setItem('training-user-identity', JSON.stringify({ name: '测试学员', institution: '中大医院' }))
    localStorage.setItem('training-session', JSON.stringify({
      mdt: {
        mdtId: D,
        caseId: D,
        flowVersion: 1,
        phase: 'discussion',
        currentStage: 0,
        agendaIndex: 3,
        currentSpeakerKey: 'host',
        pendingTask: null,
        messages: [
          { type: 'expert', speaker: 'host', text: '欢迎参加 MDT（旧流程存档）' },
          { type: 'task', taskKey: 'diag01' },
        ],
        tasks: {}, submitted: {}, skipped: {}, markers: [],
        decisionRevealed: false,
        preMeeting: { applied: false, applicationText: null, invitedDepts: [], approved: null, feedback: '' },
      },
    }))
  }, { D })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/mdt-discussion/${D}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // 旧会话进入 → stale → restartFlowForNewVersion：清空旧消息、重播新流程
  await expect(page, '直接进入讨论区（重播）', () => page.$('.steps-bar'))
  const bodyD = await page.evaluate(() => document.body.innerText)
  check('旧流程消息已清空（不含「旧流程存档」）', !bodyD.includes('旧流程存档'))
  await expect(page, '重播出现「查看原始病历」卡', () => page.$('.case-raw-card'))
  await expect(page, '重播出现完整病例汇报（主诉）', async () => {
    const t = (await expertTexts(page)).join('\n')
    return t.includes('主诉') ? '✓' : null
  })
  check('重播未出现 diag01「初步诊断印象」任务卡', !(await cardTitles(page)).some(t => t.includes('初步诊断印象')))

  await ctx.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  try {
    await runCaseA(browser)
    await runCaseB(browser)
    await runCaseC(browser)
    await runCaseD(browser)
  } finally {
    await browser.close()
  }
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} 项断言，${failed.length} 项失败`)
  console.log(failed.length === 0 ? '全部通过 ✓' : '存在失败 ✗')
  process.exit(failed.length ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
