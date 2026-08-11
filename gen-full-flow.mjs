// ═══════════════════════════════════════════════════════════════
// 生成脚本③：组装 IM-20260801-PCH 标准全流程训练并结算
// 1. 读 SP 真实对话（data/gen/historyTaking.json + physicalExam.json）
// 2. 构造辅助检查/诊断/治疗计划/病历书写（基于病例真实数据）
// 3. session-save → 6 条 records（共享 sessionEpoch）→ settle（full-flow）
// 4. 验证 enriched-records + report 可被找到
// ═══════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const API = 'http://localhost:5100/api/training'
const API_RECORDS = 'http://localhost:5100/api/training-records'
const CASE_ID = 'IM-20260801-PCH'
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'))

// 原生 http POST：socket timeout 可配到分钟级（fetch/undici 的 headersTimeout 硬限制 60s 会误杀长请求）
function httpPost(url, body, timeoutMs = 900000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const data = JSON.stringify(body)
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: timeoutMs,
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`${u.pathname} ${res.statusCode}: ${txt.slice(0, 400)}`))
        }
        try { resolve(JSON.parse(txt)) } catch (e) { reject(new Error('JSON parse failed: ' + e.message)) }
      })
    })
    req.on('timeout', () => req.destroy(new Error(`timeout after ${timeoutMs}ms`)))
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function post(url, body, timeoutMs = 900000) {
  return httpPost(url.startsWith('http') ? url : API + url, body, timeoutMs)
}

async function get(url) {
  const resp = await fetch(url.startsWith('http') ? url : API + url)
  const txt = await resp.text()
  if (!resp.ok) throw new Error(`${url} ${resp.status}: ${txt.slice(0, 300)}`)
  return JSON.parse(txt)
}

function buildCaseInfo() {
  const basic = readJson('apps/admin/public/data/cases/IM-20260801-PCH-basic.json')
  const pi = basic.patient_info || {}
  return {
    case_id: CASE_ID,
    id: CASE_ID,
    title: basic.title || basic.disease || '',
    disease: basic.disease || '',
    specialty: basic.specialty || '',
    training_phase: basic.training_phase || '',
    difficulty: basic.difficulty || '',
    chief_complaint: basic.chief_complaint || '',
    full_text: [basic.chief_complaint, basic.present_illness, basic.past_history, basic.personal_history, basic.family_history, JSON.stringify(basic.physical_exam || {})].filter(Boolean).join('\n'),
    present_illness: basic.present_illness || '',
    past_history: basic.past_history || '',
    personal_history: basic.personal_history || '',
    family_history: basic.family_history || '',
    diagnosis: basic.diagnosis || {},
    symptoms: basic.symptoms || [],
    patient_info: { name: pi.name || '', age: pi.age || '', sex: pi.sex || pi.gender || '' },
  }
}

function buildDiagnosis() {
  const basic = readJson('apps/admin/public/data/cases/IM-20260801-PCH-basic.json')
  const d = basic.diagnosis || {}
  const diffs = Array.isArray(d.differential) ? d.differential : [d.differential].filter(Boolean)
  const evidenceMap = {
    '乙型肝炎肝硬化失代偿': '患者有乙肝肝硬化基础（肝脏硬度12.3kPa），但无腹水、上消化道出血、肝性脑病等失代偿表现，Child-Pugh分级A级，可排除失代偿肝硬化。',
    '转移性肝癌': '全腹部及胸部影像未见肺、胃肠道等原发肿瘤证据，肿瘤标志物以外异常凝血酶原显著升高为主，AFP无明显升高，不支持转移性肝癌。',
    '肝脓肿': '无发热、寒战、白细胞升高等感染征象，影像学示肝右叶占位伴门静脉癌栓形成，符合肝癌特征而非脓肿。',
  }
  return {
    preliminary: d.preliminary || '',
    differential: diffs.join('、'),
    differentialDetails: diffs.map(name => ({ name, evidence: evidenceMap[name] || '' })),
    basis: Array.isArray(d.basis) ? d.basis.join('\n') : (d.basis || ''),
    notes: '',
    duration: 600,
  }
}

