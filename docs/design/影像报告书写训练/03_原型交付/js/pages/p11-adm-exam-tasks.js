/* P11 考核任务管理（管理端）· PRD §5.13.6 发布后的管理与撤销 / §5.14.1 三层下钻入口
   §6.1 路由 /imaging-exams。管理端看的是"任务"，学员端 P5 看的是"我的任务"——同源不同视角。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  var POLICY_TXT = { first: '取首次成绩', highest: '取最高分', latest: '取最后一次' };

  function progressCell(t) {
    var p = t.progress;
    var rate = p.assigned ? Math.round(p.submitted / p.assigned * 100) : 0;
    return '<div style="min-width:150px">' +
      '<div class="tiny mono">' + p.claimed + ' / ' + p.assigned + ' 已领取 · ' + p.submitted + ' 已交卷' +
        (p.scoreFailed ? ' · <span style="color:#b91c1c">' + p.scoreFailed + ' 评分失败</span>' : '') + '</div>' +
      '<div class="adm-loss-bar" style="width:100%;margin-top:5px">' +
        '<i class="' + (rate >= 90 ? '' : 'low') + '" style="width:' + rate + '%"></i></div>' +
    '</div>';
  }

  function gateCell(t) {
    var cls = t.scoreableMax >= 95 ? 'ok' : t.scoreableMax >= 85 ? 'mid' : 'bad';
    return '<div style="text-align:right">' +
      '<span class="adm-scoreable ' + cls + '">' + t.scoreableMax +
        '<span class="adm-scoreable-den">/100</span></span>' +
      (t.gateOk ? '' : '<div class="tiny" style="color:#b91c1c">已覆盖门禁</div>') +
    '</div>';
  }

  function refsCell(t) {
    return '<div class="tiny mono" style="line-height:1.7">' + t.caseRefs.map(function (r) {
      return H.esc(r.caseId) + ' <span class="muted">v' + r.version + '</span> <span class="muted">· ' + r.weight + '%</span>';
    }).join('<br>') + '</div>';
  }

  function taskRow(t) {
    return '' +
      '<tr>' +
        '<td class="mono" style="white-space:nowrap">' + H.esc(t.id) + '</td>' +
        '<td>' + H.esc(t.title) +
          '<div class="tiny muted">' + H.rich('计时 ' + t.durationMinutes + ' 分钟 · ' +
            (t.durationMode === 'whole' ? '整卷计时' : '单例计时') + ' · ' + (POLICY_TXT[t.scorePolicy] || t.scorePolicy) +
            ' · 重考上限 ' + t.maxAttempts + ' 次') + '</div>' +
          (t.overrideGate && t.overrideGate.used
            ? '<div class="tiny" style="margin-top:5px;color:#b45309">' + H.icon('warn', { size: 11 }) +
                ' 本次发布覆盖了门禁（发布时可评分 ' + t.overrideGate.scoreableMax + ' &lt; 85）</div>'
            : '') +
          (t.revokeNote ? '<div class="tiny muted" style="margin-top:5px">' + H.rich('撤销说明：' + t.revokeNote) + '</div>' : '') +
        '</td>' +
        '<td>' + H.stateTag(t.state) +
          '<div class="tiny muted" style="margin-top:4px">' + H.esc(t.publishedAt) + ' 发布</div></td>' +
        '<td>' + t.caseCount + ' 例</td>' +
        '<td>' + refsCell(t) + '</td>' +
        '<td>' + gateCell(t) + '</td>' +
        '<td>' + H.esc(t.assignee.label) +
          '<div class="tiny muted">' + (t.assignee.type === 'class' ? '按班级' : '指定学员') +
            ' · 共 ' + t.assignee.count + ' 人</div></td>' +
        '<td>' + progressCell(t) + '</td>' +
        '<td style="white-space:nowrap">' +
          (t.state === '已撤销' || t.state === '评分失败'
            ? '<button class="btn sm" type="button" disabled>成绩汇总</button>'
            : '<button class="btn sm" type="button" data-act="adm-open-task" data-id="' + H.esc(t.id) + '">' +
                H.icon('chart', { size: 12 }) + '成绩汇总</button>') +
          (t.state === '待作答' || t.state === '作答中'
            ? ' <button class="btn sm" type="button" data-act="adm-revoke" data-id="' + H.esc(t.id) + '">' +
                H.icon('ban', { size: 12 }) + '撤销</button>'
            : '') +
        '</td>' +
      '</tr>';
  }

  function P11AdmExamTasks() {
    var tasks = S.ADM_TASKS;
    var live = tasks.filter(function (t) { return t.state === '待作答' || t.state === '作答中'; }).length;
    var scored = tasks.filter(function (t) { return t.state === '已评分'; }).length;
    var revoked = tasks.filter(function (t) { return t.state === '已撤销'; }).length;
    var overrode = tasks.filter(function (t) { return t.overrideGate && t.overrideGate.used; });

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('clipboard-check', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">考核任务管理</div>' +
          '<div class="page-head-sub">' + H.rich('组卷、发布、撤销与成绩汇总的入口') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag('进行中 ' + live, 'doing', true) +
          H.tag('已评分 ' + scored, 'scored', true) +
          H.tag('已撤销 ' + revoked, 'revoked', true) +
          '<button class="btn primary sm" type="button" data-act="go" data-page="p12">' +
            H.icon('plus', { size: 13 }) + '新建考核任务</button>' +
        '</div>' +
      '</div>' +

      (overrode.length ? '<div class="banner warn">' + H.icon('warn', { size: 15 }) +
        '<span>' + H.rich('有 **' + overrode.length + ' 个任务**是**覆盖发布门禁**发出去的（' + overrode[0].id + '，可评分 ' +
          overrode[0].scoreableMax + ' &lt; 85）。这些卷的**成绩跨卷不可比**，成绩单上已标注"本卷含不可评条目"；' +
          '发布原因与操作人写进了审计。') + '</span></div>' : '') +

      '<div class="card mt16">' +
        '<div class="adm-bar">' +
          '<div class="filter-item"><label>状态</label>' +
            '<select class="select" data-act="noop"><option>全部状态</option><option>待作答</option><option>作答中</option>' +
              '<option>已评分</option><option>评分失败</option><option>已撤销</option></select></div>' +
          '<div class="filter-item"><label>考核对象</label>' +
            '<select class="select" data-act="noop"><option>全部</option><option>按班级</option><option>指定学员</option></select></div>' +
          '<div class="filter-item"><label>可评分</label>' +
            '<select class="select" data-act="noop"><option>全部</option><option>≥ 95</option>' +
              '<option>85 – 94</option><option>&lt; 85（覆盖门禁）</option></select></div>' +
          '<div class="filter-item">' + H.icon('search', { size: 14 }) +
            '<input class="input" type="search" placeholder="搜索任务名称 / 编号（AT-…）" data-act="noop"></div>' +
          '<div class="adm-bar-right"><span class="adm-count">共 <b>' + tasks.length + '</b> 个任务</span></div>' +
        '</div>' +

        '<div style="overflow-x:auto;padding:0 4px 4px">' +
          '<table class="table table-compact">' +
            '<thead><tr>' +
              '<th style="width:110px">任务编号</th>' +
              '<th style="width:250px">任务</th>' +
              '<th style="width:110px">状态</th>' +
              '<th style="width:56px">例数</th>' +
              '<th style="width:150px">卷内病例（锁版本 · 权重）</th>' +
              '<th style="width:96px">整卷可评分</th>' +
              '<th style="width:170px">考核对象</th>' +
              '<th style="width:160px">进度</th>' +
              '<th>操作</th>' +
            '</tr></thead>' +
            '<tbody>' + tasks.map(taskRow).join('') + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P11AdmExamTasks = P11AdmExamTasks;
})(window);
