import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.resolve(__dirname, '..');

const json = JSON.parse(fs.readFileSync(base + '/docs/评分表与考站配置_完整数据.json', 'utf8'));
const platformScheme = json.schemes.find(s => s.type === 'platform');

const outBase = base + '/docs/scoring-tables';
if (fs.existsSync(outBase)) fs.rmSync(outBase, { recursive: true });
fs.mkdirSync(outBase, { recursive: true });

function scaleItems(items, targetScore) {
  const totalTemplate = items.reduce((s, i) => s + i.maxScore, 0);
  if (totalTemplate === 0) return items.map(i => ({ name: i.name, score: 0 }));
  const factor = targetScore / totalTemplate;
  let results = items.map(i => ({
    name: i.name,
    score: Math.round(i.maxScore * factor * 2) / 2
  }));
  let currentSum = results.reduce((s, i) => s + i.score, 0);
  let diff = Math.round((targetScore - currentSum) * 2) / 2;
  if (diff !== 0) {
    const step = diff > 0 ? 0.5 : -0.5;
    let remaining = Math.abs(diff) / 0.5;
    const indices = results.map((r, i) => i).sort((a, b) => results[b].score - results[a].score);
    for (const idx of indices) {
      if (remaining <= 0) break;
      results[idx].score += step;
      if (results[idx].score < 0) results[idx].score = 0;
      remaining--;
    }
  }
  return results;
}

let totalFiles = 0;
const mdIndex = [];

mdIndex.push('# 评分表文件索引');
mdIndex.push('');
mdIndex.push('> 按专业分文件夹，每个文件对应一个考站，包含「评分表」和「评分说明」两个Sheet。');
mdIndex.push('');