function buildAncillaryText(results) {
  const list = results.map(r => `【${r.categoryLabel || r.category || ''}】${r.name}：${r.result}`).join('\n')
  return `【检查项目选择】
1. 上腹部增强MRI：患者肝硬化基础上新发咳嗽、乏力、腹胀，需明确肝内占位性质及门静脉情况，排除肝癌及门静脉癌栓。
2. 异常凝血酶原（DCP）与甲胎蛋白（AFP）：肝细胞癌特异性肿瘤标志物，用于筛查与鉴别肝占位性质。
3. 乙肝两对半 + HBV-DNA：评估病毒复制状态与抗病毒疗效。
4. 血常规、肝肾功能、凝血功能：评估肝功能储备（Child-Pugh分级）与出血风险，为介入/靶向治疗做安全性评估。
5. 胸部CT：明确咳嗽病因，排除肺部转移或感染。
6. 心电图、超声心动图：排除胸闷的心源性原因。
7. 胃镜：评估食管胃底静脉曲张，预判门脉高压出血风险。
8. 甲胎蛋白异质体与高尔基体蛋白73：进一步鉴别良恶性肝占位。

【检查结果解读】
1. 上腹部增强MRI示肝右叶占位伴门静脉主干及右支充盈缺损，考虑肝细胞癌伴门静脉癌栓形成——符合肝癌CNLC IIIa期特征，咳嗽症状与肝病本身关系不大，需警惕肺转移可能。
2. 异常凝血酶原20087.51mAu/mL显著升高（正常<40），为肝细胞癌强有力证据。
3. 乙肝表面抗原阳性、HBV-DNA阳性：病毒复制活跃，抗病毒治疗需继续并动态监测。
4. 血小板减少、胆汁淤积酶升高：提示肝硬化门静脉高压、肝功能受损。

【对诊疗的指导】
确诊肝细胞癌CNLC IIIa期伴门静脉癌栓后，治疗策略从单纯抗病毒转为系统性综合治疗：需行MDT多学科会诊，评估系统治疗（免疫+靶向）联合局部治疗（TACE/放疗/门静脉支架）方案，同时监测肝功能与出血风险。

【检查结果明细】
${list}`
}

function buildTreatmentPlan() {
  const basic = readJson('apps/admin/public/data/cases/IM-20260801-PCH-basic.json')
  return `【治疗原则】
患者明确为肝恶性肿瘤CNLC IIIa期伴门静脉癌栓（PVTT，门静脉主干及右支），属中晚期肝癌，首选治疗为系统治疗联合局部治疗，而非单纯抗病毒或保肝治疗。治疗决策遵循CNLC分期指南：IIIa期伴主干型PVTT不适于单纯手术切除，应以系统性综合治疗为核心。门静脉癌栓是独立高危预后因素，需在治疗中针对性干预（门静脉支架、放疗），并同步防控门脉高压出血风险。

【治疗目标】
①近期目标（2周内）：完成MDT多学科会诊，明确综合治疗方案，控制咳嗽、乏力、腹胀等症状；
②中期目标（1-3个月）：启动一线系统治疗（信迪利单抗+贝伐珠单抗），使HBV-DNA降至<20 IU/mL，复查增强MRI评估PVTT与肝内病灶变化；
③远期目标：控制肿瘤进展，延长无进展生存期与总生存期，改善生活质量。

【具体治疗措施】
1. 系统治疗：信迪利单抗注射液200mg静脉滴注（每3周1次）联合贝伐珠单抗注射液600mg静脉滴注（每3周1次）。用药前评估禁忌证：活动性自身免疫病、未控高血压、出血倾向、近期手术史。治疗期间监测免疫相关不良反应（皮疹、甲状腺功能、肝功能、血常规）。
2. 局部治疗：针对门静脉主干癌栓行门静脉支架置入术+放射性粒子植入（放疗剂量45-50Gy/25次），同步行肝动脉造影+经导管肝动脉栓塞化疗（TACE）控制肝内病灶。
3. 抗病毒治疗：继续恩替卡韦0.5mg每日一次口服，每3个月复查HBV-DNA，若>20 IU/mL或发生耐药，则换用替诺福韦艾拉酚胺（TAF）25mg每日一次。
4. 支持治疗：还原型谷胱甘肽护肝、质子泵抑制剂护胃、肠内营养支持；因肝脏硬度12.3kPa提示显著纤维化，加用螺内酯+呋塞米预防腹水，并行胃镜筛查食管胃底静脉曲张。

【用药合理性】
患者既往血压偏高（154/89mmHg）未规律用药，使用贝伐珠单抗前需将血压控制达标并规律监测；有青霉素过敏史需在病历中明确标注；无自身免疫性疾病史；用药期间密切监测肝肾功能、凝血功能、血常规与血压。

【并发症预防与处理】
1. 门脉高压相关：预防食管胃底静脉曲张破裂出血，必要时内镜套扎或硬化治疗；2. 肝功能恶化：定期复查Child-Pugh分级，肝功能恶化时调整靶向/免疫药物剂量；3. 免疫相关不良反应：皮疹、转氨酶升高、甲状腺功能异常，按分级处理，必要时激素；4. 介入术后：注意穿刺点出血、造影剂肾病，充分水化并监测肾功能。

【健康宣教与随访】
告知患者肝癌综合治疗策略、药物不良反应及注意事项；饮食清淡、保证营养、避免劳累；心理疏导与家属支持；随访计划：每1-3个月复查血常规、肝肾功能、HBV-DNA、肿瘤指标（AFP、异常凝血酶原）及增强影像学，建立随访档案并预约复诊。

【病历中治疗计划摘要】
${basic.treatment_plan || ''}`
}

