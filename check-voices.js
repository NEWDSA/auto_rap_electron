/**
 * 检查系统可用语音
 * 用于诊断中文语音问题
 */

const say = require('say');

console.log('=== 系统语音检查工具 ===\n');

// 测试文本
const testTexts = [
  'Hello, this is an English test',
  '你好，这是一个中文测试',
  'Hello 你好，这是中英文混合测试'
];

// 测试不同的语音选项
const voiceOptions = [
  { name: 'System Default', voice: undefined },
  { name: 'Microsoft Huihui', voice: 'Microsoft Huihui Desktop - Chinese (Simplified, PRC)' },
  { name: 'Microsoft Yaoyao', voice: 'Microsoft Yaoyao Desktop - Chinese (Simplified, PRC)' },
  { name: 'Microsoft Kangkang', voice: 'Microsoft Kangkang Desktop - Chinese (Simplified, PRC)' }
];

async function testVoice(voiceName, voice, text) {
  return new Promise((resolve) => {
    console.log(`Testing ${voiceName} with text: "${text}"`);
    
    const timeout = setTimeout(() => {
      console.log(`❌ ${voiceName} - Timeout`);
      resolve(false);
    }, 5000);
    
    say.speak(text, voice, 1.0, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.log(`❌ ${voiceName} - Error: ${err.message.substring(0, 100)}...`);
        resolve(false);
      } else {
        console.log(`✅ ${voiceName} - Success`);
        resolve(true);
      }
    });
  });
}

async function runTests() {
  console.log('开始测试系统语音...\n');
  
  for (const text of testTexts) {
    console.log(`\n--- 测试文本: "${text}" ---`);
    
    for (const option of voiceOptions) {
      const success = await testVoice(option.name, option.voice, text);
      
      // 等待语音播放完成
      if (success) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log('\n=== 测试完成 ===');
  console.log('建议：');
  console.log('1. 如果系统默认语音成功，说明中文语音包已正确安装');
  console.log('2. 如果所有语音都失败，请检查Windows语音设置');
  console.log('3. 如果只有特定语音失败，说明该语音包未安装');
}

runTests().catch(console.error);
