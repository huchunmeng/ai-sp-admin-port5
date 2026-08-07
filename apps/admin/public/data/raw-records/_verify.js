const fs = require('fs');
for (const no of ['ZY010101644011','ZY010101523154','ZY010101609402']) {
  const d = JSON.parse(fs.readFileSync(no + '.json', 'utf-8'));
  console.log('\n===== ' + no + ' =====');
  console.log('title:', d.title, '| recordType:', d.recordType, '| patientInfo:', JSON.stringify(d.patientInfo));
  // 打印所有 ## 小节标题
  const heads = d.content.split('\n').filter(l => l.startsWith('## '));
  console.log('小节制数量:', heads.length);
  for (const h of heads) console.log(' ', h);
  // 打印前 25 行看结构
  console.log('--- 开头 25 行 ---');
  console.log(d.content.split('\n').slice(0, 25).join('\n'));
}
