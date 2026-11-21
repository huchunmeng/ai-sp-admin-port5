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
  },
  {
    id: 'MORPH-URINE-01',
    title: '尿液有形成分判读',
    level: 'U2',
    category: '尿液形态',
    tags: ['尿沉渣', '管型', '结晶'],
    desc: '依据尿沉渣中的管型与结晶形态判断病变部位与代谢背景，覆盖肾小球源性血尿、肾小管损伤、结石与脂质尿。',
    questions: [
      {
        id: 'Q1',
        type: 'single',
        stem: '尿沉渣镜检见管型内充满形态一致的红细胞（红细胞管型），最提示？',
        image: '/images/lab-morph/c1-rbc-cast.svg',
        imageCaption: '尿沉渣 · 红细胞管型（示意图）',
        options: [
          { key: 'A', text: '肾小球源性血尿' },
          { key: 'B', text: '膀胱炎所致下尿路出血' },
          { key: 'C', text: '输尿管结石机械性损伤' },
          { key: 'D', text: '剧烈运动后的生理性血尿' }
        ],
        answer: ['A'],
        explanation: '管型在肾小管内形成，红细胞管型说明红细胞来自肾小球（经肾小管时被蛋白基质包裹），是肾小球源性血尿的重要依据；下尿路出血不会形成红细胞管型。'
      },
      {
        id: 'Q2',
        type: 'single',
        stem: '尿沉渣见大量颗粒管型，最提示哪种病变？',
        image: '/images/lab-morph/c2-granular-cast.svg',
        imageCaption: '尿沉渣 · 颗粒管型（示意图）',
        options: [
          { key: 'A', text: '肾小管损伤（急性肾小管坏死、间质性肾炎等）' },
          { key: 'B', text: '急性膀胱炎' },
          { key: 'C', text: '肾结石' },
          { key: 'D', text: '正常尿液（无临床意义）' }
        ],
        answer: ['A'],
        explanation: '颗粒管型由脱落变性的肾小管上皮细胞碎片聚集而成，提示肾小管损伤，常见于急性肾小管坏死、间质性肾炎及慢性肾脏病；健康人剧烈运动后可偶见少量，但大量出现有病理意义。'
      },
      {
        id: 'Q3',
        type: 'single',
        stem: '尿沉渣见多个无色"信封状/八面体"结晶，最可能提示？',
        image: '/images/lab-morph/c3-ca-oxalate.svg',
        imageCaption: '尿沉渣 · 草酸钙结晶（八面体，示意图）',
        options: [
          { key: 'A', text: '高草酸尿，草酸钙结石风险增加' },
          { key: 'B', text: '高尿酸尿（痛风）' },
          { key: 'C', text: '胱氨酸尿症' },
          { key: 'D', text: '尿路感染' }
        ],
        answer: ['A'],
        explanation: '草酸钙结晶典型呈八面体（信封状），可见于高草酸饮食、乙二醇中毒、原发性高草酸尿等，是草酸钙结石最常见的成分；大量出现且有症状时应评估结石风险与代谢因素。'
      },
      {
        id: 'Q4',
        type: 'single',
        stem: '尿沉渣见黄褐色菱形、玫瑰花状结晶，多见于酸性尿，最可能提示？',
        image: '/images/lab-morph/c4-uric-acid.svg',
        imageCaption: '尿沉渣 · 尿酸结晶（菱形/玫瑰花状，示意图）',
        options: [
          { key: 'A', text: '高尿酸尿（痛风、肿瘤溶解）伴酸性尿' },
          { key: 'B', text: '碱性尿环境下的磷酸盐结晶' },
          { key: 'C', text: '糖尿病酮症酸中毒' },
          { key: 'D', text: '肾病综合征' }
        ],
        answer: ['A'],
        explanation: '尿酸结晶在酸性尿中析出，形态多样（菱形、桶状、玫瑰花状），黄褐色有诊断提示性；常见于痛风、高嘌呤饮食、肿瘤溶解综合征及脱水状态，碱化尿液可减少析出。'
      },
      {
        id: 'Q5',
        type: 'single',
        stem: '尿沉渣见管型内含折光性卵圆脂肪体（可见"马耳他十字"双折光），最提示？',
        image: '/images/lab-morph/c5-fatty-cast.svg',
        imageCaption: '尿沉渣 · 脂肪管型与卵圆脂肪体（示意图）',
        options: [
          { key: 'A', text: '肾病综合征（脂质尿）' },
          { key: 'B', text: '急性肾盂肾炎' },
          { key: 'C', text: '肾结石' },
          { key: 'D', text: '膀胱肿瘤' }
        ],
        answer: ['A'],
        explanation: '脂肪管型/卵圆脂肪体源于大量蛋白尿时肾小管上皮对脂蛋白的重吸收，是肾病综合征的典型尿沉渣表现，常伴大量蛋白尿与低白蛋白血症。'
      }
    ]
  },
  {
    id: 'MORPH-MICRO-01',
    title: '微生物形态判读',
    level: 'R2',
    category: '微生物形态',
    tags: ['革兰染色', '真菌', '细菌形态'],
    desc: '依据革兰染色与真菌涂片的形态特征识别常见病原体，覆盖革兰阳性/阴性球菌与杆菌、假菌丝与芽孢。',
    questions: [
      {
        id: 'Q1',
        type: 'single',
        stem: '革兰染色见红色（革兰阴性）中等大小杆菌，散在分布，最可能为？',
        image: '/images/lab-morph/d1-gnb.svg',
        imageCaption: '革兰染色 · 革兰阴性杆菌（红色，示意图）',
        options: [
          { key: 'A', text: '大肠埃希菌' },
          { key: 'B', text: '金黄色葡萄球菌' },
          { key: 'C', text: '肺炎链球菌' },
          { key: 'D', text: '白念珠菌' }
        ],
        answer: ['A'],
        explanation: '大肠埃希菌为革兰阴性杆菌，染色呈红色/粉色；金黄色葡萄球菌为革兰阳性球菌呈葡萄串状，肺炎链球菌为革兰阳性矛头状双球菌，白念珠菌为真菌（酵母与假菌丝）。'
      },
      {
        id: 'Q2',
        type: 'single',
        stem: '革兰染色见紫色（革兰阳性）矛头状球菌、成双排列，最可能为？',
        image: '/images/lab-morph/d2-gpc-diplo.svg',
        imageCaption: '革兰染色 · 革兰阳性矛头状双球菌（示意图）',
        options: [
          { key: 'A', text: '肺炎链球菌' },
          { key: 'B', text: '大肠埃希菌' },
          { key: 'C', text: '鲍曼不动杆菌' },
          { key: 'D', text: '铜绿假单胞菌' }
        ],
        answer: ['A'],
        explanation: '肺炎链球菌为革兰阳性、矛头状（lanceolate）双球菌，常成对或短链排列，是社区获得性肺炎的常见病原；其余三项均为革兰阴性杆菌/球杆菌。'
      },
      {
        id: 'Q3',
        type: 'single',
        stem: '涂片见革兰阳性酵母细胞，并可见相连的假菌丝与芽生孢子，最可能为？',
        image: '/images/lab-morph/d3-candida.svg',
        imageCaption: '革兰染色 · 酵母细胞与假菌丝（示意图）',
        options: [
          { key: 'A', text: '白念珠菌' },
          { key: 'B', text: '金黄色葡萄球菌' },
          { key: 'C', text: '结核分枝杆菌' },
          { key: 'D', text: '大肠埃希菌' }
        ],
        answer: ['A'],
        explanation: '白念珠菌为革兰阳性酵母，可形成假菌丝与芽生孢子，假菌丝的出现常提示组织侵袭而非单纯定植；细菌不会形成假菌丝。'
      },
      {
        id: 'Q4',
        type: 'single',
        stem: '革兰染色见红色（革兰阴性）球杆菌，大小不一、常成对排列，最可能为？',
        image: '/images/lab-morph/d4-coccobacilli.svg',
        imageCaption: '革兰染色 · 革兰阴性球杆菌（示意图）',
        options: [
          { key: 'A', text: '鲍曼不动杆菌' },
          { key: 'B', text: '金黄色葡萄球菌' },
          { key: 'C', text: '结核分枝杆菌' },
          { key: 'D', text: '白念珠菌' }
        ],
        answer: ['A'],
        explanation: '鲍曼不动杆菌为革兰阴性球杆菌，常呈多形性、成对或短链排列，是院内感染（尤其 ICU 与呼吸机相关肺炎）的重要病原；结核分枝杆菌需抗酸染色，呈红色细长杆菌。'
      },
      {
        id: 'Q5',
        type: 'single',
        stem: '革兰染色见紫色（革兰阳性）粗大杆菌，两端平齐、呈竹节状链状排列，中央可见芽孢，最可能为？',
        image: '/images/lab-morph/d5-anthrax.svg',
        imageCaption: '革兰染色 · 革兰阳性粗大杆菌呈竹节状（示意图）',
        options: [
          { key: 'A', text: '炭疽芽孢杆菌' },
          { key: 'B', text: '大肠埃希菌' },
          { key: 'C', text: '肺炎链球菌' },
          { key: 'D', text: '白念珠菌' }
        ],
        answer: ['A'],
        explanation: '炭疽芽孢杆菌为革兰阳性粗大杆菌，两端平齐、呈竹节状长链排列，中央芽孢为其典型形态；临床需按高致病性病原体防护流程处理并上报。'
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
