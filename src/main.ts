import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import 'element-plus/dist/index.css'
import './styles/tailwind.css'
import './styles/index.css'
import { initializeIpcHandlers } from './utils/ipcHandlers'
import { nodeManager } from './utils/node-manager'
import { licenseService } from './services/license-service'
import { vLicense, vFeature } from './directives/license'

// 初始化IPC处理程序
initializeIpcHandlers()

// 初始化许可证服务 - 暂时注释掉
// licenseService.initializeLicense().then(() => {
//   console.log('🔑 许可证服务初始化完成')
// }).catch(error => {
//   console.error('❌ 许可证服务初始化失败:', error)
// })

// 初始化节点管理器
nodeManager.initialize().then(() => {
  console.log('🚀 节点管理器初始化完成')
}).catch(error => {
  console.error('❌ 节点管理器初始化失败:', error)
})

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 注册许可证指令
app.directive('license', vLicense)
app.directive('feature', vFeature)

app.mount('#app')