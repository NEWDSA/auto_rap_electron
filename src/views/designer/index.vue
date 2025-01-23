<template>
  <div class="designer-container">
    <!-- 工具栏 -->
    <div class="toolbar bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <!-- 流程名称 -->
          <div class="flex items-center space-x-2">
            <el-icon>
              <Document />
            </el-icon>
            <span class="text-gray-600">流程名称</span>
          </div>
          <el-input v-model="flowName" placeholder="请输入流程名称" class="!w-64" />
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center space-x-4">
          <el-button-group>
            <el-tooltip content="撤销" placement="bottom">
              <el-button type="primary" plain @click="handleUndo" :disabled="!canUndo">
                <el-icon>
                  <ArrowLeft />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="重做" placement="bottom">
              <el-button type="primary" plain @click="handleRedo" :disabled="!canRedo">
                <el-icon>
                  <ArrowRight />
                </el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
          <el-button-group>
            <el-tooltip content="保存流程" placement="bottom">
              <el-button type="primary" @click="handleSave">
                <el-icon>
                  <Document />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="运行" placement="bottom">
              <el-button type="success" @click="handleRun">
                <el-icon>
                  <VideoPlay />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="停止" placement="bottom">
              <el-button type="warning" @click="handleStop">
                <el-icon>
                  <VideoPause />
                </el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
        </div>
      </div>
    </div>

    <!-- 主设计区域 -->
    <div class="flex-1 flex">
      <!-- 左侧组件面板 -->
      <div class="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 overflow-hidden">
        <div class="p-4 border-b dark:border-gray-700">
          <h3 class="text-lg font-medium">组件列表</h3>
        </div>

        <div class="p-2 space-y-2">
          <!-- 基础组件 -->
          <el-collapse v-model="activeCollapse" class="border-0">
            <el-collapse-item name="basic">
              <template #title>
                <div class="flex items-center">
                  <el-icon class="mr-2">
                    <Box />
                  </el-icon>
                  基础组件
                </div>
              </template>
              <div class="space-y-2 p-2">
                <div v-for="node in basicNodes" :key="node.type" class="component-item" draggable="true"
                  @dragstart="handleDragStart($event, node)">
                  <el-icon>
                    <component :is="node.icon" />
                  </el-icon>
                  <span class="ml-2">{{ node.name }}</span>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item name="control">
              <template #title>
                <div class="flex items-center">
                  <el-icon class="mr-2">
                    <Tools />
                  </el-icon>
                  流程控制
                </div>
              </template>
              <div class="space-y-2 p-2">
                <div v-for="node in controlNodes" :key="node.type" class="component-item" draggable="true"
                  @dragstart="handleDragStart($event, node)">
                  <el-icon>
                    <component :is="node.icon" />
                  </el-icon>
                  <span class="ml-2">{{ node.name }}</span>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <!-- 中间画布区域 -->
      <div class="flex-1 bg-gray-50 dark:bg-gray-900 relative">
        <!-- 流程图容器 -->
        <div ref="flowContainer" class="w-full h-full" />

        <!-- 小地图 -->
        <div class="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded shadow-lg">
          <div ref="minimapContainer" class="w-48 h-32" />
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <div class="w-80 bg-white dark:bg-gray-800 border-l dark:border-gray-700 overflow-hidden">
        <div class="p-4 border-b dark:border-gray-700">
          <h3 class="text-lg font-medium">属性设置</h3>
        </div>

        <div class="p-4 overflow-y-auto" style="height: calc(100% - 57px);">
          <template v-if="selectedNode">
            <el-form label-position="top">
              <!-- 基础属性 -->
              <el-form-item label="节点名称">
                <el-input v-model="selectedNode.properties.name" @change="updateNodeName" />
              </el-form-item>

              <!-- 节点描述 -->
              <el-form-item label="节点描述">
                <el-input v-model="selectedNode.properties.description" type="textarea" rows="2"
                  @change="updateNodeProperty('description')" />
              </el-form-item>

              <!-- 动态属性配置 -->
              <component :is="getNodeConfigComponent" v-if="getNodeConfigComponent" :node="selectedNode"
                @update="updateNodeProperty" />
            </el-form>
          </template>
          <template v-else>
            <div class="text-center text-gray-400 dark:text-gray-600">
              <el-icon class="text-4xl mb-2"><Select /></el-icon>
              <p>选择节点查看属性</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, computed, markRaw, nextTick } from 'vue'
