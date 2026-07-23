const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5001/#/history-taking?caseId=DERM-20260416-K4G7';
const OUTPUT = 'D:/klord的个人文件夹/02_work - 副本/00_我的工作区/10_虚拟病人产品/55_客户相关/20_东南大学中大医院/信息中心项目/8月8日演示版本设计文件/中大原型图/病史采集模块.png';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('[1/6] 导航到病史采集页面...');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 等待页面渲染 — 开场白气泡出现
  console.log('[2/6] 等待页面加载和开场白...');
  await page.waitForSelector('.bubble-row.sp', { timeout: 10000 });
  // 确保SP开场白已显示
  await page.waitForTimeout(1000);

  // 切换到文本输入模式
  const modeBtn = await page.$('.mode-btn-toggle');
  if (modeBtn) {
    const classes = await modeBtn.getAttribute('class');
    if (classes && classes.includes('voice')) {
      await modeBtn.click();
      await page.waitForTimeout(300);
      console.log('  切换到文本输入模式');
    }
  }

  // 发送对话
  console.log('[3/6] 发送模拟问诊对话...');
  const questions = [
    '医生您好，我皮肤上起了很多红斑，很痒，您帮我看看是怎么回事？',
    '大概有两周了，一开始在手臂上，现在腿上也有了',
    '没有发烧，就是晚上痒得睡不着',
  ];

  for (const q of questions) {
    const input = await page.$('.input-area input[type="text"]');
    if (!input) {
      console.log('  ⚠ 未找到输入框，跳过剩余问题');
      break;
    }
    await input.fill(q);
    await page.waitForTimeout(200);
    const sendBtn = await page.$('.send-btn:not([disabled])');
    if (sendBtn) {
      await sendBtn.click();
      console.log('  发送: ' + q.substring(0, 30) + '...');
      // 等待SP回复出现（新气泡）
      await page.waitForTimeout(4000);
    }
  }

  // 打开病例信息面板
  console.log('[4/6] 打开面板...');
  const floatTrigger = await page.$('.float-info-trigger');
  if (floatTrigger) {
    await floatTrigger.click();
    await page.waitForTimeout(800);
    console.log('  ✓ 病例信息面板已打开');
  }

  // 打开 AI 伴学
  const companionTrigger = await page.$('.companion-trigger');
  if (companionTrigger) {
    await companionTrigger.click();
    await page.waitForTimeout(800);
    console.log('  ✓ AI伴学面板已打开');
  }

  // 切换到专家点评
  const tabs = await page.$$('.panel-tab');
  for (const tab of tabs) {
    const text = await tab.textContent();
    if (text && text.includes('专家点评')) {
      await tab.click();
      await page.waitForTimeout(800);
      console.log('  ✓ 已切换到专家点评');
      break;
    }
  }

  // 缩放 80%
  console.log('[5/6] 设置缩放 80%...');
  await page.evaluate(() => { document.documentElement.style.zoom = '0.8'; });
  await page.waitForTimeout(500);

  // 截图
  console.log('[6/6] 截图...');
  await page.screenshot({ path: OUTPUT, fullPage: false });
  console.log('  ✓ 保存到: ' + OUTPUT);

  await browser.close();
  console.log('完成!');
})();
