// MDT 训练流程冒烟测试（flowVersion 3）
// 覆盖：A=1PY2 完整 v3 流程（会诊前发起页→病例汇报含摘要/住院经过→case-raw 事件线→专科依次发言→主诊医师意见输入框→自由讨论→拍板 plan01→确认最终方案→各专科评判→MDT 决策卡→反思→结束）；
//       B=BRFH 补齐后 3 学科也走会诊前→case-raw 全文回退抽屉；C=旧会话（flowVersion=1 已通过会诊前）重播新流程。
// 全程不得出现「初步诊断印象」任务卡（diag01 已移除）与「影像解读」阶段（v3 已移除）。
// 用法: node scripts/test-mdt-flow.mjs [--fast]
import { chromium } from 'playwright'

const BASE = 'http://localhost:5001'
const A = 'MDT-20260806-1PY2'     // 主动脉夹层：4 学科 + 结构化 records 事件线 + 完整会诊前配置
const B = 'MDT-20260804-BRFH'     // 面神经炎：补齐后 3 学科（走会诊前）+ 源无 records（全文回退）

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

async function expect(page, name, fn, { timeout = 90000, desc = '' } = {}) {
  try {
    const v = await waitFor(page, fn, { timeout, desc: name })
    check(name, true, typeof v === 'string' ? v : '')
  } catch (e) {
    check(name, false, e.message)
  }
}

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

// 会诊前发起页通用流程：跳转→预填≥2科室→提交申请→资料包→确认进入
async function runPreMeeting(page, { tag = '' } = {}) {
  await expect(page, `${tag}跳转到会诊前发起页（URL 含 mdt-premeeting）`, async () =>
    page.url().includes('mdt-premeeting') ? '✓' : null)
  await expect(page, `${tag}发起页展示会诊前情境`, () => page.$('.pm-context-text'))
  await expect(page, `${tag}发起页含申请表（拟邀请科室）`, () => page.$('.pm-dept-option'))
  const selectedDepts = await page.$$('.pm-dept-option.selected').then(l => l.length)
  check(`${tag}申请表预填邀请科室 ≥ 2`, selectedDepts >= 2, `选中 ${selectedDepts} 个`)
  check(`${tag}发起页为独立页面（非讨论页弹窗）`, page.url().includes('mdt-premeeting') && !page.url().includes('mdt-discussion'))
  await page.click('.pm-footer .btn-primary')   // 提交申请
  await expect(page, `${tag}审批通过 → 切到资料包步骤`, () => page.$('.pm-material-item'))
  await expect(page, `${tag}审批通过提示出现`, () => page.$('.pm-approved-msg'))
  await page.click('.pm-footer .btn-primary')   // 确认进入会诊
}

// 各专科评判环节：逐位专家评判后暂停等继续，循环点继续直到 MDT 决策卡出现
async function clickContinueUntil(page, predicate, { timeout = 180000, desc = '' } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try { if (await predicate()) return true } catch {}
    const cont = await page.$('.btn-continue')
    if (cont) {
      const disabled = await cont.evaluate(el => el.disabled).catch(() => true)
      if (!disabled) await cont.click().catch(() => {})
    }
    await page.waitForTimeout(600)
  }
  return false
}

