/**
 * 中文语音播放测试脚本
 * 用于验证修复后的中文语音播放功能
 * 基于 shenfan19/say.js 的 Windows 10 中文朗读解决方案
 */

// 设置中文编码环境变量
process.env.LANG = 'zh_CN.UTF-8';
process.env.LC_ALL = 'zh_CN.UTF-8';

const say = require('say');

// 测试文本
const testTexts = {
  chinese: '你好，这是一个中文语音测试',
  english: 'Hello, this is an English voice test',
  mixed: 'Hello 你好，这是中英文混合测试'
};

// 中文语音选项
const chineseVoices = [
  'Microsoft Huihui Desktop - Chinese (Simplified, PRC)',
  'Microsoft Yaoyao Desktop - Chinese (Simplified, PRC)', 
  'Microsoft Kangkang Desktop - Chinese (Simplified, PRC)',
  'Microsoft Huihui - Chinese (Simplified, PRC)',
  'Microsoft Yaoyao - Chinese (Simplified, PRC)',
  'Microsoft Kangkang - Chinese (Simplified, PRC)',
  'Chinese (Simplified, PRC) - Huihui',
  'Chinese (Simplified, PRC) - Yaoyao', 
  'Chinese (Simplified, PRC) - Kangkang',
  'zh-CN-HuihuiNeural',
  'zh-CN-YaoyaoNeural',
  'zh-CN-KangkangNeural'
];

// 检测是否为中文文本
function isChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

// 获取最优的语音选项
function getOptimalVoiceOptions(options, text) {
  const isChineseText = isChinese(text);
  
  if (isChineseText) {
    return {
      voice: chineseVoices[0] || undefined,
      speed: options.speed || 1.0
    };
  } else {
    return {
      voice: options.voice,
      speed: options.speed || 1.0
    };
  }
}

// 测试语音播放
async function testVoicePlayback(text, options, attempt = 1) {
  console.log(`\n=== 测试 ${attempt}: ${text} ===`);
  
  try {
    const voiceOptions = getOptimalVoiceOptions(options, text);
    console.log(`使用语音选项:`, voiceOptions);
    
    // 如果是中文文本，尝试多种语音选项
    if (isChinese(text) && attempt > 1) {
      if (chineseVoices[attempt - 1]) {
        voiceOptions.voice = chineseVoices[attempt - 1];
        console.log(`尝试中文语音: ${voiceOptions.voice}`);
      }
    }
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('语音播放超时'));
      }, 10000);
      
      say.speak(text, voiceOptions.voice, voiceOptions.speed, (err) => {
        clearTimeout(timeout);
        if (err) {
          console.error(`语音播放失败:`, err);
          reject(err);
        } else {
          console.log(`语音播放成功`);
          resolve();
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error(`语音播放尝试 ${attempt} 失败:`, error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('开始中文语音播放测试...\n');
  
  // 测试中文语音
  console.log('1. 测试中文语音播放');
  let success = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    success = await testVoicePlayback(testTexts.chinese, { speed: 1.0 }, attempt);
    if (success) break;
    
    if (attempt < 3) {
      console.log('等待2秒后重试...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!success) {
    console.log('尝试使用系统默认语音播放中文...');
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('语音播放超时'));
        }, 10000);
        
        say.speak(testTexts.chinese, undefined, 1.0, (err) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            console.log('使用系统默认语音播放成功');
            resolve();
          }
        });
      });
      success = true;
    } catch (fallbackError) {
      console.error('系统默认语音也失败:', fallbackError.message);
    }
  }
  
  console.log(`\n中文语音测试结果: ${success ? '成功' : '失败'}`);
  
  // 测试英文语音
  console.log('\n2. 测试英文语音播放');
  const englishSuccess = await testVoicePlayback(testTexts.english, { speed: 1.0 });
  console.log(`英文语音测试结果: ${englishSuccess ? '成功' : '失败'}`);
  
  // 测试混合语音
  console.log('\n3. 测试中英文混合语音播放');
  const mixedSuccess = await testVoicePlayback(testTexts.mixed, { speed: 1.0 });
  console.log(`混合语音测试结果: ${mixedSuccess ? '成功' : '失败'}`);
  
  console.log('\n=== 测试完成 ===');
  console.log(`中文语音: ${success ? '✅' : '❌'}`);
  console.log(`英文语音: ${englishSuccess ? '✅' : '❌'}`);
  console.log(`混合语音: ${mixedSuccess ? '✅' : '❌'}`);
}

// 运行测试
runTests().catch(console.error);