import LogicFlow from '@logicflow/core'
import { RectNode, RectNodeModel } from '@logicflow/core'
import { DndPanel, MiniMap, Control, SelectionSelect } from '@logicflow/extension'
import '@logicflow/core/dist/style/index.css'
import '@logicflow/extension/lib/style/index.css'
import { Document, ArrowLeft, ArrowRight, VideoPlay, VideoPause, Box, Tools } from '@element-plus/icons-vue'
import type { NodeConfigComponent, FlowNode, NodeConfig } from '@/types/node-config'
import type { BaseNodeData, BaseEdgeData } from '@/types/node-config'
import { FlowExecutor } from '@/utils/flow-executor'
import { ElMessage } from 'element-plus'

// 导入节点配置组件
import BrowserConfig from '@/components/node-configs/BrowserConfig.vue'
import ClickConfig from '@/components/node-configs/ClickConfig.vue'
import InputConfig from '@/components/node-configs/InputConfig.vue'
import ConditionConfig from '@/components/node-configs/ConditionConfig.vue'
import LoopConfig from '@/components/node-configs/LoopConfig.vue'
import ExtractConfig from '@/components/node-configs/ExtractConfig.vue'
import KeyboardConfig from '@/components/node-configs/KeyboardConfig.vue'
import MouseConfig from '@/components/node-configs/MouseConfig.vue'
import WaitConfig from '@/components/node-configs/WaitConfig.vue'
import ScreenshotConfig from '@/components/node-configs/ScreenshotConfig.vue'

// 类型定义
import type { LogicFlowApi, LogicFlowEvents } from '@/types/node-config'

// 响应式状态
const flowName = ref('')
const activeCollapse = ref(['basic', 'control'])
const selectedNode = ref<FlowNode | null>(null)
const canUndo = ref(false)
const canRedo = ref(false)
const flowContainer = ref<HTMLElement | null>(null)
const minimapContainer = ref<HTMLElement | null>(null)
const lf = ref<InstanceType<typeof LogicFlow> | null>(null)

// 流程执行器实例
const flowExecutor = new FlowExecutor()

const basicNodes: NodeConfig[] = [
  { type: 'start', name: '开始', icon: 'VideoPlay' },
  { type: 'browser', name: '浏览器', icon: 'Monitor' },
  { type: 'extract', name: '提取', icon: 'Search' },
  { type: 'keyboard', name: '键盘', icon: 'EditPen' },
  { type: 'mouse', name: '鼠标', icon: 'Position' },
  { type: 'wait', name: '等待', icon: 'Timer' },
  { type: 'screenshot', name: '截图', icon: 'PictureRounded' },
  { type: 'end', name: '结束', icon: 'VideoPause' }
]

const controlNodes: NodeConfig[] = [
  { type: 'switch', name: '条件', icon: 'SwitchButton' },
  { type: 'loop', name: '循环', icon: 'RefreshRight' }
]

// 获取节点配置组件
const getNodeConfigComponent = computed(() => {
  if (!selectedNode.value) return null

  const componentMap = {
    browser: BrowserConfig,
    click: ClickConfig,
    input: InputConfig,
    switch: ConditionConfig,
    loop: LoopConfig,
    extract: ExtractConfig,
    keyboard: KeyboardConfig,
    mouse: MouseConfig,
    wait: WaitConfig,
    screenshot: ScreenshotConfig
  } as const

  const component = componentMap[selectedNode.value.type as keyof typeof componentMap]
  return component ? markRaw(component) as NodeConfigComponent : null
})

