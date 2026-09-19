/* P5 我的考核任务 · PRD §5.5 状态全集 / §6.1 路由 /report-writing/exam
   只显示管理端发布的任务；学员不能自选病例。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  function stateCls(t) {
    if (t.state === '已评分') return 'done';
    if (t.state === '评分失败') return 'failed';
    if (t.state === '评分中' || t.state === '作答中' || t.state === '已交卷') return 'warned';
    if (!t.actionable) return 'disabled';
    return '';
  }

  function scoreCls(n) {
    return n >= 80 ? 'good' : n >= 60 ? 'mid' : '';
  }

  /* §5.5.1 ②：scorePolicy ∈ first | highest | latest */
  var POLICY_TXT = { first: '取首次成绩', highest: '取最高分', latest: '取最后一次' };

  function taskCard(t) {
    var scoreBlock = t.score != null
      ? '<div class="ts-score"><div class="tsk">本次成绩</div>' +
          '<div class="tsv ' + scoreCls(t.score) + '">' + t.score + '</div></div>'
      : '';

    var meta = [
      ['例数', t.caseCount + ' 例'],
      ['计时', t.durationMinutes + ' 分钟（' + (t.durationMode === 'whole' ? '整卷计时' : '单例计时') + '）'],
      ['开放时间', t.openFrom + ' — ' + t.openTo],
      ['重考', t.attemptsUsed + ' / ' + t.maxAttempts + ' 次' + (t.attemptsUsed >= t.maxAttempts ? '（已用完）' : '')],
      ['取分', POLICY_TXT[t.scorePolicy] || t.scorePolicy]
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
          '<div class="task-desc">' + H.rich(t.desc) + '</div>' +
          '<div class="task-meta">' + meta + '</div>' +
          (t.reason ? '<div class="tiny" style="margin-top:9px;color:var(--text-tertiary)">' +
            H.icon('info', { size: 11 }) + ' ' + H.esc(t.reason) + '</div>' : '') +
          (t.state === '作答中'
            ? '<div class="tiny mt8" style="color:var(--warning);font-weight:600">' +
              H.icon('clock', { size: 12 }) + ' 作答未提交 · 剩余 ' + fmtSec(t.remainSeconds) +
              '（' + (t.durationMode === 'whole' ? '整卷' : '本例') + '） · 草稿最后保存 ' + H.esc(t.lastSavedAt) +
              (t.lockedCount ? ' · 已锁定 ' + t.lockedCount + ' 例（单例计时）' : '') + '</div>' : '') +
        '</div>' +
        '<div class="task-side">' +
          scoreBlock +
          (t.scoreDetail ? '<div class="ts-reason">' + H.esc(t.scoreDetail) + '</div>' : '') +
          (t.actionable
            ? '<button class="btn ' + (t.state === '待作答' || t.state === '作答中' ? 'primary' : '') + ' sm" type="button" ' +
                'data-act="go" data-page="' + (t.state === '已评分' ? 'p7' : 'p6') + '">' +
                H.icon('next', { size: 13 }) + H.esc(t.actionLabel) + '</button>'
            : '<button class="btn sm" type="button" disabled>' +
                H.esc(t.state === '评分中' ? '评分中…' : t.state === '已交卷' ? '等待评分…' : '不可操作') + '</button>') +
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
          '<div class="page-head-sub">' + H.rich('考核任务由管理端**发布**，病例与例数都不能自选') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag('待作答 ' + todo, 'pending', true) +
          H.tag('作答中 ' + doing, 'doing', true) +
          H.tag('已评分 ' + done, 'scored', true) +
        '</div>' +
      '</div>' +

      '<div class="banner warn">' + H.icon('warn', { size: 15 }) +
        '<span>' + H.rich('考核期内**无训练辅助**：三级提示关闭、覆盖清单不下发、参考报告默认不下发。') + '</span>' +
      '</div>' +

      '<div class="filter-row card" style="padding:12px 18px">' +
        '<div class="filter-item"><label>状态</label>' +
          '<select class="select" data-act="noop"><option>全部状态</option><option>待作答</option><option>作答中</option>' +
          '<option>已交卷</option><option>评分中</option><option>已评分</option><option>评分失败</option>' +
          '<option>已截止</option><option>已撤销</option></select></div>' +
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

    '</div>';
  }

  w.P5ExamTasks = P5ExamTasks;
})(window);
