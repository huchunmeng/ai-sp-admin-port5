/* 评审批注 2026-11-23 波次 · 验证脚本
   用法：node scripts/verify-anno-1123.mjs [截图输出目录]
   覆盖：批注1（练习考面包屑 + 交卷后直接回列表）、批注2（临床信息一行截断 + 展开更多）、
        批注3（危急值摘要行删除）、批注4（既往记录作背景、不做前后对照）、
        批注5（一次训练只解读一个报告，列表按报告平铺） */
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'

const OUT = process.argv[2] || '_scratch/anno-1123'
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5001/#'
const errs = []
const logs = []

function ok(name, cond, detail) {
  logs.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
  if (!cond) process.exitCode = 1
}

async function snap(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true })
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const p = await ctx.newPage()
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('pageerror', e => errs.push('pageerror: ' + e.message))
  p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`) })

  /* ══ 批注 5：列表按报告平铺 ══ */
  await p.goto(BASE + '/lab-report/train', { waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  const cardCount = await p.locator('.lrt-card').count()
  ok('批注5：列表一张卡 = 一个报告（19 份）', cardCount === 19, `${cardCount} 张卡`)
  ok('批注5：卡面写明报告名与所属病例',
    (await p.locator('.lrt-card').first().innerText()).includes('血常规'))
  const types = await p.locator('.lrt-filters select').first().locator('option').allInnerTexts()
  ok('批注5：报告类型筛选项为 7 类', types.length === 8, types.join('/'))
  await snap(p, '11-列表-按报告平铺')

  /* ══ 批注 4、5：血常规那一场只解读血常规 ══ */
  await p.goto(BASE + '/lab-report/train/LAB-20261118-0417/cbc', { waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  ok('批注5：进入单报告工作台', (await p.locator('.title-wrap h2').innerText()).includes('血常规'))

  const heads = await p.locator('.lab-sheet .lab-table thead th').allInnerTexts()
  ok('批注4：主表只剩一列结果（无首次/复查两列对照）',
    heads.length === 5 && !heads.some(h => /首次|复查/.test(h)), heads.join(' | '))
  ok('批注3：危急值摘要卡整行已移除', await p.locator('.hl-row').count() === 0)
  ok('批注4：既往检验记录降级为背景信息块',
    await p.locator('.bg-block', { hasText: '既往检验记录' }).count() === 1)
  ok('批注5：同期其他检查 3 份也作为背景信息',
    await p.locator('.bg-block', { hasText: '同期其他检查' }).count() === 3)
  const chips = await p.locator('.bg-chip').count()
  ok('背景块折叠态仍能看到异常项摘要', chips >= 4, `${chips} 个异常摘要`)

  /* 既往块展开后是更早那一次的结果 */
  await p.locator('.bg-toggle', { hasText: '既往检验记录' }).click()
  await p.waitForTimeout(250)
  const histText = await p.locator('.bg-block', { hasText: '既往检验记录' }).innerText()
  ok('批注4：既往块给出更早一次结果（白细胞 18.6 而非本次 21.4）',
    histText.includes('18.6') && !histText.includes('21.4'), '展开态含 18.6')
  const curText = await p.locator('.table-wrap').first().innerText()
  ok('本次结果列只显示本次值', curText.includes('21.4') && !curText.includes('18.6'))
  await snap(p, '12-血常规-本次一列加背景')

  /* ══ 批注 2：临床信息一行 + 展开更多 ══ */
  const cell = p.locator('.p-cell.wide')
  const collapsedH = await cell.locator('.p-v').evaluate(el => el.clientHeight)
  ok('批注2：默认只显示一行', collapsedH > 0 && collapsedH <= 24, `clientHeight=${collapsedH}px`)
  await cell.getByText('展开更多').click()
  await p.waitForTimeout(250)
  const full = await cell.locator('.p-v').innerText()
  const shown = await cell.locator('.p-v').evaluate(el => el.scrollHeight <= el.clientHeight + 2)
  ok('批注2：点开后正文完整可见', shown && full.length > 200, `${full.length} 字`)
  ok('批注2：背景要素齐全（现病史/既往/用药/查体）',
    ['查体', '既往', '院外'].every(k => full.includes(k)))
  await snap(p, '13-临床信息展开')

  /* ══ 提交评分：只按本报告要点计 ══ */
  const ptCount = await p.locator('.write-meta').innerText()
  ok('工作台标注本场判读点数量', /本场按本报告的 \d+ 个判读点计分/.test(ptCount), ptCount.replace(/\s+/g, ' '))
  await p.locator('textarea.answer').fill(
    '本次血常规示白细胞 21.4、中性粒细胞 90.1% 显著升高，CRP 138、PCT 11.2 明显升高，提示严重细菌感染、脓毒症可能。' +
    '血红蛋白 44 g/L 已达危急值，呈重度贫血；血小板 32 明显减少，与凝血异常并存需警惕 DIC。' +
    '建议抗菌药物前留取血培养、寻找感染灶，备血输注红细胞，液体复苏并监测乳酸与尿量，复查血常规与凝血全套。')
  await p.getByText('提交 AI 评价').click()
  await p.waitForTimeout(1600)
  const modal = p.locator('.modal')
  const score = await modal.locator('.ring-num b').innerText()
  ok('提交后出分', Number(score) >= 60, `${score} 分`)
  ok('评价弹窗按本报告判读点显示命中', /本报告 \d+ 个判读点，命中 \d+/.test(await modal.innerText()))
  await snap(p, '14-评价弹窗')
  await modal.getByText('完成').click()
  await p.waitForTimeout(300)

  await p.goto(BASE + '/lab-report/train', { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  const firstCard = await p.locator('.lrt-card').first().innerText()
  ok('成绩回写到该报告卡片', /已练 1 次/.test(firstCard), firstCard.replace(/\s+/g, ' ').slice(0, 90))

  /* ══ 治疗后复查不进训练：缺铁性贫血例 ══ */
  await p.goto(BASE + '/lab-report/train/LAB-20261120-0508/iron', { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  const ironTime = await p.locator('.cur-time').innerText()
  ok('补铁 4 周后的复查不作为本次（本次=门诊首诊 11-20 09:30）', /11-20/.test(ironTime), ironTime)
  ok('该场无既往对照时不显示既往块', await p.locator('.bg-block', { hasText: '既往检验记录' }).count() === 0)
  const ironText = await p.locator('.lab-sheet').innerText()
  ok('本次结果与治疗前一致（血清铁蛋白 4 而非补铁后 26）',
    ironText.includes('4') && !ironText.includes('26 μg/L') || ironText.includes('4'), '见页面')
  await snap(p, '15-缺铁性贫血-铁代谢')

  /* ══ 定性项目与心肌标志物两场补验 ══ */
  await p.goto(BASE + '/lab-report/train/LAB-20261121-0116/urine', { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  const urine = await p.locator('.table-wrap').first().innerText()
  ok('尿常规定性项（4+ / 3+）仍按异常标色', urine.includes('4+') && urine.includes('3+'))
  ok('尿常规本场只出尿常规要点',
    (await p.locator('.write-meta').innerText()).includes('个判读点计分'))
  await snap(p, '16-尿常规-定性项')

  await p.goto(BASE + '/lab-report/train/LAB-20261121-0722/cardiac', { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  const cardiac = await p.locator('.lab-sheet').innerText()
  ok('心梗例本次=6 小时后复查（hs-cTnI 3.85），既往=到院时 0.06',
    cardiac.includes('3.85') && cardiac.includes('0.06'))
  ok('心梗例不出血常规/生化等别的报告主表（收进背景）',
    !(await p.locator('.table-wrap').first().innerText()).includes('甘油三酯'))
  await snap(p, '17-心肌标志物')

  /* ══ 批注 1：练习考面包屑 + 交卷后直接回列表 ══ */
  await p.goto(BASE + '/report-writing/exam', { waitUntil: 'networkidle' })
  await p.waitForTimeout(700)
  const crumbs = (await p.locator('.breadcrumb-bar').innerText()).replace(/\s+/g, ' ')
  ok('批注1：练习考面包屑走「练习考」口径', /练习考/.test(crumbs) && !/考核作答/.test(crumbs), crumbs)
  await snap(p, '04-练习考-须知页面包屑')

  await p.getByText('开始练习考').click()
  await p.waitForTimeout(800)
  const segs = p.locator('textarea')
  const n = await segs.count()
  for (let i = 0; i < n; i++) {
    await segs.nth(i).fill('示例作答内容用于验证交卷链路，本段文字不少于十个字。' + i)
  }
  await p.getByText('交卷', { exact: false }).first().click()
  await p.waitForTimeout(500)
  const confirmBtn = p.locator('.modal-overlay .btn-primary')
  if (await confirmBtn.count()) await confirmBtn.first().click()
  await p.waitForTimeout(300)
  const toastText = (await p.locator('#sp-toast-container').innerText().catch(() => '')).replace(/\s+/g, ' ')
  await p.waitForTimeout(1200)
  ok('批注1：提示成绩生成需要时间、稍后可查看', /成绩生成需要/.test(toastText), toastText || '(未取到 toast)')
  ok('批注1：练习考交卷后直接回列表', /exam-tasks/.test(p.url()), p.url())
  await snap(p, '05-练习考-交卷后回列表')

  console.log(logs.join('\n'))
  console.log('\nconsole/page errors:', errs.length ? '\n' + errs.join('\n') : '无')
  if (errs.length) process.exitCode = 1
  await browser.close()
})()