// 添加事件注册方法
const registerEvents = () => {
  if (!lf.value) return

  lf.value.on('element:click', (data: { data: FlowNode }) => {
    selectedNode.value = data.data
  })

  lf.value.on('blank:click', () => {
    selectedNode.value = null
  })

  lf.value.on('history:change', (data: { undoAble: boolean, redoAble: boolean }) => {
    canUndo.value = data.undoAble
    canRedo.value = data.redoAble
  })
}

// 自定义节点基类
class CustomNodeModel extends RectNodeModel {
  initNodeData(data: BaseNodeData) {
    super.initNodeData(data);
    const { properties } = data;
    
    // 设置基础样式
    this.width = 100;
    this.height = 50;
    this.radius = 5;
    this.fill = '#fff';
    this.stroke = '#dcdfe6';
    this.strokeWidth = 1;
    
    // 设置文本
    if (properties?.name) {
      this.text = {
        value: properties.name,
        x: 0,
        y: 0,
        draggable: false,
        editable: false
      };
    }
  }

  getNodeStyle() {
    const style = super.getNodeStyle();
    return {
      ...style,
      fill: this.fill,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth
    };
  }
}

// 自定义节点视图基类
class CustomNode extends RectNode {
  getShape() {
    const { model } = this.props;
    const { width, height, radius, fill, stroke, strokeWidth } = model;
    
    return h('rect', {
      x: -width / 2,
      y: -height / 2,
      width,
      height,
      rx: radius,
      ry: radius,
      fill,
      stroke,
      strokeWidth
    });
  }
}

// 开始节点模型
class StartNodeModel extends CustomNodeModel {
  initNodeData(data: BaseNodeData) {
    super.initNodeData(data);
    
    // 设置开始节点特有样式
    this.width = 80;
    this.height = 40;
    this.radius = 20;
    this.fill = '#e1f3d8';
    this.stroke = '#67c23a';
    this.strokeWidth = 2;
  }
}

// 结束节点模型
class EndNodeModel extends CustomNodeModel {
  initNodeData(data: BaseNodeData) {
    super.initNodeData(data);
    
    // 设置结束节点特有样式
    this.width = 80;
    this.height = 40;
    this.radius = 20;
    this.fill = '#fde2e2';
    this.stroke = '#f56c6c';
    this.strokeWidth = 2;
  }
}

// 修改节点注册方法
const registerNodes = () => {
  if (!lf.value) return;

  try {
    console.log('开始注册节点...');
    
    // 注册开始节点
    lf.value.register({
      type: 'start',
      view: CustomNode,
      model: StartNodeModel
    });
    console.log('注册开始节点完成');

    // 注册结束节点
    lf.value.register({
      type: 'end',
      view: CustomNode,
      model: EndNodeModel
    });
    console.log('注册结束节点完成');

    // 注册其他节点
    const registerNodeConfig = (node: NodeConfig) => {
      // 跳过已注册的开始和结束节点
      if (node.type === 'start' || node.type === 'end') return;
      
      try {
        lf.value?.register({
          type: node.type,
          view: CustomNode,
          model: CustomNodeModel
        });
        console.log(`注册节点完成: ${node.type}`);
      } catch (error) {
        console.error(`注册节点失败: ${node.type}`, error);
      }
    };

    // 注册所有基础节点
    basicNodes.forEach(registerNodeConfig);
    // 注册所有控制节点
    controlNodes.forEach(registerNodeConfig);
  } catch (error) {
    console.error('注册节点失败:', error);
  }
};

// 修改初始化流程方法
const initializeFlow = () => {
  if (!lf.value) return;

  try {
    console.log('开始初始化流程...');
    
    // 创建开始节点
    const startNode = lf.value.addNode({
      type: 'start',
      x: 200,
      y: 200,
      properties: {
        name: '开始流程',
        nodeType: 'start'
      }
    });
    console.log('创建开始节点:', startNode);

    // 创建结束节点
    const endNode = lf.value.addNode({
      type: 'end',
      x: 600,
      y: 200,
      properties: {
        name: '结束流程',
        nodeType: 'end'
      }
    });
    console.log('创建结束节点:', endNode);

    // 连接开始和结束节点
    if (startNode && endNode) {
      const edge = lf.value.addEdge({
        type: 'line',
        sourceNodeId: startNode.id,
        targetNodeId: endNode.id,
        text: '默认连接',
        properties: {}
      });
      console.log('创建连接:', edge);
    }
  } catch (error) {
    console.error('初始化流程失败:', error);
  }
};

