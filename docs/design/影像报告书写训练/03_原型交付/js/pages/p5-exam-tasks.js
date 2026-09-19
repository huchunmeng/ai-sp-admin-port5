/* P5 我的考核任务 · PRD §5.5 状态全集 / §6.1 路由 /report-writing/exam
   只显示教师派发的任务；学生不能自选病例。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  function stateCls(t) {
    if (t.state === '已评分') return 'done';
    if (t.state === '评分失败') return 'failed';
    if (t.state === '评分中' || t.state === '作答中') return 'warned';
    if (!t.actionable) return 'disabled';
    return '';
  }

  function scoreCls(n) {
    return n >= 80 ? 'good' : n >= 60 ? 'mid' : '';
  }

  function taskCard(t) {
    var scoreBlock = t.score != null
      ? '<div class="ts-score"><div class="tsk">本次成绩</div>' +
          '<div class="tsv ' + scoreCls(t.score) + '">' + t.score + '</div></div>'
      : '';

    var meta = [
      ['例数', t.caseCount + ' 例'],
      ['时长', t.durationMinutes + ' 分钟（' + (t.durationMode === 'whole' ? '整卷' : '单例') + '）'],
      ['开放时间', t.openFrom + ' — ' + t.openTo],
      ['重考', t.attemptsUsed + ' / ' + t.maxAttempts + ' 次'],
      ['取分', t.scorePolicy === 'highest' ? '取最高分' : '取最后一次']
    ].map(function (m) {
      return '<div class="tm"><span class="tm-k">' + m[0] + '</span><span class="tm-v">' + m[1] + '</span></div>';
    }).join('');

    return '' +
      '<div class="task-card ' + stateCls(t) + '">' +
        '<div class="task-accent"></div>' +
        '<div class="task-main">' +
          '<div class="task-head">' +
            '<span class="task-title">' + H.esc(t.title) + '</span>' +
            H.stateTag(t.state) +
            (t.retryUsed != null ? H.tag('已重试 ' + t.retryUsed + ' / ' + t.retryMax + ' 次', 'diff-bad', true) : '') +
            H.tag(t.id, 'plain', true) +
          '</div>' +
          '<div class="task-desc">' + H.esc(t.desc) + '</div>' +
          '<div class="task-meta">' + meta + '</div>' +
          (t.reason ? '<div class="tiny" style="margin-top:9px;color:var(--text-tertiary)">' +
            H.icon('info', { size: 11 }) + ' ' + H.esc(t.reason) + '</div>' : '') +
          (t.state === '作答中'
            ? '<div class="tiny mt8" style="color:var(--warning);font-weight:600">' +
              H.icon('clock', { size: 12 }) + ' 作答未提交 · 剩余 ' + fmtSec(t.remainSeconds) +
              ' · 草稿最后保存 ' + H.esc(t.lastSavedAt) + '</div>' : '') +
        '</div>' +
        '<div class="task-side">' +
          scoreBlock +
          (t.scoreDetail ? '<div class="ts-reason">' + H.esc(t.scoreDetail) + '</div>' : '') +
          (t.actionable
            ? '<button class="btn ' + (t.state === '待作答' || t.state === '作答中' ? 'primary' : '') + ' sm" type="button" ' +
                'data-act="go" data-page="' + (t.state === '已评分' ? 'p7' : 'p6') + '">' +
                H.icon('next', { size: 13 }) + H.esc(t.actionLabel) + '</button>'
            : '<button class="btn sm" type="button" disabled>' + H.esc(t.state === '评分中' ? '评分中…' : '不可操作') + '</button>') +
        '</div>' +
      '</div>';
  }

  function fmtSec(s) {
    if (s == null) return '';
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function P5ExamTasks() {
    var tasks = S.EXAM_TASKS;
    var todo = tasks.filter(function (t) { return t.state === '待作答' && t.actionable; }).length;
    var doing = tasks.filter(function (t) { return t.state === '作答中'; }).length;
    var done = tasks.filter(function (t) { return t.state === '已评分'; }).length;

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon exam">' + H.icon('clipboard-check', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">我的考核任务</div>' +
          '<div class="page-head-sub">' + H.rich('只显示**教师派发**的考核任务；样本由教师组卷，学生**不能自选病例**、不能指定例数') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag('待作答 ' + todo, 'pending', true) +
          H.tag('作答中 ' + doing, 'doing', true) +
          H.tag('已评分 ' + done, 'scored', true) +
        '</div>' +
      '</div>' +

      '<div class="banner warn">' + H.icon('warn', { size: 15 }) +
        '<span>' + H.rich('考核期内**无训练辅助**：三级提示全部关闭、覆盖清单不下发、参考报告不下发。整卷倒计时，单例锁定后不可再改；到点**自动交卷**（`submitType = autoTimeout`）。') + '</span>' +
      '</div>' +

      '<div class="filter-row card" style="padding:12px 18px">' +
        '<div class="filter-item"><label>状态</label>' +
          '<select class="select" data-act="noop"><option>全部状态</option><option>待作答</option><option>作答中</option>' +
          '<option>评分中</option><option>已评分</option><option>评分失败</option><option>已截止</option><option>已撤销</option></select></div>' +
        '<div class="filter-item"><label>开放窗口</label>' +
          '<select class="select" data-act="noop"><option>全部</option><option>进行中</option><option>已结束</option><option>尚未开放</option></select></div>' +
        '<div class="filter-item">' + H.icon('search', { size: 14 }) +
          '<input class="input" type="search" placeholder="搜索任务名称 / 任务编号（ET-…）" data-act="noop"></div>' +
      '</div>' +

      '<div class="group-head">' + H.icon('list', { size: 14 }) +
        '<span>全部任务</span><span class="gh-count">' + tasks.length + ' 项</span></div>' +

      '<div class="task-list">' + tasks.map(taskCard).join('') + '</div>' +

      '<div class="pager">' +
        '<span>共 ' + tasks.length + ' 项 · 每页 20 条</span>' +
        '<span class="pager-btn on">1</span>' +
        '<span class="pager-btn">2</span>' +
        '<span class="pager-btn">' + H.icon('next', { size: 12 }) + '</span>' +
      '</div>' +

      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('refresh', { size: 15 }) +
          '<span>列表状态示例</span>' +
          '<span class="card-tag">加载中 · 空态 · 评分轮询</span>' +
        '</div>' +
        '<div class="card-body">' +

          '<div class="section-title">' + H.icon('refresh', { size: 13 }) +
            '<span>加载中（骨架屏）</span><span class="st-badge">进入页面 / 切筛选</span></div>' +
          '<div class="stack">' +
            [0, 1].map(function () {
              return '<div class="sk-card" style="padding:15px 18px">' +
                '<div class="sk-line w40" style="margin:0 0 12px"></div>' +
                '<div class="sk-line" style="margin:0 0 8px"></div>' +
                '<div class="sk-line w60" style="margin:0"></div></div>';
            }).join('') +
          '</div>' +

          '<div class="divider"></div>' +

          '<div class="section-title">' + H.icon('clipboard-check', { size: 13 }) +
            '<span>空态</span><span class="st-badge">教师尚未派发</span></div>' +
          '<div class="empty">' +
            '<div class="empty-ico">' + H.icon('clipboard-check', { size: 34 }) + '</div>' +
            '<div class="empty-title">暂无考核任务</div>' +
            '<div class="empty-desc">' + H.rich('考核任务由教师在**教师端**创建并派发后才出现在此处。学生侧**不能自建、不能自选样本**；任务开放窗口开始后才会显示「领取并作答」。') + '</div>' +
          '</div>' +

          '<div class="divider"></div>' +

          '<div class="section-title">' + H.icon('clock', { size: 13 }) +
            '<span>「评分中」的轮询形态</span><span class="st-badge">可离开页面</span></div>' +
          '<div class="banner mb0">' + H.icon('clock', { size: 15 }) +
            '<span>' + H.rich('评分中**不阻塞**页面：可离开、回来轮询。评分失败时按 `retryMax = 3` 自动重试；3 次仍失败则提示"**成绩稍后由老师核定**"，并允许学生**申请复核**。') + '</span>' +
          '</div>' +

        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P5ExamTasks = P5ExamTasks;
})(window);