function buildMedicalRecord() {
  const basic = readJson('apps/admin/public/data/cases/IM-20260801-PCH-basic.json')
  const pi = basic.patient_info || {}
  const pe = basic.physical_exam || {}
  const adm = basic.admission_info || {}
  return [
    '入院记录',
    '',
    `姓名：${pi.name || '蒲志辉'}    性别：男    年龄：${pi.age || '54岁'}`,
    `民族：汉族      婚姻：${pi.marital || '已婚'}  职业：${pi.occupation || '工人'}`,
    `出生地：${pi.address || '安徽省天长市'}`,
    `入院时间：${adm.admission_time || ''}    入院科室：${adm.admission_department || ''}`,
    '',
    `主诉：${basic.chief_complaint || ''}`,
    '',
    `现病史：${basic.present_illness || ''}`,
    '',
    `既往史：${basic.past_history || ''}`,
    '',
    `个人史：${basic.personal_history || ''}`,
    `家族史：${basic.family_history || ''}`,
    '',
    `体格检查：T 36.5℃，P 88次/分，R 20次/分，BP 121/81mmHg。发育正常，体型正力型，营养中等，意识清晰，慢性病容。巩膜无黄染，未见肝掌及蜘蛛痣。腹部平软，全腹无压痛反跳痛，肝脾肋下未触及，移动性浊音阴性。双肺呼吸音清，未闻及干湿啰音。心率88次/分，律齐，各瓣膜听诊区未闻及病理性杂音。双下肢无水肿。`,
    '',
    `辅助检查：异常凝血酶原20087.51mAu/mL↑，乙肝表面抗原阳性，HBV-DNA阳性；上腹部增强MRI示肝右叶占位伴门静脉癌栓形成。`,
    '',
    `初步诊断：肝恶性肿瘤CNLC IIIa期伴门静脉癌栓`,
    `鉴别诊断：乙型肝炎肝硬化失代偿、转移性肝癌、肝脓肿`,
    '',
    '医师签名：__________',
  ].join('\n')
}

