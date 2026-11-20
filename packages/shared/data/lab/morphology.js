import { labGradeOf } from './score.js'

/**
 * 形态学与图谱判读题库（演示版）
 * 部分题目使用真实标本/图谱（见各题 imageCredit），其余为程序绘制的示意图。
 * 每题 20 分、共 5 题、总分 100；单选题，客观判分。
 */
export const MORPH_SETS = [
  {
    id: 'MORPH-HEMA-01',
    title: '血液细胞形态判读',
    level: 'R2',
    category: '血液学形态',
    tags: ['外周血涂片', '骨髓涂片', '瑞氏-吉姆萨染色'],
    desc: '依据外周血与骨髓涂片中的细胞形态，判断感染、贫血与白血病相关的典型改变。',
    questions: [
      {
        id: 'Q1',
        type: 'single',
        stem: '外周血涂片见杆状核中性粒细胞明显增多（核左移），最可能提示下列哪种情况？',
        image: '/images/lab-morph/a1-left-shift.svg',
        imageCaption: '外周血涂片 · 瑞氏-吉姆萨染色（示意图）',
        options: [
          { key: 'A', text: '急性细菌感染或应激反应' },
          { key: 'B', text: '病毒感染导致的淋巴细胞增多' },
          { key: 'C', text: '寄生虫感染导致的嗜酸性粒细胞增多' },
          { key: 'D', text: '多发性骨髓瘤导致的红细胞缗钱状排列' }
        ],
        answer: ['A'],
        explanation: '中性粒细胞核左移（杆状核、晚幼粒增多）常见于急性细菌感染、急性炎症或应激，反映骨髓粒细胞储备释放加快。'
      },
      {
        id: 'Q2',
        type: 'single',
        stem: '骨髓涂片见原始细胞明显增多（>20%），其中部分细胞胞质内可见 Auer 小体，最可能的诊断是？',
        image: '/images/lab-morph/real/auer.jpg',
        imageCaption: '骨髓涂片 · 原始细胞胞质内 Auer 小体（箭头所示）',
        imageCredit: {
          text: 'Gajendra S, Sahoo RK · PMC4563208 · Fig.1（经裁剪）',
          url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4563208/',
          license: 'CC BY 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
        },
        options: [
          { key: 'A', text: '急性髓系白血病（AML）' },
          { key: 'B', text: '急性淋巴细胞白血病（ALL）' },
          { key: 'C', text: '慢性髓系白血病慢性期' },
          { key: 'D', text: '再生障碍性贫血' }
        ],
        answer: ['A'],
        explanation: 'Auer 小体是髓系原始细胞胞质内的棒状包涵体，为髓系来源的标志性形态学证据，结合原始细胞 ≥20% 支持急性髓系白血病。'
      },
      {
        id: 'Q3',
        type: 'single',
        stem: '外周血涂片见大量靶形红细胞（中心致密、外围环形深染），最常见的临床背景是？',
        image: '/images/lab-morph/a3-target-cell.svg',
        imageCaption: '外周血涂片 · 靶形红细胞（示意图）',
        options: [
          { key: 'A', text: '缺铁性贫血' },
          { key: 'B', text: '珠蛋白生成障碍性贫血（地中海贫血）' },
          { key: 'C', text: '巨幼细胞性贫血' },
          { key: 'D', text: '遗传性球形红细胞增多症' }
        ],
        answer: ['B'],
        explanation: '靶形红细胞在珠蛋白生成障碍性贫血中最为典型，也可见于肝病、脾切除后及缺铁性贫血，但大量出现应首先考虑地中海贫血。'
      },
      {
        id: 'Q4',
        type: 'single',
        stem: '外周血涂片见较多裂红细胞（破碎红细胞、盔形细胞），应首先考虑？',
        image: '/images/lab-morph/real/schistocyte.jpg',
        imageCaption: '外周血涂片 · 裂红细胞（破碎红细胞）',
        imageCredit: {
          text: 'Ali F 等 · PMC6207490 · 原图',
          url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6207490/',
          license: 'CC BY 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
        },
        options: [
          { key: 'A', text: '微血管病性溶血（如 DIC、TTP）' },
          { key: 'B', text: '缺铁性贫血' },
          { key: 'C', text: '巨幼细胞性贫血' },
          { key: 'D', text: '真性红细胞增多症' }
        ],
        answer: ['A'],
        explanation: '裂红细胞提示红细胞在微血管内受机械性剪切破坏，是微血管病性溶血的形态学线索，需结合血小板、凝血及溶血指标排查 DIC/TTP。'
      },
      {
        id: 'Q5',
        type: 'single',
        stem: '中性粒细胞胞质内出现粗大深染颗粒，并可见蓝灰色斑块（Döhle 小体），提示？',
        image: '/images/lab-morph/real/toxic-granulation.jpg',
        imageCaption: '外周血涂片 · 中性粒细胞中毒颗粒与 Döhle 小体',
        imageCredit: {
          text: 'Sato S · PMC12620709 · Fig.1D（经裁剪）',
          url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12620709/',
          license: 'CC BY 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
        },
        options: [
          { key: 'A', text: '严重感染或应激状态' },
          { key: 'B', text: '巨幼细胞性贫血' },
          { key: 'C', text: '白血病完全缓解' },
          { key: 'D', text: '脾功能亢进' }
        ],
        answer: ['A'],
        explanation: '中毒颗粒、Döhle 小体及空泡变性统称中性粒细胞毒性改变，常见于严重感染、烧伤、重大手术后等应激状态。'
      }
    ]
  },
  {
    id: 'MORPH-MIX-01',
    title: '尿沉渣 · 微生物 · 心电图判读',
    level: 'R2',
    category: '图谱判读',
    tags: ['尿沉渣', '革兰染色', '抗酸染色', '心电图'],
    desc: '综合判读尿沉渣管型、细菌染色形态与心电图改变，覆盖感染定位、病原识别与电解质紊乱。',
    questions: [
      {
        id: 'Q1',
        type: 'single',
        stem: '尿沉渣镜检见白细胞管型，最提示的病变部位是？',
        image: '/images/lab-morph/b1-wbc-cast.svg',
        imageCaption: '尿沉渣 · 白细胞管型（示意图）',
        options: [
          { key: 'A', text: '膀胱炎（下尿路感染）' },
          { key: 'B', text: '肾盂肾炎（上尿路感染）' },
          { key: 'C', text: '肾病综合征' },
          { key: 'D', text: '肾结石' }
        ],
        answer: ['B'],
        explanation: '管型在肾小管内形成，出现白细胞管型说明白细胞来自肾实质，是上尿路感染（如肾盂肾炎）的重要证据。'
      },
      {
        id: 'Q2',
        type: 'single',
        stem: '尿沉渣见宽大、均质、有切迹的蜡样管型，最提示？',
        image: '/images/lab-morph/b2-waxy-cast.svg',
        imageCaption: '尿沉渣 · 蜡样管型（示意图）',
        options: [
          { key: 'A', text: '急性膀胱炎' },
          { key: 'B', text: '慢性肾衰竭或严重肾小管病变' },
          { key: 'C', text: '糖尿病酮症酸中毒' },
          { key: 'D', text: '单纯性血尿' }
        ],
        answer: ['B'],
        explanation: '蜡样管型由严重变性的颗粒管型演变而来，提示肾小管长期严重病变，常见于慢性肾衰竭。'
      },
      {
        id: 'Q3',
        type: 'single',
        stem: '革兰染色见革兰阳性球菌呈葡萄串状排列，最可能的病原体是？',
        image: '/images/lab-morph/real/gpc-cluster.jpg',
        imageCaption: '革兰染色 · 葡萄串状革兰阳性球菌',
        imageCredit: {
          text: 'CDC / PHIL #25652',
          url: 'https://phil.cdc.gov/Details.aspx?pid=25652',
          license: '公共领域 (Public Domain)',
          licenseUrl: 'https://www.cdc.gov/other/agencymaterials.html'
        },
        options: [
          { key: 'A', text: '金黄色葡萄球菌' },
          { key: 'B', text: '大肠埃希菌' },
          { key: 'C', text: '肺炎链球菌' },
          { key: 'D', text: '结核分枝杆菌' }
        ],
        answer: ['A'],
        explanation: '革兰阳性球菌呈葡萄串状排列是葡萄球菌属的典型形态；大肠埃希菌为革兰阴性杆菌，肺炎链球菌呈矛头状成双排列。'
      },
      {
        id: 'Q4',
        type: 'single',
        stem: '心电图示 T 波高尖呈帐篷状、基底变窄，QRS 波增宽，最可能的电解质紊乱是？',
        image: '/images/lab-morph/real/hyperkalemia-ecg.jpg',
        imageCaption: '心电图 · V2/V3 高尖 T 波（箭头所示）',
        imageCredit: {
          text: 'Gaba S 等 · PMC7500713',
          url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7500713/',
          license: 'CC BY 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
        },
        options: [
          { key: 'A', text: '低钾血症' },
          { key: 'B', text: '高钾血症' },
          { key: 'C', text: '低钙血症' },
          { key: 'D', text: '高钠血症' }
        ],
        answer: ['B'],
        explanation: '高钾血症典型心电图依次表现为 T 波高尖、P 波低平、QRS 增宽，严重时可出现正弦波，属危急值需立即处理。'
      },
      {
        id: 'Q5',
        type: 'single',
        stem: '抗酸染色见蓝色背景中散在红色细长杆菌，提示？',
        image: '/images/lab-morph/real/afb.jpg',
        imageCaption: '抗酸染色 · 蓝色背景中的红色细长抗酸杆菌',
        imageCredit: {
          text: 'CDC / PHIL #2188',
          url: 'https://phil.cdc.gov/Details.aspx?pid=2188',
          license: '公共领域 (Public Domain)',
          licenseUrl: 'https://www.cdc.gov/other/agencymaterials.html'
        },
        options: [
          { key: 'A', text: '结核分枝杆菌' },
          { key: 'B', text: '金黄色葡萄球菌' },
          { key: 'C', text: '白念珠菌' },
          { key: 'D', text: '铜绿假单胞菌' }
        ],
        answer: ['A'],
        explanation: '抗酸染色中分枝杆菌细胞壁含分枝菌酸，能抵抗酸性酒精脱色而保留红色，是结核分枝杆菌的重要染色特征。'
      }
    ]
  }
]