// ── 用例 A：1PY2 完整 v3 流程（会诊前 + 病例汇报 + 专科 + 主诊 + 拍板 + 评判 + 决策 + 反思）──
async function runCaseA(browser) {
  console.log(`\n═══ 用例 A：${A}（完整 v3 流程）═══`)
  const { ctx, page } = await newPage(browser)
  await page.goto(`${BASE}/#/mdt-discussion/${A}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
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

  // 2. 开始讨论 → 会诊前发起页 → 审批 → 资料包 → 确认进入
  await page.click('.prep-start')
  await runPreMeeting(page, { tag: 'A.' })

  // 3. 进入讨论 → 阶段条（v3 六阶段，无影像解读）
  await expect(page, '确认进入会诊 → 讨论区阶段条', () => page.$('.steps-bar'))
  const labels = await stepLabels(page)
  check('阶段条 = 病例汇报→专科意见→主诊医师意见→自由讨论→拍板决策→反思', labels.length === 6 && !labels.includes('影像解读'), labels.join('→'))

  // 4. 病例汇报含【病情摘要】与【住院经过】
  await expect(page, '病例汇报含【病情摘要】与【住院经过】', async () => {
    const t = (await expertTexts(page)).join('\n')
    return t.includes('病情摘要') && t.includes('住院经过') ? '✓' : null
  }, { desc: '汇报文本' })

  // 5. case-raw 卡 + 原始病历事件线（1PY2 绑定结构化 records）
  await expect(page, '出现「查看原始病历」卡', () => page.$('.case-raw-card'))
  await page.click('.case-raw-card .btn-primary')
  await expect(page, '原始病历抽屉打开', () => page.$('.raw-drawer'))
  await expect(page, '事件线渲染多条记录（.raw-item）', async () => {
    const n = await page.$$('.raw-item').then(l => l.length)
    return n >= 2 ? `${n} 条` : null
  })
  const types = await page.$$eval('.raw-item-type', els => els.map(e => e.textContent.trim()))
  check('记录带类型标签（如 入院记录/病程记录）', types.length > 0 && types.every(t => t && t.length > 0), types.slice(0, 4).join(' / '))
  await page.click('.raw-drawer .modal-close')
  check('抽屉可关闭', !(await page.$('.raw-drawer')))

  // 6. 专科意见：急诊科/胸心血管外科/介入科/呼吸与危重症医学科 依次发言（每位后点继续，Learner-paced 暂停）
  for (const dept of ['急诊科', '胸心血管外科', '介入科', '呼吸与危重症医学科']) {
    await expect(page, `专科发言：${dept}`, async () => (await senderTexts(page)).includes(dept) ? dept : null)
    await expect(page, `${dept} 播完 → 继续按钮可用`, async () => {
      const d = await page.$eval('.btn-continue', el => el.disabled).catch(() => true)
      return d ? null : '✓'
    }, { timeout: 120000, desc: `${dept} 播完` })
    await page.click('.btn-continue')
  }

  // 7. 主诊医师意见：输入框直接输入（无任务卡弹窗）
  await expect(page, '主诊医师意见 → 输入框可输入', async () => {
    const inp = await page.$('.chat-input')
    if (!inp) return null
    const disabled = await inp.evaluate(el => el.disabled).catch(() => true)
    const ph = await inp.evaluate(el => el.placeholder).catch(() => '')
    if (disabled) return null
    return ph.includes('主诊') ? '✓' : null
  }, { timeout: 120000, desc: 'attendingView01' })
  await page.fill('.chat-input', '综合各专科意见，考虑主动脉夹层 Stanford B 型诊断明确，倾向先药物降压稳定 + 择期 TEVAR 腔内修复，围术期关注低氧血症与胸腔积液。')
  await page.press('.chat-input', 'Enter')
  await expect(page, '主诊意见提交后进入自由讨论（主持人播报）', async () => {
    const t = (await expertTexts(page)).join('\n')
    return t.includes('现在进入自由讨论环节') ? '✓' : null
  }, { timeout: 120000, desc: '自由讨论' })

  // 8. 拍板决策：plan01 → 确认最终方案 → 各专科评判 → MDT 决策卡
  await expect(page, '拍板 → 出现任务卡「主诊医师最终决策」', async () => {
    const t = await cardTitles(page)
    return t.includes('主诊医师最终决策') ? '✓' : null
  }, { timeout: 150000, desc: 'plan01' })
  await fillAndSubmitTask(page, '主诊医师最终决策', '1. 诊断：主动脉夹层 Stanford B 型（伴假腔内血栓、双侧胸腔积液、吸入性肺炎/ARDS 中度）\n2. 方案：先药物降压镇痛稳定病情，完善术前评估后择期行 TEVAR 腔内修复；围术期氧疗纠正低氧，处理胸腔积液\n3. 依据：CTA 明确 B 型夹层，急性期先控制血压心率，TEVAR 为一线腔内治疗')
  await expect(page, '提交后弹「确认最终方案」', async () => {
    const h3 = await page.$eval('.modal-header h3', el => el.textContent.trim()).catch(() => '')
    return h3.includes('确认最终方案') ? h3 : null
  })
  await page.click('.confirm-plan-footer .btn-primary')
  check('各专科评判后出现 MDT 最终决策卡', await clickContinueUntil(page, () => page.$('.mdt-decision-card'), { desc: 'MDT 决策卡' }))
  check('随访计划卡出现', !!(await page.$('.followup-card-flow')))
  // 决策卡展示后点继续进入反思（评判通过→放行继续→playAgenda 播报反思入口）
  await page.click('.btn-continue')
  check('全程未出现「影像解读」阶段', !(await stepLabels(page)).includes('影像解读'))
  check('拍板后未出现 diag01「初步诊断印象」任务卡', !(await cardTitles(page)).some(t => t.includes('初步诊断印象')))

  // 9. 反思收尾 → 结束
  await expect(page, '反思 → 出现任务卡「反思总结」', async () => {
    const t = await cardTitles(page)
    return t.includes('反思总结') ? '✓' : null
  }, { timeout: 150000, desc: 'reflect01' })
  await fillAndSubmitTask(page, '反思总结', '本次讨论让我认识到主动脉夹层 B 型急性期内科稳定与介入时机权衡的重要性，尤其围术期低氧血症的处理值得深入学习。')
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

// ── 用例 B：BRFH（补齐后 3 学科走会诊前 + case-raw 全文回退抽屉）──
async function runCaseB(browser) {
  console.log(`\n═══ 用例 B：${B}（补齐后走会诊前 + case-raw 全文回退）═══`)
  const { ctx, page } = await newPage(browser)
  await page.goto(`${BASE}/#/mdt-discussion/${B}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1200)

  await expect(page, 'prep 出现', () => page.$('.prep-role-fixed'))
  await page.click('.prep-start')

  // 补齐后 BRFH 有 3 学科（神经内科/耳鼻喉科/影像科）→ 走会诊前发起页
  await runPreMeeting(page, { tag: 'B.' })
  await expect(page, '确认进入 → 讨论区阶段条', () => page.$('.steps-bar'))
  const labels = await stepLabels(page)
  check('阶段条不含「影像解读」', !labels.includes('影像解读'), labels.join('→'))

  // case-raw 卡 + 原始病历抽屉（BRFH 源无 records 结构 → 全文回退分支）
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

  // 专科意见（神经内科）
  await expect(page, '专科发言：神经内科', async () => (await senderTexts(page)).includes('神经内科') ? '神经内科' : null)
  check('全流程未出现「初步诊断印象」任务卡', !(await cardTitles(page)).some(t => t.includes('初步诊断印象')))

  await ctx.close()
}

// ── 用例 C：BRFH 旧流程会话（flowVersion=1 已通过会诊前）→ 进入自动重播新流程 ──
async function runCaseC(browser) {
  const D = 'MDT-20260804-BRFH'
  console.log(`\n═══ 用例 C：${D}（旧流程存档 flowVersion=1 → 重播新流程）═══`)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  // 注入登录身份 + 旧流程会话（v1，含 diag01 任务卡与旧消息，会诊前已通过）
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
        preMeeting: { applied: true, applicationText: { questions: '会诊问题', summary: '病情摘要' }, invitedDepts: ['神经内科', '耳鼻喉科'], approved: true, feedback: '' },
      },
    }))
  }, { D })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/mdt-discussion/${D}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)

  // 旧会话进入 → stale → restartFlowForNewVersion：已通过会诊前 → 直接重播 discussion
  await expect(page, '直接进入讨论区（重播）', () => page.$('.steps-bar'))
  const bodyC = await page.evaluate(() => document.body.innerText)
  check('旧流程消息已清空（不含「旧流程存档」）', !bodyC.includes('旧流程存档'))
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
  } finally {
    await browser.close()
  }
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} 项断言，${failed.length} 项失败`)
  console.log(failed.length === 0 ? '全部通过 ✓' : '存在失败 ✗')
  process.exit(failed.length ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
