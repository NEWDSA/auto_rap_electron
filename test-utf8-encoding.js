/**
 * 测试UTF-8编码处理
 * 验证中文文本在语音合成时的编码是否正确
 */

const say = require('say');

// 测试不同编码的中文文本
const testTexts = [
  '你好，世界！',
  '这是一个中文测试',
  'Hello 你好，混合文本测试',
  '测试特殊字符：！@#￥%……&*（）',
  '测试长文本：这是一个很长的中文文本，用来测试语音合成功能是否能正确处理UTF-8编码的中文字符。'
];

// 检查文本编码
function checkTextEncoding(text) {
  console.log(`\n=== 检查文本编码 ===`);
  console.log(`原始文本: ${text}`);
  console.log(`文本长度: ${text.length}`);
  console.log(`字节长度: ${Buffer.from(text, 'utf8').length}`);
  console.log(`编码检查: ${Buffer.from(text, 'utf8').toString('utf8') === text ? 'UTF-8正确' : '编码错误'}`);
  
  // 检查是否包含中文字符
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  console.log(`包含中文: ${hasChinese ? '是' : '否'}`);
  
  return {
    text,
    length: text.length,
    byteLength: Buffer.from(text, 'utf8').length,
    isUtf8: Buffer.from(text, 'utf8').toString('utf8') === text,
    hasChinese
  };
}

// 测试语音播放
async function testVoicePlayback(text) {
  return new Promise((resolve) => {
    console.log(`\n--- 测试语音播放: "${text}" ---`);
    
    const timeout = setTimeout(() => {
      console.log('❌ 语音播放超时');
      resolve(false);
    }, 10000);
    
    say.speak(text, undefined, 1.0, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.log(`❌ 语音播放失败: ${err.message.substring(0, 100)}...`);
        resolve(false);
      } else {
        console.log(`✅ 语音播放成功`);
        resolve(true);
      }
    });
  });
}

// 主测试函数
async function runTests() {
  console.log('=== UTF-8编码测试开始 ===\n');
  
  let successCount = 0;
  let totalCount = testTexts.length;
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    console.log(`\n测试 ${i + 1}/${totalCount}`);
    
    // 检查编码
    const encodingInfo = checkTextEncoding(text);
    
    // 测试语音播放
    const success = await testVoicePlayback(text);
    
    if (success) {
      successCount++;
    }
    
    // 等待语音播放完成
    if (success) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n=== 测试完成 ===`);
  console.log(`成功: ${successCount}/${totalCount}`);
  console.log(`成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
  
  if (successCount === totalCount) {
    console.log('🎉 所有测试通过！UTF-8编码处理正常。');
  } else {
    console.log('⚠️  部分测试失败，请检查系统语音设置。');
  }
}

// 运行测试
runTests().catch(console.error);
