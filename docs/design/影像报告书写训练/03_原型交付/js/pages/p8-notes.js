/* P8 评审说明页（非产品界面）—— 交付范围、形态与视觉、编辑模式用法、
   按样本现算的 scoreableMax 演示、发布门禁演示、已知边界、待拍板决策。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

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

  function P8Notes() {
    var gateOk = S.SELECTION_DEMO.filter(function (d) { return d.scoreableMax >= 85; }).length;
    var gateBad = S.SELECTION_DEMO.length - gateOk;

    return '<div class="content-inner">' +
      '<div class="doc-body">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('doc', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">原型评审说明</div>' +
          '<div class="page-head-sub">' + H.rich('本页**不是产品界面**，是给评审看的交付说明：范围、形态、验证口径、以及需要在串讲时拍板的点') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' + H.tag('Step 4 交付物', 'info', true) + '</div>' +
      '</div>' +

      '<h3>一、这是第几步的什么产物</h3>' +
      '<p>' + H.rich('AI-PM 七步流程的 **Step 4（原型生成）**：Step 1 需求结构化 → Step 2 逻辑完备性审计（69 → **89** / 100）→ Step 3 PRD 质量审查（🔴 严重缺失 5 → **0**）→ **Step 4 本原型** → Step 5 同步校验 → Step 6 自检 → Step 7 交付。') + '</p>' +
      '<p>' + H.rich('PRD 依据：`../02_PRD过程稿/PRD_定稿版.md`（1747 行，含第四轮进原型前复核）。原型与 PRD 的对应关系见每页右侧**需求面板**的三节（①功能详情 / ②状态流转 / ③异常与边界），每节末尾标注 PRD § 号。') + '</p>' +

      '<h3>二、交付范围</h3>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:56px">页</th><th style="width:180px">页面</th><th>PRD 路由 / 位置</th><th style="width:210px">对应 PRD 章节</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>P1</td><td>模块首页（双入口）</td><td><code>/report-writing</code></td><td>§6.1 路由 · §1.5 边界</td></tr>' +
          '<tr><td>P2</td><td>训练样本列表</td><td><code>/report-writing/samples</code></td><td>§5.3 卡片字段 · §5.2.1 继续上次</td></tr>' +
          '<tr><td>P3</td><td>训练工作台 T0–T4</td><td><code>/report-writing/samples/:id</code></td><td>§5.2 训练流程 · §5.4 报告输入 · §5.7 提示</td></tr>' +
          '<tr><td>P4</td><td>对照自评页（T4）</td><td><code>…/:id/self-review</code></td><td>§5.2.4 自评 · §5.8 下发门禁</td></tr>' +
          '<tr><td>P5</td><td>我的考核任务</td><td><code>/report-writing/exam</code></td><td>§5.5 状态全集 · §5.5.1 组卷</td></tr>' +
          '<tr><td>P6</td><td>考核工作台</td><td><code>/report-writing/exam/:taskId</code></td><td>§5.6 整卷作答 · §5.8 考核期限制</td></tr>' +
          '<tr><td>P7</td><td>评分结果页</td><td><code>…/:taskId/result</code></td><td>§6.4 线框 · §5.5.1 折算与双存</td></tr>' +
          '<tr><td>P8</td><td>评审说明（本页）</td><td>—（非产品界面）</td><td>交付说明，非 PRD §</td></tr>' +
        '</tbody>' +
      '</table>' +
      '<p style="color:var(--text-secondary)">' + H.rich('**教师端界面不在范围内**：创建考试 / 组卷 / 派发 / 成绩汇总均为教师端界面，本期不做。本原型只在 P8 演示 `scoreableMax` 与发布下限这两个契约点。') + '</p>' +

      '<h3>三、形态与视觉</h3>' +
      '<ul>' +
        '<li><b>不套预设，仿训练端实现</b>：设计令牌逐条对齐 <code>apps/training/src/styles/variables.css</code>（<code>--primary: #2563eb</code>、<code>--card-radius: 12px</code>、<code>--header-height: 60px</code> 等），顶栏版式仿 <code>TrainingLayout.vue</code>。</li>' +
        '<li><b>一屏单壳 + 侧栏菜单</b>：' + H.rich('左侧为**原型专用**的页面切换栏（不是产品界面的一部分）；右侧为需求面板；中间是内容区。') + '</li>' +
        '<li><b>文件拆分，<code>file://</code> 双击可用</b>：<code>css/</code> 4 个 + <code>js/</code> 若干，普通 <code>&lt;script src&gt;</code>；<b>不用 ESM import、不 fetch JSON</b>（file:// 下 origin 为 null 会被 CORS 拦），数据统一挂 <code>window.SEED</code>。</li>' +
        '<li><b>图标走内联 SVG</b>（<code>js/icons.js</code>），不走 CDN 字体，保证离线可用。</li>' +
        '<li><b>各页工厂在 try/catch 内执行</b>，DOM 查询限本页 root —— 单页报错只死自己，不影响其他页。</li>' +
        '<li><b>影像为占位</b>（斑马纹 + 十字线），真实样本待院方提供（Q2）。</li>' +
      '</ul>' +

      '<h3>四、串讲编辑模式怎么用</h3>' +
      '<ul>' +
        '<li>点顶栏 <b>编辑模式</b> → ' + H.rich('内容区与右侧需求面板里**带虚线框的文案可直接改写**（标题、说明条、卡片注释、PRD 引用均为可编辑锚点）。') + '</li>' +
        '<li>改动写入 <code>localStorage</code>：<code>hi-fi-prototype:report-writing:draft</code>，刷新不丢。</li>' +
        '<li><b>导出全部</b> → 下载 <code>prototype-config.json</code>（改动清单）与 <code>prd-change-suggestions.md</code>（按页归拢的 PRD 修改建议）；<b>恢复默认</b> → 清空草稿。</li>' +
        '<li>草稿超过 <b>30 天</b> 时，打开会先询问是否继续套用，避免用过期口径串讲。</li>' +
      '</ul>' +

      '<h3>五、按样本现算的 <code>scoreableMax</code>（§5.5.1）</h3>' +
      '<p>' + H.rich('能力位**随样本入库声明**，`scoreableMax` 是**派生字段**、**不展示给学生**。下表由本页**现场计算**（改 `js/seed.js` 的能力位即可看到结果变化）：') + '</p>' +
      demoTable() +
      '<p style="color:var(--text-secondary)">' + H.rich('被移出分母的条目共四类：<code>FIND-04</code>（测量工具）、<code>IMP-08</code>（既往片）、<code>FIND-06</code>（增强序列）、<code>IMP-05</code>（肿瘤分期依据）。') + '</p>' +

      '<h3>六、发布下限 85 的门禁演示</h3>' +
      '<p>' + H.rich('本期 <b>' + S.SELECTION_DEMO.length + '</b> 个样本里，<b style="color:#047857">' + gateOk + '</b> 个可评分 ≥ 85、<b style="color:#b91c1c">' + gateBad + '</b> 个低于下限。') + '</p>' +
      '<div style="background:var(--error-light);border:1px solid var(--error-border);border-radius:10px;padding:12px 15px;margin:10px 0">' +
        '<div style="font-weight:700;color:#b91c1c;margin-bottom:6px">' +
          H.icon('warn', { size: 14 }) + ' 四类条目同时落空 → 可评分 84 &lt; 85 → 拒绝发布</div>' +
        '<div style="font-size:12.5px;line-height:1.85;color:#7f1d1d">' +
          '100 − 4 − 4 − 4 − 4 = <b class="mono">84</b>。' +
          H.rich(' **甲类「GEN-02」是部分不可评**（检查号/影像号保留后 4 位仍可评），该条**整体仍计入分母**——这正是 84 这个数不含它的原因。') +
        '</div>' +
      '</div>' +
      '<p style="color:var(--text-secondary)">' + H.rich('门禁落点是**教师端组卷**：`scoreableMax < 85` 的组合不可发布（界面本期不做，仅约定契约）。归一代价是"考一张更短的卷"——分布右移、区分度下降、**跨卷不可比**，这一点写进了送审清单决策 5。') + '</p>' +

      '<h3>七、已知边界与原型自限</h3>' +
      '<table class="doc-table">' +
        '<thead><tr><th style="width:150px">项</th><th>说明</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>影像本体</td><td>占位（斑马纹 + 十字线）。真实样本待院方提供（Q2）；测量 / 调窗 / MPR 归影像教学底座（Q9）</td></tr>' +
          '<tr><td>三视图联动</td><td><b>互不联动</b>——各自独立翻层，不做层面定位联动（联动属 MPR，归底座）</td></tr>' +
          '<tr><td>教师端界面</td><td>创建考试 / 组卷 / 派发 / 成绩汇总<b>本期不做</b>；本原型仅演示 <code>scoreableMax</code> 与发布门禁两个契约点</td></tr>' +
          '<tr><td>模型输出</td><td>提示引擎与评分引擎的输出为<b>静态示例文本</b>；真实内容由服务端模型产出并过红线校验（§9.5）</td></tr>' +
          '<tr><td>计时与幂等</td><td>原型只呈现 UI 态，<b>不做真实倒计时执行</b>；服务端契约见 §5.6.1 / §5.6.2</td></tr>' +
          '<tr><td>移动端</td><td><b>不做移动端适配</b>，也不上 App 训练端（§1.5）</td></tr>' +
          '<tr><td>交互深度</td><td>本原型可"点"的地方<b>只为演示状态切换</b>（自评打标、切例、配额消耗、弹窗），不做真实业务写入</td></tr>' +
        '</tbody>' +
      '</table>' +

      '<h3>八、待拍板的 5 项决策（详见送审清单）</h3>' +
      '<ol>' +
        '<li><b>★最重要</b>：脱敏病例怎么评分？全掩字段归一折算是否可接受；是否需与院方对齐。</li>' +
        '<li>训练流程的组织形态：五阶段是否太碎；配额数字（L2 = 3 / 回合、L3 = 1 / 回合）是否合适。</li>' +
        '<li>对需求 <b>E2-7 的有条件偏离</b>：<code>revealGoldStandardAfterSubmit</code> 是否同意、是否回写需求确认单。</li>' +
        '<li>考核派发<b>依赖教师端</b>排期：能否对齐；不能则本期先只交付训练侧？</li>' +
        '<li><b>★第四轮新增</b>：R1 表 4 条（16 分）本期评不了怎么办？可评分不满 100 的卷子照发是否接受；是否争取影像底座同期交付测量工具。</li>' +
      '</ol>' +
      '<p style="color:var(--text-secondary)">' +
        '附带材料：<code>../送审_待拍板清单_20260919.md</code>（决策 5 / 提醒 3 / 问院方 10）、' +
        '<code>../问询单_待院方确认_20260919.md</code>。' +
      '</p>' +

      '</div>' +
    '</div>';
  }

  w.P8Notes = P8Notes;
})(window);