export function getMorphSet(id) {
  return MORPH_SETS.find(s => s.id === id) || null
}

export function morphCardOf(set, stat) {
  const s = stat || {}
  return {
    id: set.id,
    title: set.title,
    level: set.level,
    category: set.category,
    tags: set.tags,
    desc: set.desc,
    questionCount: set.questions.length,
    attempts: s.attempts || 0,
    lastScore: s.score != null ? s.score : null,
    bestScore: s.best != null ? s.best : null
  }
}

/** 客观判分：单选全对才得分，每题均分 100/题数 */
export function scoreMorphSet(set, answers) {
  const perQuestion = set.questions.map(q => {
    const picked = (answers[q.id] || []).slice().sort()
    const answer = q.answer.slice().sort()
    const correct = picked.length > 0 &&
      picked.length === answer.length &&
      picked.every((v, i) => v === answer[i])
    return {
      id: q.id,
      type: q.type,
      stem: q.stem,
      image: q.image,
      picked,
      answer: q.answer,
      correct,
      explanation: q.explanation
    }
  })
  const correctCount = perQuestion.filter(p => p.correct).length
  const total = Math.round((correctCount / set.questions.length) * 100 * 2) / 2
  return {
    total,
    correctCount,
    questionCount: set.questions.length,
    perQuestion,
    grade: labGradeOf(total)
  }
}