async function main() {
  const basic = readJson('apps/admin/public/data/cases/IM-20260801-PCH-basic.json')
  const historyTaking = readJson('data/gen/historyTaking.json')
  const physicalExam = readJson('data/gen/physicalExam.json')

  // ── 辅助检查：复用上次真实会话中由 LLM 生成的 10 条检查结果 ──
  const oldSession = readJson('data/training-sessions/IM-20260801-PCH/1786321327437.json')
  const ancResults = oldSession.sessionData.ancillaryTests?.results || []
  const ancillaryTests = {
    results: ancResults,
    submittedAt: new Date().toLocaleString('zh-CN'),
    duration: 600,
  }

  const diagnosis = buildDiagnosis()
  const treatmentPlan = { content: buildTreatmentPlan(), notes: '', duration: 600 }
  const medicalRecord = { content: buildMedicalRecord(), notes: '', duration: 900 }

  // ── 组装 sessionData（训练会话实时落盘）──
  const sessionData = {
    historyTaking,
    physicalExam,
    ancillaryTests,
    diagnosis,
    treatmentPlan,
    medicalRecord,
  }

  const se = Date.now().toString()
  const recordedAt = new Date().toISOString()
  const time = new Date().toLocaleString('zh-CN')

  console.log('sessionEpoch:', se)
  console.log('historyTaking 消息数:', historyTaking.messages.length)
  console.log('physicalExam 消息数:', physicalExam.messages.length)
  console.log('ancillaryTests 结果数:', ancResults.length)

  // ── 1. 保存训练会话 ──
  console.log('\n▶ session-save ...')
  await post('/session-save', { caseId: CASE_ID, sessionData, sessionEpoch: se })
  console.log('  ✓ 已保存')

  // ── 2. 创建 6 条训练记录（共享 sessionEpoch）──
  const stations = [
    { id: 'historyTaking', name: '接诊病人站', dur: 900, rec: { dialog: historyTaking.messages, exam: [], qa: [], freeText: [] } },
    { id: 'physicalExam', name: '体格检查站', dur: 600, rec: { dialog: [], exam: physicalExam.messages, qa: [], freeText: [] } },
    { id: 'ancillaryTests', name: '辅助检查', dur: 600, rec: { dialog: [], exam: [], qa: [], freeText: [{ label: 'ancillaryTests', content: buildAncillaryText(ancResults) }] } },
    { id: 'diagnosis', name: '诊断', dur: 600, rec: { dialog: [], exam: [], qa: [], freeText: [{ label: 'diagnosis', content: JSON.stringify(diagnosis, null, 1) }] } },
    { id: 'treatmentPlan', name: '治疗计划站', dur: 600, rec: { dialog: [], exam: [], qa: [], freeText: [{ label: 'treatmentPlan', content: treatmentPlan.content }] } },
    { id: 'medicalRecord', name: '病历书写站', dur: 900, rec: { dialog: [], exam: [], qa: [], freeText: [{ label: 'medicalRecord', content: medicalRecord.content }] } },
  ]

  console.log('\n▶ 创建训练记录 ...')
  const recordsBody = {}
  const sessionKeyMap = {
    historyTaking: 'historyTaking', physicalExam: 'physicalExam', ancillaryTests: 'ancillaryTests',
    diagnosis: 'diagnosis', treatmentPlan: 'treatmentPlan', medicalRecord: 'medicalRecord',
  }
  for (const st of stations) {
    const key = `${CASE_ID}_${st.id}_${Date.now()}`
    recordsBody[key] = {
      caseId: CASE_ID,
      stationId: st.id,
      stationName: st.name,
      duration: st.dur,
      score: 0,
      time,
      ts: Date.now(),
      recordedAt,
      sessionEpoch: se,
      trainingVersion: 'full-flow',
      rawData: sessionData[sessionKeyMap[st.id]],
    }
    console.log('  ✓', st.id, '→', key)
  }
  await post(API_RECORDS, recordsBody)
  console.log('  ✓ 6 条记录已写入服务端')

  // ── 3. settle 结算（一次性传全部站；评分并行、profile 串行，约 8-12 分钟）──
  console.log('\n▶ settle（full-flow 六站，预计 8-12 分钟，请耐心等待）...')
  const t0 = Date.now()
  const settleResp = await post('/settle', {
    caseId: CASE_ID,
    caseInfo: buildCaseInfo(),
    stations: stations.map(st => ({
      stationId: st.id,
      stationName: st.name,
      hasData: true,
      parsedSheet: [],
      projects: [st.id],
      records: st.rec,
    })),
    sessionEpoch: se,
    trainingMode: 'full-flow',
  })
  const report = settleResp.data
  console.log(`  ✓ settle 完成 (${Math.round((Date.now() - t0) / 100) / 10}s)`)
  console.log('  totalScore:', report.totalScore, '/', report.totalMax, '| passFail:', report.passFail)
  for (const s of report.stations) {
    console.log(`    ${s.stationId.padEnd(16)} ${String(s.score).padStart(5)}/${s.maxScore}  scored=${s.scored}`)
  }

  // ── 4. 验证 enriched-records 与 report ──
  console.log('\n▶ 验证 enriched-records ...')
  const enriched = await get('/enriched-records')
  const mine = enriched.data.filter(r => r.caseId === CASE_ID && r.sessionEpoch === se)
  for (const r of mine) {
    console.log(`  ${r.stationId.padEnd(16)} score=${r.score} hasReport=${r.hasReport} label=${r.stationLabel}`)
  }

  console.log('\n▶ 验证 report 可被读取 ...')
  for (const st of stations) {
    try {
      const rep = await get(`/report?caseId=${CASE_ID}&stationType=${st.id}&sessionEpoch=${se}`)
      const sc = rep.data?.scoring
      console.log(`  ✓ ${st.id} 报告读取成功 score=${sc?.total_score}/${sc?.total_max}`)
    } catch (e) {
      console.log(`  ✗ ${st.id} 报告读取失败: ${e.message.slice(0, 80)}`)
    }
  }

  console.log('\n════ 全部完成 ════')
  console.log('sessionEpoch:', se)
  fs.writeFileSync('data/gen/sessionEpoch.txt', se, 'utf8')
}

main().catch(e => {
  console.error('\n[FATAL]', e)
  process.exit(1)
})
