// 测试Playwright是否可以正常启动浏览器
const { chromium } = require('playwright');

(async () => {
  try {
    console.log('启动浏览器...');
    const browser = await chromium.launch();
    console.log('浏览器已启动');
    
    console.log('打开新页面...');
    const page = await browser.newPage();
    
    console.log('访问百度...');
    await page.goto('https://www.baidu.com');
    
    console.log('截图保存...');
    await page.screenshot({ path: 'screenshot.png' });
    
    console.log('关闭浏览器...');
    await browser.close();
    
    console.log('测试完成，Playwright工作正常');
  } catch (error) {
    console.error('发生错误:', error);
    process.exit(1);
  }
})(); 