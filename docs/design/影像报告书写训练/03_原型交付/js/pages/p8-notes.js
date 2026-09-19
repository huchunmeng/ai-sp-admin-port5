/* P8 评审说明页（非产品界面）。
   页面区（P1–P7 / P9–P13）只保留产品态文案；凡「评审才需要」的内容——§章节引用、
   状态全集、口径清单、原型自限、用语对照——一律收拢到本页，按分区归位。
   分区：①交付范围 ②状态全集 ③口径清单 ④界面用语↔PRD术语 ⑤交付物与自检 ⑥原型自限 ⑦待拍板 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  /* 锚点条：hash 被路由占用（#p8），故用 data-act 而非 <a href="#s2"> */
  var SECTIONS = [
    ['s1', '交付范围'],
    ['s2', '状态全集'],
    ['s3', '口径清单'],
    ['s4', '界面用语'],
    ['s5', '交付物与自检'],
    ['s6', '原型自限'],
    ['s7', '待拍板']
  ];

  function anchors() {
    return '<div class="doc-anchors">' + SECTIONS.map(function (s, i) {
      return '<span class="doc-anchor" data-act="anchor" data-target="' + s[0] + '">' +
        (i + 1) + '. ' + H.esc(s[1]) + '</span>';
    }).join('') + '</div>';
  }

  /* 状态全集卡片：触发页 · 触发条件 · 学员可见形态 */
  function stateCard(o) {
    return '<div class="doc-state">' +
      '<div class="ds-head">' + H.icon(o.icon || 'refresh', { size: 13 }) +
        '<span>' + H.esc(o.title) + '</span>' +
        (o.page ? '<span class="ds-page">' + H.esc(o.page) + '</span>' : '') +
      '</div>' +
      '<div class="ds-body">' + o.body + '</div>' +
    '</div>';
  }

  function row(k, v) {
    return '<div class="ds-row"><span class="ds-k">' + H.esc(k) + '</span><span>' + v + '</span></div>';
  }

  function stateGroup(no, text) {
    return '<div class="group-head">' + H.icon('grid', { size: 14 }) +
      '<span>' + H.esc(text) + '</span><span class="gh-count">' + no + '</span></div>';
  }

  function demoTable() {
    return '<table class="doc-table">' +
      '<thead><tr><th>样本</th><th>能力位（测量/既往/增强/肿瘤/分期）</th><th class="num">可评分<br>scoreableMax</th><th>被移出分母的条目</th></tr></thead>' +
      '<tbody>' + S.SELECTION_DEMO.map(function (d) {
        var cp = d.cap;
        var cap = [cp.hasMeasurement, cp.hasPriorExam, cp.hasEnhancedPhase, cp.isTumor, cp.hasStagingInfo]
          .map(function (b) { return b ? '✓' : '✗'; }).join(' / ');
        var lost = d.lost.length
          ? d.lost.map(function (l) {
              return '<code>' + l.code + '</code>（' + l.score + ' 分' + (l.source === 'na' ? '·N/A' : '') + '）';
            }).join(' ')
          : '<span style="color:var(--text-tertiary)">—（满分卷）</span>';
        var flag = d.scoreableMax >= 85 ? '' : ' <span class="doc-flag must">低于下限</span>';
        return '<tr><td>' + H.esc(d.id) + '<br><span style="color:var(--text-secondary)">' + H.esc(d.title) + '</span></td>' +
          '<td class="mono">' + cap + '</td>' +
          '<td class="num" style="font-weight:700">' + d.scoreableMax + flag + '</td>' +
          '<td>' + lost + '</td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  /* 双存口径窗：P7 三例的 raw / normalized 实际数（学生端不展示，仅评审核对） */
  function dualStoreTable() {
    return '<table class="doc-table">' +
      '<thead><tr><th>例</th><th class="num">rawTotal<br>原始分</th><th class="num">scoreableMax<br>归一分母</th>' +
        '<th class="num">total<br>归一成绩</th><th>算式</th></tr></thead>' +
      '<tbody>' + S.RESULT.cases.map(function (x) {
        return '<tr><td>' + H.esc(x.short) + ' · ' + H.esc(x.name) + '</td>' +
          '<td class="num mono">' + x.rawTotal + '</td>' +
          '<td class="num mono">' + x.scoreableMax + '</td>' +
          '<td class="num mono" style="font-weight:700">' + x.total + '</td>' +
          '<td class="mono" style="font-size:11.5px">' + x.rawTotal + ' ÷ ' + x.scoreableMax + ' × 100 = ' + x.total + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* 改版影响面：哪些已发布任务锁在旧版本（P9 页内表迁入） */
  function verTable() {
    var imp = S.SAMPLE_VER_IMPACT;
    return '<table class="doc-table">' +
      '<thead><tr><th style="width:120px">任务</th><th style="width:96px">状态</th>' +
        '<th style="width:180px">卷内版本</th><th>说明</th></tr></thead>' +
      '<tbody>' + S.ADM_TASKS.map(function (t) {
        var hit = t.caseRefs.filter(function (r) { return r.caseId === imp.id; })[0];
        if (!hit) return '';
        var locked = hit.version === imp.from;
        return '<tr><td class="mono">' + H.esc(t.id) + '</td>' +
          '<td>' + H.stateTag(t.state) + '</td>' +
          '<td class="mono">' + H.esc(hit.caseId) + ' @ v' + hit.version +
            (locked ? ' <span class="tag plain">锁旧版</span>' : '') + '</td>' +
          '<td class="tiny">' + H.rich(locked
            ? '已发布 → **吃不到** v' + imp.to + ' 的改动'
            : '新任务 → 取 v' + imp.to) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* 用语对照表：左＝界面实际用词（对齐 port5 现有产品），右＝PRD / 数据字段术语 */
  var TERMS = [
    ['学员 / 学员端', '学生 / 学生端', 'port5 全仓统一用「学员」（116 处），界面一律跟随'],
    ['病例 / 病例卡片 / 病例列表', '样本 / 样本卡片 / 样本列表', '界面叫「病例」，数据字段仍是 `caseRefs[]` / `caseSnapshot[]`'],
    ['影像报告题库（管理端菜单节点）', '题库维护（§5.12）', '节点名进管理端菜单，PRD 章节名不动'],
    ['发布 / 已发布 / 重新发布', '派发 / 已派发 / 重派', 'port5 零使用「派发」，界面统一到「发布」系'],
    ['考核对象', '派发对象', '同上'],
    ['发布设置', '派发设置', '同上'],
    ['阅片 / 判读', '阅片', 'port5 两词并用：「阅片」作**阶段名**（T0）与课程名，「判读」作**能力表述**（"影像征象判读经验不足"）。界面沿用这一分工，不强行统一'],
    ['可评分 / 可评分上限', '`scoreableMax`', '字段名与学生端文案都不展示，仅管理端组卷口径用'],
    ['不纳入评分的条目', '不可评条目 · 甲类 / 乙类', '甲类＝去标识致不可评；乙类＝能力位落空致不可评']
  ];

  function termTable() {
    return '<table class="doc-table">' +
      '<thead><tr><th style="width:210px">界面用词（port5 习惯）</th><th style="width:230px">PRD / 数据字段术语</th><th>说明</th></tr></thead>' +
      '<tbody>' + TERMS.map(function (t) {
        return '<tr><td><b>' + t[0] + '</b></td><td>' + H.rich(t[1]) + '</td><td>' + H.rich(t[2]) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p style="color:var(--text-secondary)">' + H.rich('需求面板（右栏）**保留 PRD 原词不改**（它就是上表的右列）——串讲时看到「面板说样本、界面说病例」不是不一致，是**同一件事的两套口径**。') + '</p>';
  }

  function P8Notes() {
    var gateOk = S.SELECTION_DEMO.filter(function (d) { return d.scoreableMax >= 85; }).length;
    var gateBad = S.SELECTION_DEMO.length - gateOk;

    return '<div class="content-inner">' +
      '<div class="doc-body">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('doc', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">原型评审说明</div>' +
          '<div class="page-head-sub">' + H.rich('本页**不是产品界面**。P1–P7 / P9–P13 只呈现产品态；凡评审才需要的内容（§引用、状态全集、口径、自限、用语对照）全部收拢在本页。') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' + H.tag('Step 4 交付物', 'info', true) + '</div>' +
      '</div>' +

      anchors() +

      /* ─────────────── 一、交付范围 ─────────────── */
      '<h3 id="s1">一、交付范围</h3>' +
      '<p>' + H.rich('AI-PM 七步流程的 **Step 4（原型生成）**：Step 1 需求结构化 → Step 2 逻辑完备性审计（69 → **89** / 100）→ Step 3 PRD 质量审查（🔴 严重缺失 5 → **0**）→ **Step 4 本原型** → Step 5 同步校验 → Step 6 自检 → Step 7 交付。') + '</p>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:52px">页</th><th style="width:150px">页面</th><th>PRD 路由</th><th style="width:230px">产品内挂载位置</th></tr></thead>' +
        '<tbody>' +
          '<tr><td colspan="4" style="background:var(--border-light);font-weight:700;font-size:12px">训练端 · 无左侧菜单，入口为首页功能卡</td></tr>' +
          '<tr><td>P1</td><td>模块首页（双入口）</td><td><code>/report-writing</code></td><td>首页 › 影像报告书写训练</td></tr>' +
          '<tr><td>P2</td><td>训练病例列表</td><td><code>/report-writing/train</code></td><td>首页 › 影像报告书写训练 › 训练</td></tr>' +
          '<tr><td>P3</td><td>训练工作台 T0–T4</td><td><code>/report-writing/train/:caseId</code></td><td>同上 › 训练工作台（以下层级实机未实现）</td></tr>' +
          '<tr><td>P4</td><td>对照自评页（T4）</td><td><code>…/:id/self-review</code></td><td>同上（实机未实现）</td></tr>' +
          '<tr><td>P5</td><td>我的考核任务</td><td><code>/report-writing/exam</code></td><td>首页 › 在线考试 › 影像报告书写考核</td></tr>' +
          '<tr><td>P6</td><td>考核工作台</td><td><code>/report-writing/exam/:taskId</code></td><td>同上 › 考核工作台（实机未实现）</td></tr>' +
          '<tr><td>P7</td><td>评分结果页</td><td><code>…/:taskId/result</code></td><td>同上（实机未实现）</td></tr>' +
          '<tr><td colspan="4" style="background:var(--border-light);font-weight:700;font-size:12px">管理端 · 挂进 AdminLayout 菜单树（顶栏与主色切为 #1890FF）</td></tr>' +
          '<tr><td>P9</td><td>影像报告题库</td><td><code>/imaging-samples</code></td><td>临床思维管理 › 病例管理 › <b>影像报告题库</b></td></tr>' +
          '<tr><td>P10</td><td>病例编辑器</td><td><code>/imaging-samples/:id</code></td><td>同上 › 某条病例</td></tr>' +
          '<tr><td>P11</td><td>考核任务管理</td><td><code>/imaging-exams</code></td><td>临床思维管理 › 考核管理 › <b>影像报告考核</b></td></tr>' +
          '<tr><td>P12</td><td>组卷与发布（四步同页）</td><td><code>/imaging-exams/create/:id?</code></td><td>同上 › 新建考核</td></tr>' +
          '<tr><td>P13</td><td>成绩汇总与学情</td><td><code>/imaging-exams/:id/scores</code></td><td>同上 › 某场考核 › 成绩</td></tr>' +
          '<tr><td colspan="4" style="background:var(--border-light);font-weight:700;font-size:12px">说明</td></tr>' +
          '<tr><td>P8</td><td>原型评审说明（本页）</td><td>—（非产品界面）</td><td>—</td></tr>' +
        '</tbody>' +
      '</table>' +
      '<p style="color:var(--text-secondary)">' + H.rich('**创建考试 / 组卷 / 发布 / 成绩汇总原归教师端**（任务单第 5 项），port5 无教师端 → 本期并入 `apps/admin` 承接，作为「病例管理」与「考核管理」两个分组下的新增菜单节点。学生侧仍是 P1–P7。') + '</p>' +
      '<p style="color:var(--text-secondary)">' + H.rich('管理端菜单节点 id 必须等于路由首段（`AdminLayout.vue` 用 `path.split(\'/\')[1]` 匹配菜单），故 P9/P10 共用 `imaging-samples`、P11–P13 共用 `imaging-exams`。') + '</p>' +

      '<h4>1.1 模块边界（§1.5 · 不做什么）</h4>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:150px">边界</th><th>说明</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>影像阅片工具</td><td>调窗、测量、MPR、序列管理等归<b>影像教学底座</b>；本模块只消费底座提供的影像与能力位</td></tr>' +
          '<tr><td>组卷与发布界面</td><td>创建考核 / 组卷 / 发布 / 成绩汇总原归<b>教师端</b>；port5 无教师端 → <b>本期并入管理端承接</b>（P9–P13 / §5.12–5.14）。学员侧只承接「我的考核任务」与作答</td></tr>' +
          '<tr><td>移动端</td><td><b>不做移动端适配</b>，也不上 App 训练端</td></tr>' +
          '<tr><td>报告书写之外</td><td>不覆盖病历书写、影像技术操作、影像解剖等 E 系列其他模块</td></tr>' +
        '</tbody>' +
      '</table>' +

      '<h4>1.2 原型内快速跳转（评审导航，非产品界面）</h4>' +
      '<p style="color:var(--text-secondary)">' + H.rich('原为 P1 首页底部一张「管理端承接了什么」卡——产品首页不该有它，移到本页当评审导航。') + '</p>' +
      '<div class="doc-jumps">' +
        [['p9', 'folder', '影像报告题库', '入库 · 脱敏 · 能力位 · 金标准'],
         ['p11', 'clipboard-check', '考核任务管理', '发布 · 撤销 · 进度'],
         ['p12', 'layers', '组卷与发布四步', '选样 · 权重 · 门禁'],
         ['p13', 'chart', '成绩汇总与学情', '三层下钻 · 失分率']].map(function (x) {
          return '<div class="doc-jump" data-act="go" data-page="' + x[0] + '">' +
            '<div class="dj-t">' + H.icon(x[1], { size: 15 }) + ' ' + H.esc(x[2]) + '</div>' +
            '<div class="dj-s">' + H.esc(x[3]) + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<p style="color:var(--text-secondary)">' + H.rich('切到管理端页时顶栏与主色会切成 `#1890FF`（`body.end-admin`），与 `apps/admin` 同一套令牌。') + '</p>' +

      /* ─────────────── 二、状态全集 ─────────────── */
      '<h3 id="s2">二、状态全集</h3>' +
      '<p>' + H.rich('下列状态在页面上**只渲染当前态**（或由交互切实时切换），此处分条留档，便于逐一核对文案与按钮态。每张卡标出**触发页 · 触发条件 · 学员可见形态**。') + '</p>' +
      '<div id="stateBox">' + stateCards() + '</div>' +

      /* ─────────────── 三、口径清单 ─────────────── */
      '<h3 id="s3">三、口径清单</h3>' +

      '<h4>3.1 按样本现算的可评分（§5.5.1）</h4>' +
      '<p>' + H.rich('能力位**随样本入库声明**，可评分是**派生字段**、**不展示给学员**。下表由本页**现场计算**；管理端 P9 / P10 里的可评分同样是现算——**点能力位徽章可勾/取消，数字当场变**：') + '</p>' +
      demoTable() +
      '<p style="color:var(--text-secondary)">' + H.rich('被移出分母的条目共四类：`FIND-04`（测量工具）、`IMP-08`（既往片）、`FIND-06`（增强序列）、`IMP-05`（肿瘤分期依据）。') + '</p>' +
      '<p style="color:#047857;font-size:12.5px;line-height:1.85">' + H.icon('check', { size: 13 }) +
        H.rich(' **第 5 能力位已回写 PRD**：上表能力位取 **5 位**（多出 `hasStagingInfo` = 临床信息是否给足分期依据），PRD §5.2.2 / §5.10.2 / §5.12.5 / 附录 E / 附录 C V2 已于 **2026-09-19 第五轮**同步为 5 位。' +
          '补第 5 位的原因：附录 E 给 `IMP-05` 的处置带"肿瘤样本**且临床信息不足**"这一附加条件，`isTumor` 一位表达不了；且 BDD 场景 30 写的 `isTumor:true` 在 4 位口径下会把 `IMP-05` 判成可评（只剔 3 条 = 88 分），与该场景同时给出的 **84 分**自相矛盾。') + '</p>' +

      '<h4>3.2 发布下限 85 的门禁</h4>' +
      '<p>本期 <b>' + S.SELECTION_DEMO.length + '</b> 个样本里，' +
        '<b style="color:#047857">' + gateOk + '</b> 个可评分 ≥ 85、' +
        '<b style="color:#b91c1c">' + gateBad + '</b> 个低于下限。</p>' +
      '<div class="doc-callout err">' +
        '<div class="dc-title">' + H.icon('warn', { size: 14 }) +
          ' 四类条目同时落空 → 整卷可评分 84 &lt; 85 → 触发门禁二次确认</div>' +
        '<div class="dc-body">' +
          '100 − 4 − 4 − 4 − 4 = <b class="mono">84</b>。' +
          H.rich(' **甲类「GEN-02」是部分不可评**（检查号/影像号保留后 4 位仍可评），该条**整体仍计入分母**——这正是 84 这个数不含它的原因。') +
        '</div>' +
      '</div>' +
      '<p style="color:var(--text-secondary)">' + H.rich('门禁落在**管理端组卷**（P12 第 4 步 / §5.13.5）：整卷可评分 `< 85` 时**不是拒绝发布**，而是**必须填发布原因**（≤ 200 字）+ 写审计 `exam.publish.overrideGate`，按钮文案「**仍要发布**」。' +
        '数量口径为**整卷加权**（`Σ(本例可评分 × 权重) / Σ权重`）。归一代价是"考一张更短的卷"——分布右移、区分度下降、**跨卷不可比**，这一点写进了送审清单决策 5。') + '</p>' +

      '<h4>3.3 归一折算与双存（§5.5.1 ③）</h4>' +
      '<p>' + H.rich('不可评条目**整体移出分母**：`可评分 = 100 − Σ(落空条目满分)`。结果层 **raw / normalized 双存**（`rawTotal` / `scoreableMax` / `total` + `unassessableItems[]`），三者同时持久化——否则影像教学底座补齐测量工具后，**历史成绩无法重算**。' +
        '学员成绩单**只呈现折算后的分**，不展示 `scoreableMax`（避免"这卷只考了 84 分"被误读成扣分理由）。') + '</p>' +
      '<p style="color:var(--text-secondary)">' + H.rich('下表是 P7 三例的**实际口径窗**——原为 P7 页内一张标着「评审专用 · 学生端不展示」的卡，现归到本页：') + '</p>' +
      dualStoreTable() +
      '<p style="color:var(--text-secondary)">' + H.rich('例外：若整卷 `scoreableMax < 85` 且组卷者**二次确认强行发布**，则该卷成绩单会标注"本卷可评分 X 分"（§5.5.1 门禁表）。') + '</p>' +

      '<h4>3.4 不可评条目的两档（§5.2.2 / 附录 E）</h4>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:70px">档</th><th style="width:180px">成因</th><th>说明</th></tr></thead>' +
        '<tbody>' +
          '<tr><td><b>甲类</b></td><td>样本去标识</td><td>全局常量，不随样本变。<code>GEN-02</code> 属<b>部分不可评</b>（检查号 / 影像号保留后 4 位仍可评），<b>该条整体仍计入分母</b></td></tr>' +
          '<tr><td><b>乙类</b></td><td>样本能力位落空</td><td><b>必须现算，禁止写成静态旗标</b>——能力位随样本入库声明，改一位数字就变</td></tr>' +
        '</tbody>' +
      '</table>' +

      '<h4>3.5 参考报告（金标准）的下发口径</h4>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:110px">侧</th><th>规则</th></tr></thead>' +
        '<tbody>' +
          '<tr><td><b>训练侧 T4</b></td><td>自评提交后<b>必定下发</b>金标准原文，不受任务开关影响</td></tr>' +
          '<tr><td><b>考核侧</b></td><td>由任务级配置 <code>revealGoldStandardAfterSubmit</code> 决定，<b>默认 false</b>（§5.5.1 / D9 / §7.4）；为 false 时只给维度 / 条目级缺失清单，不含金标准原文与事实词；为 true 且已交卷时展示全文（BDD 场景 12）</td></tr>' +
        '</tbody>' +
      '</table>' +

      '<h4>3.6 题库的语义与版本口径</h4>' +
      '<p>' + H.rich('题库存的是**病例**（影像序列 + 脱敏信息 + 能力位 + 金标准报告），**不是"题目"**——组卷时才从题库挑病例、赋权重，形成一张**考核卷**（§5.13）。题库是**独立于平台 / 机构 / 专家病例库**的新模块，自建自用、不与专家病例库互通。') + '</p>' +
      '<p>' + H.rich('**可评分 `scoreableMax` 由页面现算**：P9 上点病例卡的**能力位徽章**可勾选 / 取消，右侧数字立刻变，门禁线的由来一目了然。') + '</p>' +
      '<p>' + H.rich('**改版影响面**：题库里改**已发布**的病例（`' + S.SAMPLE_VER_IMPACT.id + '`）**不允许原地覆盖**，必须新建版本 v' + S.SAMPLE_VER_IMPACT.from +
        ' → v' + S.SAMPLE_VER_IMPACT.to + '。改版后**新任务**取 v' + S.SAMPLE_VER_IMPACT.to + '，' +
        '**' + S.SAMPLE_VER_IMPACT.openTasks + ' 个已发布任务**仍按 `caseRefs[].version` **锁在 v' + S.SAMPLE_VER_IMPACT.from + '**，' +
        '学员看到的影像与评分依据**不变**——`caseSnapshot[]` 快照与版本号的共同作用（§5.5.1）。') + '</p>' +
      verTable() +

      '<h4>3.7 入库与脱敏口径</h4>' +
      '<p>' + H.rich('**入库**：只收图片序列（JPG / PNG），zip 内按轴位 / 冠状 / 矢状分目录；前端 **JSZip 解包**，**不依赖影像教学底座、不解析 DICOM**（§1.2 不做项）。拒收情形（非 zip / 含非图片文件 / 单帧 > 5 MB / 总帧数 > 600 / 无轴位序列）**整包拒绝**并明示原因，不做部分入库。') + '</p>' +
      '<p>' + H.rich('**脱敏**：`GEN-02`「患者基本情况完整」**强制全掩、不提供开关**——姓名等直接标识在入库时即抹除，题库侧不存原文、也不存"可见 / 不可见"的选项。检查号 / 影像号**保留后 4 位**，故该条属**部分不可评**，但**整体仍计入分母**（§5.2.2 甲类，见 3.4）。') + '</p>' +

      '<h4>3.8 发布之后的可为与不可为（§5.13.6）</h4>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:170px">动作</th><th style="width:96px">允许</th><th>说明</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>看成绩汇总 / 学情</td><td>' + H.tag('允许', 'scored', true) + '</td>' +
            '<td>三层下钻：任务级 → 学员级 → 病例级（§5.14）</td></tr>' +
          '<tr><td>改卷内病例 / 改权重</td><td>' + H.tag('禁止', 'failed', true) + '</td>' +
            '<td>' + H.rich('**已发布任务一律不可改**——改了就出现"不同学员考的同一任务不是同一张卷"。确实要换题，只能**撤销后重新发布新任务**（新任务 id，成绩不与旧任务混算）') + '</td></tr>' +
          '<tr><td>延长开放窗口</td><td>' + H.tag('本期不做', 'scoring', true) + '</td>' +
            '<td>' + H.rich('窗口延期涉及"已交卷 / 未领取"两拨人的口径分歧，**本期不提供**；需要延就撤销后重新发布') + '</td></tr>' +
          '<tr><td>删除任务</td><td>' + H.tag('禁止', 'failed', true) + '</td>' +
            '<td>' + H.rich('**任何状态下都不允许删除**；撤销是终态、留痕不删（与 §5.5 状态全集一致）') + '</td></tr>' +
          '<tr><td>改学员成绩</td><td>' + H.tag('禁止', 'failed', true) + '</td>' +
            '<td>' + H.rich('成绩由评分引擎产出；申诉本期**只做只读登记**，不提供复核 / 改分按钮（§5.14.6）') + '</td></tr>' +
        '</tbody>' +
      '</table>' +
      '<p style="color:var(--text-secondary)">' + H.rich('组卷草稿（四步向导走到一半）**只存本机 localStorage**，不落服务端、不生成任务 id；只有第 4 步点了发布，才产生 `AT-…` 任务并进入上表。') + '</p>' +

      '<h4>3.9 组卷基线与名单源</h4>' +
      '<p>' + H.rich('**时长基线**：默认 **20 分钟**，对齐 OSCE S03 站（§2.2 G2）。') + '</p>' +
      '<p>' + H.rich('**考核对象名单**：班级隶属解析依赖权威名单（§9.3 / Q11，**待院方确认数据源**）。原型不接名单源，**接口形状即契约**：`listClasses()` → `[{classId, name, studentCount}]`；`listStudents(classId)` → `[{studentId, name}]`。') + '</p>' +
      '<p>' + H.rich('**路由语义**：`/imaging-exams/create` 为**新建组卷**；`/imaging-exams/create/:id` 为**复制一份已有任务**做新卷（复用其卷面与发布设置，生成**新任务 id**）。') + '</p>' +

      '<h4>3.10 成绩汇总口径（§5.14）</h4>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:170px">项</th><th>口径</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>均分分母</td><td>' + H.rich('只统计**已交卷的作答**；「未交卷」**不按 0 分计入均分**、也不显示为 0 分。注意这与"卷内某例未作答"是两回事——后者**按 0 分计入该例**、结果页明示（§5.14.2）') + '</td></tr>' +
          '<tr><td>学员级取分</td><td>按任务级取分策略取值（首次 / 最高 / 最后一次），成绩单<b>只呈现被计入的那一次</b></td></tr>' +
          '<tr><td>病例级归一</td><td>' + H.rich('逐例 `total = rawTotal / scoreableMax × 100`；双存明细（`scoreableMax` / `rawTotal` / `total`）**不对学员展示**（§5.14.4，与 P7 呈现边界一致）') + '</td></tr>' +
          '<tr><td>条目级失分率</td><td>' + H.rich('`Σ该条实际得分 / Σ该条可评满分`——**不可评条目直接从分母剔除**，否则"病例不具备的能力"会被读成"学员不会"。可评次数 < 5 的条目标「样本量不足」、**不参与排序**；从未可评的条目不出现在排行里（没有分母就没有失分率）。本演示样本池 = 2 名学员 × 3 例 = **6 个 case-score**（§5.14.5）') + '</td></tr>' +
          '<tr><td>成绩导出</td><td>' + H.rich('CSV / PDF **不含金标准原文**，并写审计 `score.export`；每页 50 条（§5.14.7 / §5.11）') + '</td></tr>' +
          '<tr><td>申诉处置</td><td>' + H.rich('本期申诉**只落登记数据**，管理端**不提供复核 / 改分按钮**，处置在线下完成、线上仅留痕（§5.14.6）。申诉原因**原样纯文本渲染**（不解析 Markdown / 不执行 HTML），防 XSS') + '</td></tr>' +
        '</tbody>' +
      '</table>' +

      /* ─────────────── 四、界面用语 ↔ PRD 术语 ─────────────── */
      '<h3 id="s4">四、界面用语 ↔ PRD 术语对照</h3>' +
      '<p>' + H.rich('界面文案一律对齐 **port5 现有产品的用词习惯**；PRD 已送审，其术语与数据字段**保持不动**。两套口径的衔接就靠下表。') + '</p>' +
      termTable() +

      /* ─────────────── 五、交付物与自检 ─────────────── */
      '<h3 id="s5">五、交付物与自检</h3>' +

      '<h4>5.1 形态与视觉</h4>' +
      '<ul>' +
        '<li><b>不套预设，仿实现</b>：设计令牌逐条对齐两端实机——学生侧取 <code>apps/training/src/styles/variables.css</code>（<code>--primary: #2563eb</code>、<code>--card-radius: 12px</code>、<code>--header-height: 60px</code> 等）；管理侧（P9–P13）取 <code>apps/admin/src/styles/variables.css</code>（<code>--adm-primary: #1890FF</code>、<code>--adm-header-bg: #1A5F9E</code>、<code>--adm-sidebar-bg #2B3A4A</code>）。<b>两端主色不是同一套</b>，切页时由 <code>body.end-admin</code> 整体换观感。</li>' +
        '<li><b>一屏单壳 + 侧栏 + 需求面板</b>：' + H.rich('左侧侧栏按 **port5 真实 IA** 渲染——管理端按 `AdminLayout` 的菜单树逐级展开（原有菜单项渲染为灰色定位行，本模块两处新增节点可点），训练端因实机无左侧菜单，改显**面包屑路径**。右侧需求面板放 PRD 原文摘录。') + '</li>' +
        '<li><b>管理端两个新增节点的挂载位置</b>（§6.1）：' + H.rich('「影像报告题库」挂 `临床思维管理 › 病例管理` 组末尾，承载 P9 题库列表 / P10 病例编辑器（路由 `/imaging-samples`）；「影像报告考核」挂 `临床思维管理 › 考核管理` 组末尾，承载 P11 任务管理 / P12 组卷与发布 / P13 成绩汇总（路由 `/imaging-exams`）。**不新增顶级模块**，菜单树分层不变。') + '</li>' +
        '<li><b>文件拆分，<code>file://</code> 双击可用</b>：<code>css/</code> 5 个 + <code>js/</code> 若干，普通 <code>&lt;script src&gt;</code>；<b>不用 ESM import、不 fetch JSON</b>（file:// 下 origin 为 null 会被 CORS 拦），数据统一挂 <code>window.SEED</code>。</li>' +
        '<li><b>图标走内联 SVG</b>（<code>js/icons.js</code>），不走 CDN 字体，保证离线可用。</li>' +
        '<li><b>各页工厂在 try/catch 内执行</b>，DOM 查询限本页 root —— 单页报错只死自己，不影响其他页。</li>' +
        '<li><b>影像为占位</b>（斑马纹 + 十字线），真实样本待院方提供（Q2）。</li>' +
      '</ul>' +

      '<h4>5.2 串讲编辑模式怎么用</h4>' +
      '<ul>' +
        '<li>点顶栏 <b>编辑模式</b> → ' + H.rich('内容区与右侧需求面板里**带虚线框的文案可直接改写**（标题、说明条、卡片注释、PRD 引用均为可编辑锚点）。') + '</li>' +
        '<li>改动写入 <code>localStorage</code>：<code>hi-fi-prototype:report-writing:draft</code>，刷新不丢。</li>' +
        '<li><b>导出全部</b> → 下载 <code>prototype-config.json</code>（改动清单）与 <code>prd-change-suggestions.md</code>（按页归拢的 PRD 修改建议）；<b>恢复默认</b> → 清空草稿。</li>' +
        '<li>草稿超过 <b>30 天</b> 时，打开会先询问是否继续套用，避免用过期口径串讲。</li>' +
        '<li>' + H.rich('**改文案前先清草稿**：草稿按 `data-edit-key` 覆盖页面文案，若上一轮串讲留了草稿，会盖掉新版文字。') + '</li>' +
      '</ul>' +

      '<h4>5.3 验证口径</h4>' +
      '<ul>' +
        '<li><code>tools/verify_render.py</code>：headless 渲染 13 页 + 结构断言（<code>&lt;body&gt;</code> 上的 <code>data-proto-ready</code> / <code>end-admin</code> 类 / 关键词）。入口是<b> hash </b>（<code>index.html#p9</code>），不是 query。</li>' +
        '<li><b>断言的形状要配得上它要抓的东西</b>：' +
          H.rich('`end-admin` 原先用 `"end-admin" in html` 做全文包含判断，而本页正文里就写着 `body.end-admin` 字样——P8 即使没挂上管理端外壳也判 True。已改为锚在 ') +
          '<code>&lt;body&gt;</code>' +
          H.rich(' 标签上的正则。同理，被转义的粗体标签里**仍然含 `b`**，关键词断言照样命中，所以才有下面那一层渲染后扫描。') +
        '</li>' +
        '<li><code>tools/detect_rich_html.py</code>：静态扫 <code>H.rich()</code> / <code>H.ed()</code> 实参里的字符串字面量是否含 HTML 标签。' + H.rich('**这两个 helper 内部 `esc()` 打底**，传 `<b>` 进去会被转义成字面文本直接显示给用户——已经踩过一次。') + '新增文案只用行内的 <code>**粗体**</code> 与 <code>`反引号`</code>，且必须写在 <code>H.rich()</code> 实参里。</li>' +
        '<li><code>tools/scan_bare_md.py</code>：渲染 13 页 → 剥 <code>script</code>/<code>style</code> 与标签 → 扫可见文本里的裸 <code>**</code> / 反引号。' + H.rich('**这一层是上面静态扫描抓不到的**——`H.esc(t.desc)` 这类调用形态看不出实参里有没有 markdown。') + '</li>' +
        '<li><code>tools/peek_page.py</code>：抽某页渲染后的可见文本（跳过侧栏），用于核对页面区是否残留评审性文字。</li>' +
      '</ul>' +

      /* ─────────────── 六、原型自限 ─────────────── */
      '<h3 id="s6">六、原型自限</h3>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:150px">项</th><th>说明</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>影像本体</td><td>占位（斑马纹 + 十字线）。真实样本待院方提供（Q2）；测量 / 调窗 / MPR 归影像教学底座（Q9）</td></tr>' +
          '<tr><td>三视图联动</td><td><b>互不联动</b>——各自独立翻层，不做层面定位联动（联动属 MPR，归底座）</td></tr>' +
          '<tr><td>考核管理界面</td><td>创建考试 / 组卷 / 发布 / 成绩汇总原归教师端，<b>本期并入管理端承接</b>（P11 / P12 / P13）</td></tr>' +
          '<tr><td>模型输出</td><td>提示引擎与评分引擎的输出为<b>静态示例文本</b>；真实内容由服务端模型产出并过红线校验（§9.5）</td></tr>' +
          '<tr><td>计时与幂等</td><td>原型只呈现 UI 态，<b>不做真实倒计时执行</b>；服务端契约见 §5.6.1 / §5.6.2</td></tr>' +
          '<tr><td>移动端</td><td><b>不做移动端适配</b>，也不上 App 训练端（§1.5）</td></tr>' +
          '<tr><td>交互深度</td><td>本原型可"点"的地方<b>只为演示状态切换</b>（自评打标、切例、配额消耗、弹窗），不做真实业务写入</td></tr>' +
          '<tr><td>路由深度</td><td>侧栏只画到<b>实机真有的层级</b>；工作台以下（P3/P4/P6/P7）实机未实现，不虚构路径</td></tr>' +
        '</tbody>' +
      '</table>' +

      /* ─────────────── 七、待拍板 ─────────────── */
      '<h3 id="s7">七、待拍板</h3>' +
      '<ol>' +
        '<li><b>★最重要</b>：脱敏病例怎么评分？全掩字段归一折算是否可接受；是否需与院方对齐。</li>' +
        '<li>训练流程的组织形态：五阶段是否太碎；配额数字（L2 = 3 / 回合、L3 = 1 / 回合）是否合适。</li>' +
        '<li>对需求 <b>E2-7 的有条件偏离</b>：<code>revealGoldStandardAfterSubmit</code> 是否同意、是否回写需求确认单。</li>' +
        '<li><s>考核发布<b>依赖教师端</b>排期：能否对齐；不能则本期先只交付训练侧？</s> <b style="color:#047857">已闭合</b>——第五轮起并入管理端承接（§5.12–5.14 / R7）。</li>' +
        '<li><b>★第四轮新增</b>：R1 表 4 条（16 分）本期评不了怎么办？可评分不满 100 的卷子照发是否接受；是否争取影像底座同步交付测量工具。</li>' +
      '</ol>' +
      '<p style="color:var(--text-secondary)">' +
        '附带材料：<code>../送审_待拍板清单_20260919.md</code>（决策 5 / 提醒 3 / 问院方 10）、' +
        '<code>../问询单_待院方确认_20260919.md</code>。' +
      '</p>' +

      '</div>' +
    '</div>';
  }

  /* 各页「状态示例」卡迁入于此——页面区只渲染当前态，全集在此留档 */
  function stateCards() {
    return '' +

      /* ── P2 训练病例列表 ── */
      stateGroup('P2', '训练病例列表') +
      stateCard({ page: 'P2', title: '加载中（骨架屏）', icon: 'refresh', body:
        row('触发条件', '首次进入 / 切换筛选') +
        row('可见形态', '3 张骨架卡：缩略图色块 + 三行灰条（60% / 100% / 40%）') }) +
      stateCard({ page: 'P2', title: '空态', icon: 'search', body:
        row('触发条件', '筛选无结果 / 全部练完') +
        row('可见形态', '放大镜图标 + 「当前筛选下没有病例」+ 引导语 + 「清空筛选」按钮') +
        row('要点', H.rich('列表为空时**不显示**"继续上次"入口')) }) +
      stateCard({ page: 'P2', title: '加载失败', icon: 'warn', body:
        row('触发条件', '病例服务不可用（<code>500 SAMPLE_SERVICE_UNAVAILABLE</code>）') +
        row('可见形态', '整页错误 banner，带关闭按钮') +
        row('降级', H.rich('已练次数与自评得分来自学情服务；**仅学情服务不可用**时卡片照常展示病例，只把统计数字降级为 `—`，**不整页报错**')) }) +

      /* ── P3 训练工作台（原页内「本页关键状态」卡整块迁入） ── */
      stateGroup('P3', '训练工作台') +
      stateCard({ page: 'P3', title: '首次进入的一次性说明', icon: 'bulb', body:
        row('触发条件', H.rich('**第 1 次**进入任一训练工作台')) +
        row('可见形态', H.rich('三步说明：**阅片 → 分段书写 → 对照自评**，点掉后不再出现')) +
        row('要点', H.rich('在此之前 **T0 首屏只有三视图 + 一句话说明**，不铺开表单')) }) +
      stateCard({ page: 'P3', title: '提示配额用尽', icon: 'lock', body:
        row('触发条件', '本段本回合 L2 / L3 已用满') +
        row('可见形态', H.rich('对应按钮**置灰**，L1 始终可用（体裁提示不泄题）')) +
        row('文案', H.rich('「**本段要点提示已用完，先自己写写看**」——不弹错误、不返回更浅内容（§5.2.3）')) }) +
      stateCard({ page: 'P3', title: '同级提示 10 秒冷却中', icon: 'clock', body:
        row('触发条件', '同一级提示刚用掉一次') +
        row('可见形态', '按钮带倒计时置灰，冷却结束自动恢复') +
        row('口径', H.rich('冷却与配额是**两条独立**闸门，越级请求（L1→L3）同样受约束；服务端记 `coolingUntil`')) }) +
      stateCard({ page: 'P3', title: '提示降级（模型侧失败）', icon: 'warn', body:
        row('触发条件', '提示引擎超时 / 出站红线校验未过') +
        row('可见形态', H.rich('不弹错误：返回降级文案「**暂时无法获取提示**，请稍后重试」（配置级失败）或「**这条提示没生成好，换个说法再试试**」（内容级失败）')) +
        row('配额', H.rich('**预扣的配额自动回滚**，不计入已用次数')) }) +
      stateCard({ page: 'P3', title: '一般信息条缺字段', icon: 'warn', body:
        row('触发条件', '某样本缺字段') +
        row('可见形态', H.rich('缺「检查时间」等**一般信息**：该项仍**计分**（属学员应核对的一般信息）；缺**病灶测量工具 / 增强序列 / 既往片 / 分期依据**等**能力位**：对应条目在 T4 自评表与覆盖清单中标注**"本样本不可评"**')) +
        row('口径', H.rich('乙类落空条目**整体移出分母**（§5.2.2）')) }) +

      /* ── P4 对照自评页（原页内 A / B 双态卡迁入；页面已改单态、可实时切换） ── */
      stateGroup('P4', '对照自评（T4）') +
      stateCard({ page: 'P4', title: '对照区 · 自评未提交', icon: 'lock', body:
        row('触发条件', '进入 T4 且尚未提交自评') +
        row('可见形态', '挡板：锁图标 + 「提交自评后才能查看对照」+「提交自评并解锁对照」按钮') +
        row('口径', H.rich('门禁在**服务端**：校验 `round{n}.selfReview` 已提交，未提交一律拒回对照数据（`409 SELF_REVIEW_REQUIRED`）。前端隐藏**不作为门禁**——否则改请求即可绕过"先自评"')) }) +
      stateCard({ page: 'P4', title: '对照区 · 自评已提交', icon: 'eye', body:
        row('触发条件', H.rich('自评提交后（card-foot 的「撤销提交」按钮可切回上一态）')) +
        row('可见形态', H.rich('双栏对照：左「你的报告」/ 右「参考报告（金标准）」，**绿底** = 参考报告中你未覆盖的内容')) +
        row('口径', H.rich('只下发**当例**金标准（`Cache-Control: no-store`）；训练侧 T4 必定下发，考核侧**默认不下发**，仅当任务配置 `revealGoldStandardAfterSubmit = true` 且已交卷时展示原文（§5.8 / §7.4）')) }) +

      /* ── P5 我的考核任务（原页内「列表状态示例」卡迁入） ── */
      stateGroup('P5', '我的考核任务') +
      stateCard({ page: 'P5', title: '加载中（骨架屏）', icon: 'refresh', body:
        row('触发条件', '进入页面 / 切换筛选') +
        row('可见形态', '2 张骨架卡：标题短条 + 两行正文条（100% / 60%）') }) +
      stateCard({ page: 'P5', title: '空态', icon: 'clipboard-check', body:
        row('触发条件', '管理端尚未发布任务 / 筛选无结果') +
        row('可见形态', '「暂无考核任务」+ 引导语') +
        row('口径', H.rich('任务由管理端在**题库与考核管理**里创建并发布后才出现（P11 / P12）；学员侧**不能自建、不能自选病例**，开放窗口开始后才会显示「领取并作答」')) }) +
      stateCard({ page: 'P5', title: '「评分中」的轮询形态', icon: 'clock', body:
        row('触发条件', '已交卷、评分引擎尚未返回') +
        row('可见形态', H.rich('按钮置灰「评分中…」，**不阻塞**页面：可离开、回来轮询')) +
        row('失败', H.rich('按 `retryMax = 3` 自动重试；3 次仍失败则提示「**成绩稍后由老师核定**」，并允许学员**申请复核**')) }) +
      stateCard({ page: 'P5', title: '计时与自动交卷', icon: 'warn', body:
        row('整卷计时', '切例不停表；锁定只由整卷提交或到时触发') +
        row('单例计时', H.rich('（`perCase`）本例锁定后不可再改')) +
        row('自动交卷', H.rich('倒计时归零 `autoTimeout`；`openTo` 到点且草稿非空 `autoDeadline`——均由服务端兜底')) }) +

      /* ── P6 考核工作台（原页内「本页关键状态」卡整块迁入） ── */
      stateGroup('P6', '考核工作台') +
      stateCard({ page: 'P6', title: '单例锁定（perCase 只读形态）', icon: 'lock', body:
        row('触发条件', H.rich('**只出现在 `perCase` 计时下**：该例到点，或被学员「下一例」带锁')) +
        row('可见形态', H.rich('该例报告段整体转**只读**（锁图标 + 「已锁定只读」），底部记 `锁定时间` 与锁定原因')) +
        row('口径', H.rich('`whole` 模式切例**不锁定**（§5.6.1「切例不改 startedAt」/ §7.2.1「前后切换自由来回」）——本工作台跑的就是 `whole`，故三例都没锁定。锁定是**单向**的：可继续看、可切例，但不能取消（避免"先看参考再改"）；原因只取 `manual` | `timeout` 两值（§5.6.2）')) }) +
      stateCard({ page: 'P6', title: '自动交卷的两种来源', icon: 'clock', body:
        row('① 倒计时归零', H.rich('`autoTimeout`：未锁定的例按**最后保存的草稿**提交，顶部提示「**已自动交卷**」，草稿区转只读。服务端兜底扫描命中后先等 `GRACE = 15s`，宽限期内收到前端自动交卷则以该请求为准')) +
        row('② openTo 到点', H.rich('`autoDeadline`：已领取且草稿**非空** → 自动交卷，不销毁学员成果；若草稿为空则转 `已截止`（`已截止` 只覆盖无卷可结算的学员）')) }) +
      stateCard({ page: 'P6', title: '离线未同步', icon: 'warn', body:
        row('触发条件', '网络中断 / 多端并发写同一例') +
        row('可见形态', H.rich('提示「本机草稿更新，正在同步」；**不阻塞作答**')) +
        row('口径', H.rich('多端并发以**最后一次保存**为准；完全离线时草稿**暂存本机**，恢复后自动同步，**不因离线丢卷**（§5.11）')) }) +

      /* ── P7 评分结果页（原页内「本页关键状态」卡迁入） ── */
      stateGroup('P7', '评分结果页') +
      stateCard({ page: 'P7', title: '评分中', icon: 'clock', body:
        row('触发条件', '已交卷、评分引擎尚未返回') +
        row('可见形态', '转圈 + 「评分进行中」') +
        row('要点', H.rich('**可以离开页面**，回来时自动轮询；轮询不产生副作用')) }) +
      stateCard({ page: 'P7', title: '评分失败', icon: 'warn', body:
        row('触发条件', '评分引擎超时或报错') +
        row('可见形态', H.rich('错误 banner + 「重试评分」按钮；已自动重试时显示 **1 / 3**')) +
        row('兜底', H.rich('3 次仍失败则提示「**成绩稍后由老师核定**」，并保留「申请复核」入口；**不把失败暴露成空白分数**')) }) +

      '';
  }

  w.P8Notes = P8Notes;
})(window);