// 初始化 LogicFlow
const initLogicFlow = async () => {
  if (!flowContainer.value) return;

  try {
    const logicFlow = new LogicFlow({
      container: flowContainer.value,
      grid: true,
      plugins: [DndPanel, MiniMap, Control, SelectionSelect],
      nodeTextEdit: false,
      edgeTextEdit: false,
      nodeTextDraggable: false,
      edgeTextDraggable: false,
      adjustNodePosition: true,
      snapline: true,
      style: {
        rect: {
          width: 100,
          height: 50,
          radius: 5,
          fill: '#fff',
          stroke: '#dcdfe6',
          strokeWidth: 1
        },
        nodeText: {
          fontSize: 14,
          color: '#333',
          textAlign: 'center',
          textBaseline: 'middle'
        },
        edgeText: {
          fontSize: 12,
          color: '#666',
          background: {
            fill: '#fff'
          }
        }
      }
    });

    lf.value = logicFlow;

    // 注册节点
    registerNodes();

    // 事件监听
    registerEvents();

    // 初始化小地图
    if (minimapContainer.value) {
      lf.value.extension.miniMap.init({
        container: minimapContainer.value,
        width: 192,
        height: 128
      });
    }

    // 渲染
    await nextTick();
    lf.value.render();

    // 初始化开始和结束节点
    initializeFlow();
  } catch (error) {
    console.error('初始化 LogicFlow 失败:', error);
  }
};

// 拖拽开始
const handleDragStart = (event: DragEvent, node: NodeConfig) => {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('nodeType', node.type)
  event.dataTransfer.effectAllowed = 'move'
}

// 更新节点名称
const updateNodeName = () => {
  if (!lf.value || !selectedNode.value) return
  lf.value.setProperties(selectedNode.value.id, {
    ...selectedNode.value.properties
  })
}

// 更新节点属性
const updateNodeProperty = (key: string) => {
  if (!lf.value || !selectedNode.value) return
  lf.value.setProperties(selectedNode.value.id, {
    ...selectedNode.value.properties
  })
}

// 撤销
const handleUndo = () => {
  if (!lf.value) return
  lf.value.undo()
}

// 重做
const handleRedo = () => {
  if (!lf.value) return
  lf.value.redo()
}

// 保存流程
const handleSave = () => {
  if (!lf.value) return
  const data = lf.value.getGraphData()
  console.log('保存流程:', {
    name: flowName.value,
    data
  })
}

// 运行流程
const handleRun = async () => {
  if (!lf.value) return
  try {
    const data = lf.value.getGraphData()
    await flowExecutor.start(data.nodes)
  } catch (error: any) {
    ElMessage.error(`运行出错: ${error.message}`)
  }
}

// 停止流程
const handleStop = async () => {
  await flowExecutor.stop()
}

// 生命周期钩子
onMounted(async () => {
  await nextTick();
  await initLogicFlow();
});

onUnmounted(() => {
  if (lf.value) {
    // lf.value.destroy();
  }
});
</script>

<style lang="postcss" scoped>
.designer-container {
  @apply h-full flex flex-col;
}

.component-item {
  @apply flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors;
}

.custom-node {
  @apply flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-700;
}

:deep(.lf-element-selected) .custom-node {
  @apply ring-2 ring-blue-500;
}

:deep(.el-collapse) {
  @apply border-0;
}

:deep(.el-collapse-item__header) {
  @apply bg-transparent border-0 font-medium;
}

:deep(.el-collapse-item__content) {
  @apply p-0 border-0;
}
</style>