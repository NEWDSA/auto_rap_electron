/**
 * Web Speech API 测试脚本
 * 用于验证中文语音播放功能
 */

// 测试 Web Speech API 支持
function testWebSpeechSupport() {
  console.log('=== Web Speech API 支持测试 ===')
  
  if ('speechSynthesis' in window) {
    console.log('✅ 浏览器支持语音合成')
    
    // 获取可用语音
    const voices = speechSynthesis.getVoices()
    console.log(`📢 可用语音数量: ${voices.length}`)
    
    // 查找中文语音
    const chineseVoices = voices.filter(voice => 
      voice.lang.startsWith('zh') || 
      voice.name.toLowerCase().includes('chinese') ||
      voice.name.includes('中文')
    )
    
    console.log(`🇨🇳 中文语音数量: ${chineseVoices.length}`)
    
    if (chineseVoices.length > 0) {
      console.log('中文语音列表:')
      chineseVoices.forEach((voice, index) => {
        console.log(`  ${index + 1}. ${voice.name} (${voice.lang}) - ${voice.localService ? '本地' : '在线'}`)
      })
    }
    
    return true
  } else {
    console.log('❌ 浏览器不支持语音合成')
    return false
  }
}

// 测试中文语音播放
async function testChineseSpeech() {
  console.log('\n=== 中文语音播放测试 ===')
  
  const testTexts = [
    '你好，这是中文语音测试',
    '欢迎使用自动化RPA工具',
    '语音合成功能正常工作',
    'Hello 你好，这是中英文混合测试'
  ]
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i]
    console.log(`\n测试 ${i + 1}: ${text}`)
    
    try {
      await new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text)
        
        // 设置语音参数
        utterance.rate = 1.0
        utterance.pitch = 1.0
        utterance.volume = 1.0
        utterance.lang = 'zh-CN'
        
        // 选择中文语音
        const voices = speechSynthesis.getVoices()
        const chineseVoice = voices.find(voice => 
          voice.lang === 'zh-CN' && voice.localService
        )
        
        if (chineseVoice) {
          utterance.voice = chineseVoice
          console.log(`使用语音: ${chineseVoice.name}`)
        } else {
          console.log('使用默认语音')
        }
        
        // 设置事件监听器
        utterance.onstart = () => {
          console.log('🎵 开始播放')
        }
        
        utterance.onend = () => {
          console.log('✅ 播放完成')
          resolve(true)
        }
        
        utterance.onerror = (event) => {
          console.error('❌ 播放失败:', event.error)
          reject(new Error(event.error))
        }
        
        // 开始播放
        speechSynthesis.speak(utterance)
      })
      
      console.log('✅ 测试成功')
      
    } catch (error) {
      console.error('❌ 测试失败:', error.message)
    }
    
    // 等待一段时间再进行下一个测试
    if (i < testTexts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

// 测试语音控制功能
function testSpeechControl() {
  console.log('\n=== 语音控制功能测试 ===')
  
  const utterance = new SpeechSynthesisUtterance('这是一个语音控制测试，包含暂停和恢复功能')
  utterance.rate = 0.8
  utterance.pitch = 1.2
  utterance.volume = 0.9
  utterance.lang = 'zh-CN'
  
  // 开始播放
  speechSynthesis.speak(utterance)
  
  // 2秒后暂停
  setTimeout(() => {
    console.log('⏸️ 暂停播放')
    speechSynthesis.pause()
  }, 2000)
  
  // 4秒后恢复
  setTimeout(() => {
    console.log('▶️ 恢复播放')
    speechSynthesis.resume()
  }, 4000)
  
  // 6秒后停止
  setTimeout(() => {
    console.log('⏹️ 停止播放')
    speechSynthesis.cancel()
  }, 6000)
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始 Web Speech API 测试...\n')
  
  // 等待语音加载
  if (speechSynthesis.getVoices().length === 0) {
    console.log('⏳ 等待语音加载...')
    await new Promise(resolve => {
      speechSynthesis.onvoiceschanged = resolve
      setTimeout(resolve, 3000) // 3秒超时
    })
  }
  
  // 测试支持性
  const isSupported = testWebSpeechSupport()
  
  if (isSupported) {
    // 测试中文语音播放
    await testChineseSpeech()
    
    // 测试语音控制
    testSpeechControl()
    
    console.log('\n🎉 所有测试完成！')
  } else {
    console.log('\n❌ 无法进行语音测试，浏览器不支持语音合成')
  }
}

// 运行测试
runTests().catch(console.error)