for (const major of platformScheme.majors) {
  const specialty = major.name;
  if (!major.stations || major.stations.length === 0) continue;

  const specialtyDir = path.join(outBase, specialty);
  fs.mkdirSync(specialtyDir, { recursive: true });

  mdIndex.push('## ' + specialty);
  mdIndex.push('');
  mdIndex.push('| 文件名 | 考站 | 时长 | 总分 | 考核项目 |');
  mdIndex.push('|--------|------|------|------|----------|');

  for (const station of major.stations) {
    const totalScore = station.projects.reduce((s, p) => s + p.score, 0);
    const projStr = station.projects.map(p => p.name + '(' + p.score + '分)').join(' + ');
    const fileName = specialty + '-' + station.name + '.xlsx';

    mdIndex.push('| ' + fileName + ' | ' + station.name + ' | ' + station.duration + 'min | ' + totalScore + '分 | ' + projStr + ' |');

    const wb = XLSX.utils.book_new();

    // ===== Build scoring table grouped by scoreTable (template), not by project =====
    // A template may cover multiple projects — items listed once per template
    const formRows = [];
    formRows.push([specialty + ' — ' + station.name + '评分表']);
    formRows.push(['考核项目', '评分项', '分值']);

    const itemDetails = []; // for Sheet 2

    for (const st of (station.scoreTables || [])) {
      const tpl = json.scoreTemplates[st.templateCode];
      if (!tpl) continue;

      // Find all projects bound to this template
      const boundProjects = station.projects.filter(p => (st.bindProjects || []).includes(p.name));
      if (boundProjects.length === 0) continue;

      // Combined project name and score
      const combinedName = boundProjects.map(p => p.name).join(' + ');
      const combinedScore = boundProjects.reduce((s, p) => s + p.score, 0);

      // Iterate template categories in order
      for (const cat of tpl.categories) {
        const catTemplateTotal = cat.items.reduce((s, i) => s + i.maxScore, 0);
        const tplTotal = tpl.categories.reduce((s, c) => s + c.items.reduce((s2, i) => s2 + i.maxScore, 0), 0);
        const catTargetScore = (catTemplateTotal / tplTotal) * combinedScore;
        const scaledItems = scaleItems(cat.items, catTargetScore);

        for (const item of scaledItems) {
          formRows.push([combinedName + ' — ' + cat.name, item.name, item.score]);
        }

        itemDetails.push({
          projectName: combinedName,
          projectScore: combinedScore,
          category: cat.name,
          categoryScore: Math.round(catTargetScore * 10) / 10,
          items: scaledItems,
          grading: cat.grading
        });
      }
    }

    formRows.push([]);
    formRows.push(['合计', '', totalScore]);

    const ws1 = XLSX.utils.aoa_to_sheet(formRows);
    ws1['!cols'] = [{wch:32},{wch:50},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws1, '评分表');

    // ===== Sheet 2: 评分说明 =====
    const descRows = [];
    descRows.push([specialty + ' — ' + station.name + '评分说明']);
    descRows.push(['时长：' + station.duration + '分钟 | 总分：' + totalScore + '分']);
    descRows.push([]);
    descRows.push(['一、考站概述']);
    descRows.push(['本考站考核内容：' + station.projects.map(p => p.name).join(' + ') + '。']);
    descRows.push([]);
    descRows.push(['二、考核项目及评分标准']);
    descRows.push([]);

    let projIdx = 0;
    const seenProjects = new Set();
    for (const detail of itemDetails) {
      if (!seenProjects.has(detail.projectName)) {
        seenProjects.add(detail.projectName);
        projIdx++;
        descRows.push(['项目' + projIdx + '：' + detail.projectName + '（满分' + detail.projectScore + '分）']);
        descRows.push([]);
      }

      descRows.push(['  分类：' + detail.category + '（本类' + detail.categoryScore.toFixed(1) + '分）']);
      descRows.push(['  评分项', '分值', '评分要点']);
      for (const item of detail.items) {
        descRows.push(['  ' + item.name, item.score + '分', '考察' + item.name + '的掌握程度与规范性']);
      }
      descRows.push([]);

      const g = detail.grading;
      descRows.push(['  评分等级：']);
      descRows.push(['  ' + g.excellent.label + '（' + (g.scores ? g.scores.excellent : '—') + '分）：' + g.excellent.description]);
      descRows.push(['  ' + g.good.label + '（' + (g.scores ? g.scores.good : '—') + '分）：' + g.good.description]);
      descRows.push(['  ' + g.pass.label + '（' + (g.scores ? g.scores.pass : '—') + '分）：' + g.pass.description]);
      descRows.push(['  ' + g.fail.label + '（' + (g.scores ? g.scores.fail : '—') + '分）：' + g.fail.description]);
      descRows.push([]);
    }

    descRows.push(['三、总评等级参考']);
    descRows.push(['等级', '标准', '得分范围']);
    descRows.push(['优秀', '完全符合评分标准', Math.round(totalScore * 0.9) + '~' + totalScore + '分']);
    descRows.push(['良好', '大部分符合，存在1-2处小缺陷', Math.round(totalScore * 0.75) + '~' + Math.round(totalScore * 0.89) + '分']);
    descRows.push(['合格', '基本符合，存在3-4处缺陷', Math.round(totalScore * 0.6) + '~' + Math.round(totalScore * 0.74) + '分']);
    descRows.push(['不合格', '重大遗漏或原则性错误', '0~' + Math.round(totalScore * 0.59) + '分']);

    const ws2 = XLSX.utils.aoa_to_sheet(descRows);
    ws2['!cols'] = [{wch:50},{wch:10},{wch:60}];
    XLSX.utils.book_append_sheet(wb, ws2, '评分说明');

    const filePath = path.join(specialtyDir, fileName);
    XLSX.writeFile(wb, filePath);
    totalFiles++;
  }

  mdIndex.push('');
}

fs.writeFileSync(base + '/docs/scoring-tables/索引.md', mdIndex.join('\n'), 'utf8');
console.log('Done: ' + totalFiles + ' files');
