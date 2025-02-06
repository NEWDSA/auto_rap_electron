<template>
  <div class="h-full flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="p-2 flex items-center space-x-2 bg-[#fafafa] bg-opacity-80 backdrop-blur-sm border-b relative z-10">
      <div class="absolute inset-0 bg-grid opacity-10"></div>
      <div class="flex items-center space-x-4 relative">
        <el-button-group>
          <el-button type="primary" @click="handleSave">
            <el-icon><Document /></el-icon>
            保存
          </el-button>
          <el-button 
            type="success" 
            :loading="isRunning" 
            @click="handleRun"
            v-if="!isRunning"
          >
            <el-icon><VideoPlay /></el-icon>
            运行
          </el-button>
          <el-button 
            type="danger" 
            @click="handleStop"
            v-else
          >
            <el-icon><VideoPause /></el-icon>
            停止
          </el-button>
        </el-button-group>

        <el-divider direction="vertical" />

        <!-- 视图控制按钮组 -->
        <!-- <el-button-group>
          <el-button @click="handleZoomOut">
            <el-icon><Remove /></el-icon>
            缩小
          </el-button>
          <el-button @click="handleZoomIn">
            <el-icon><CirclePlus /></el-icon>
            放大
          </el-button>
          <el-button @click="handleFitView">
            <el-icon><FullScreen /></el-icon>
            适应
          </el-button>
          <el-button @click="handleUndo">
            <el-icon><Refresh class="transform rotate-180" /></el-icon>
            上一步
          </el-button>
          <el-button @click="handleRedo">
            <el-icon><Refresh /></el-icon>
            下一步
          </el-button>
        </el-button-group> -->
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="flex-1 flex relative">
      <!-- 左侧工具箱 -->
      <div 
        class="border-r bg-white flex flex-col transition-all duration-300"
        :class="{ 'w-48': !toolsPanelCollapsed, 'w-12': toolsPanelCollapsed }"
      >
        <div class="p-2 border-b flex items-center justify-between">
          <span v-show="!toolsPanelCollapsed" class="text-sm">组件面板</span>
          <el-button type="text" @click="toolsPanelCollapsed = !toolsPanelCollapsed">
            <el-icon>
              <component :is="toolsPanelCollapsed ? 'ArrowRight' : 'ArrowLeft'" />
            </el-icon>
          </el-button>
        </div>
        
        <div class="flex-1 overflow-y-auto" v-show="!toolsPanelCollapsed">
          <div class="p-2">
            <el-collapse v-model="activeCategories">
              <el-collapse-item title="基础组件" name="basic">
                <template #title>
                  <el-icon><Tools /></el-icon>
                  <span>基础组件</span>
                </template>
                <div class="space-y-1">
                  <div
                    v-for="node in basicNodes"
                    :key="node.type"
                    class="component-item p-2 rounded cursor-move hover:bg-gray-100"
                    draggable="true"
                    @dragstart="handleDragStart($event, node)"
                  >
                    <el-icon><component :is="node.icon" /></el-icon>
                    <span class="ml-2">{{ node.name }}</span>
                  </div>
                </div>
              </el-collapse-item>
              
              <el-collapse-item title="控制组件" name="control">
                <template #title>
                  <el-icon><Operation /></el-icon>
                  <span>控制组件</span>
                </template>
                <div class="space-y-1">
                  <div
                    v-for="node in controlNodes"
                    :key="node.type"
                    class="component-item p-2 rounded cursor-move hover:bg-gray-100"
                    draggable="true"
                    @dragstart="handleDragStart($event, node)"
                  >
                    <el-icon><component :is="node.icon" /></el-icon>
                    <span class="ml-2">{{ node.name }}</span>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>

      <!-- 中间画布区域 -->
      <div class="flex-1 flex flex-col">
        <div class="flex-1 relative" ref="container">
          <div ref="flowContainer" class="w-full h-full"></div>
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <div 
        v-if="selectedNode"
        class="border-l bg-white flex flex-col transition-all duration-300"
        :class="{ 'w-64': !propertiesPanelCollapsed, 'w-0': propertiesPanelCollapsed }"
      >
        <div class="p-2 border-b flex items-center justify-between">
          <span class="text-sm">属性设置</span>
          <el-button type="text" @click="selectedNode = null">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4">
          <el-form label-position="top">
            <el-form-item label="节点名称">
              <el-input 
                v-model="selectedNode.properties.name"
                @change="handleNodePropertyChange('name')"
              />
            </el-form-item>

            <component
              v-if="nodeConfigComponent"
              :is="nodeConfigComponent"
              :node="selectedNode"
              @update="handleNodePropertyChange"
            />
          </el-form>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="h-8 border-t flex items-center px-4 bg-gray-50">
      <span class="text-sm text-gray-500">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, computed, markRaw, nextTick } from 'vue'
import LogicFlow, { 
  NodeModel,
  RectNode,
  RectNodeModel,
  CircleNode,
  CircleNodeModel,
  BezierEdge,
  BezierEdgeModel
} from '@logicflow/core'
import { DndPanel, MiniMap, Control, SelectionSelect } from '@logicflow/extension'
import '@logicflow/core/dist/style/index.css'
import '@logicflow/extension/lib/style/index.css'
import { 
  Document, 
  ArrowLeft, 
  ArrowRight, 
  VideoPlay, 
  VideoPause,
  Remove,
  CirclePlus,
  FullScreen,
  CircleClose,
  Close,
  Tools,
  Operation,
  RefreshLeft,
  RefreshRight
} from '@element-plus/icons-vue'
import type { NodeConfigComponent, FlowNode, NodeConfig } from '@/types/node-config'
import type { BaseNodeData, BaseEdgeData } from '@/types/node-config'
import { FlowExecutor } from '@/utils/flow-executor'
import { ElMessage, ElMessageBox } from 'element-plus'

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
const activeCategories = ref(['basic', 'control'])
const selectedNode = ref<FlowNode | null>(null)
const canUndo = ref(false)
const canRedo = ref(false)
const flowContainer = ref<HTMLElement | null>(null)
const minimapContainer = ref<HTMLElement | null>(null)
const lf = ref<InstanceType<typeof LogicFlow> | null>(null)
const toolsPanelCollapsed = ref(false)
const propertiesPanelCollapsed = ref(false)
const isRunning = ref(false)
const statusText = ref('')

// 流程执行器实例
const flowExecutor = new FlowExecutor()

const basicNodes: NodeConfig[] = [
  { type: 'start', name: '开始', icon: 'VideoPlay' },
  { type: 'browser', name: '浏览器', icon: 'Monitor' },
  { type: 'click', name: '点击', icon: 'Pointer' },
  { type: 'input', name: '输入', icon: 'EditPen' },
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
const nodeConfigComponent = computed(() => {
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

  // 添加节点右键菜单事件
  lf.value.on('node:contextmenu', (data: { data: FlowNode, e: MouseEvent }) => {
    // 阻止默认右键菜单
    data.e.preventDefault()
    
    // 如果是开始或结束节点，不允许删除
    if (data.data.type === 'start' || data.data.type === 'end') {
      ElMessage.warning('开始和结束节点不能删除')
      return
    }

    // 显示确认对话框
    ElMessageBox.confirm('确定要删除该节点吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      // 删除节点
      lf.value?.deleteNode(data.data.id)
      selectedNode.value = null
      ElMessage.success('节点已删除')
    }).catch(() => {
      // 取消删除
    })
  })
}

// 自定义普通节点
class CustomNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data);
    this.width = 120;
    this.height = 40;
    this.radius = 4;
    
    // 设置节点文本
    if (typeof data.text === 'string') {
      this.text.value = data.text;
    } else if (data.properties?.name) {
      this.text.value = data.properties.name;
    } else {
      this.text.value = '';
    }
  }

  getNodeStyle() {
    const style = super.getNodeStyle();
    return {
      ...style,
      fill: '#fff',
      stroke: '#409eff',
      strokeWidth: 2
    };
  }
}

class CustomNode extends RectNode {
  getShape() {
    const { model } = this.props;
    const { width, height, radius } = model;
    const style = model.getNodeStyle();
    
    return h('rect', {
      ...style,
      width,
      height,
      x: -width / 2,
      y: -height / 2,
      rx: radius,
      ry: radius
    });
  }
}

// 初始化流程
const initializeFlow = () => {
  if (!lf.value) return;

  try {
    console.log('开始初始化流程...');
    
    // 创建开始节点
    const startNode = lf.value.addNode({
      type: 'start',
      x: 200,
      y: 200,
      text: '开始流程',
      properties: {
        nodeType: 'start'
      }
    });
    console.log('创建开始节点:', startNode);

    // 创建结束节点
    const endNode = lf.value.addNode({
      type: 'end',
      x: 600,
      y: 200,
      text: '结束流程',
      properties: {
        nodeType: 'end'
      }
    });
    console.log('创建结束节点:', endNode);

    // 连接开始和结束节点
    if (startNode && endNode) {
      const edge = lf.value.addEdge({
        type: 'bezier',
        sourceNodeId: startNode.id,
        targetNodeId: endNode.id,
        properties: {}
      });
      console.log('创建连接:', edge);
    }
  } catch (error) {
    console.error('初始化流程失败:', error);
  }
};

// 注册节点
const registerNodes = () => {
  if (!lf.value) return;

  try {
    console.log('开始注册节点...');
    
    // 注册开始节点
    lf.value.register({
      type: 'start',
      view: RectNode,
      model: class StartNodeModel extends RectNodeModel {
        initNodeData(data: any) {
          super.initNodeData(data);
          this.width = 80;
          this.height = 40;
          this.radius = 20;
        }

        getNodeStyle() {
          const style = super.getNodeStyle();
          return {
            ...style,
            fill: '#e1f3d8',
            stroke: '#67c23a',
            strokeWidth: 2
          };
        }
      }
    });

    // 注册结束节点
    lf.value.register({
      type: 'end',
      view: RectNode,
      model: class EndNodeModel extends RectNodeModel {
        initNodeData(data: any) {
          super.initNodeData(data);
          this.width = 80;
          this.height = 40;
          this.radius = 20;
        }

        getNodeStyle() {
          const style = super.getNodeStyle();
          return {
            ...style,
            fill: '#fde2e2',
            stroke: '#f56c6c',
            strokeWidth: 2
          };
        }
      }
    });

    // 注册其他节点
    const registerNodeConfig = (node: NodeConfig) => {
      // 跳过已注册的开始和结束节点
      if (node.type === 'start' || node.type === 'end') return;
      
      try {
        lf.value?.register({
          type: node.type,
          view: RectNode,
          model: class extends RectNodeModel {
            initNodeData(data: any) {
              super.initNodeData(data);
              this.width = 120;
              this.height = 40;
              this.radius = 4;
              
              // 设置节点文本
              if (typeof data.text === 'string') {
                this.text.value = data.text;
              } else if (data.properties?.name) {
                this.text.value = data.properties.name;
              } else {
                this.text.value = '';
              }

              // 初始化浏览器节点的默认属性
              if (node.type === 'browser' && !data.properties) {
                data.properties = {
                  actionType: 'goto',
                  waitForLoad: true,
                  timeout: 30,
                  headless: false,
                  incognito: false,
                  width: 1280,
                  height: 800
                };
              }
            }

            getNodeStyle() {
              const style = super.getNodeStyle();
              return {
                ...style,
                fill: '#fff',
                stroke: '#409eff',
                strokeWidth: 2
              };
            }
          }
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
          radius: 5,
        },
        nodeText: {
          fontSize: 14,
          color: '#333',
          overflowMode: 'autoWrap',
        },
        edgeText: {
          fontSize: 12,
          color: '#666',
          background: {
            fill: '#fff'
          }
        },
        edge: {
          type: 'bezier',
          strokeWidth: 2,
          stroke: '#666',
          hoverStroke: '#1890ff',
          selectedStroke: '#1890ff',
          outlineColor: '#fff',
          outlineStroke: 3,
          edgeAnimation: true
        }
      }
    });

    lf.value = logicFlow;

    // 注册边的类型
    lf.value.register({
      type: 'bezier',
      view: BezierEdge,
      model: BezierEdgeModel
    });

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
  console.log(node,'...handleDragStart...');
  event.dataTransfer.setData('application/json', JSON.stringify(node))
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer || !lf.value) return

  const data = event.dataTransfer.getData('application/json')
  if (!data) return

  const node = JSON.parse(data)
  const { clientX, clientY } = event
  // 获取容器的位置信息
  const rect = flowContainer.value?.getBoundingClientRect()
  if (!rect) return

  // 计算相对于容器的坐标
  const offsetX = clientX - rect.left
  const offsetY = clientY - rect.top

  // 获取画布上的所有边
  const graphData = lf.value.getGraphData()
  const edges = graphData.edges

  // 检查是否在边上拖拽
  const dropOnEdge = edges.find(edge => {
    // 获取源节点和目标节点
    const sourceNode = graphData.nodes.find(n => n.id === edge.sourceNodeId)
    const targetNode = graphData.nodes.find(n => n.id === edge.targetNodeId)
    
    if (!sourceNode || !targetNode) return false

    // 计算点到线段的距离
    const distanceToLine = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
      const A = x - x1
      const B = y - y1
      const C = x2 - x1
      const D = y2 - y1
      const dot = A * C + B * D
      const lenSq = C * C + D * D
      let param = -1
      if (lenSq !== 0) param = dot / lenSq

      let nearestX, nearestY
      if (param < 0) {
        nearestX = x1
        nearestY = y1
      } else if (param > 1) {
        nearestX = x2
        nearestY = y2
      } else {
        nearestX = x1 + param * C
        nearestY = y1 + param * D
      }

      const dx = x - nearestX
      const dy = y - nearestY
      return {
        distance: Math.sqrt(dx * dx + dy * dy),
        x: nearestX,
        y: nearestY
      }
    }

    // 计算拖放点到边的最近点
    const { distance, x: nearestX, y: nearestY } = distanceToLine(
      offsetX,
      offsetY,
      sourceNode.x,
      sourceNode.y,
      targetNode.x,
      targetNode.y
    )

    // 如果距离小于阈值，保存边的信息和最近点
    if (distance < 20) {
      edge.nearestPoint = { x: nearestX, y: nearestY }
      edge.sourceNodeId = sourceNode.id
      edge.targetNodeId = targetNode.id
      return true
    }
    return false
  })

  // 创建节点数据
  const nodeConfig = {
    type: node.type,
    x: dropOnEdge ? dropOnEdge.nearestPoint.x : offsetX,
    y: dropOnEdge ? dropOnEdge.nearestPoint.y : offsetY,
    text: node.name || '',
    properties: {
      name: node.name,
      nodeType: node.type,
      ...(node.type === 'browser' ? {
        actionType: 'goto',
        waitForLoad: true,
        timeout: 30,
        headless: false,
        incognito: false,
        width: 1280,
        height: 800
      } : {})
    }
  }

  if (dropOnEdge) {
    // 在边上拖拽，插入节点并重新连接
    const sourceNodeId = dropOnEdge.sourceNodeId
    const targetNodeId = dropOnEdge.targetNodeId

    // 确保有源节点和目标节点
    if (!sourceNodeId || !targetNodeId) {
      console.error('边数据不完整')
      return
    }

    // 先删除原有的边
    lf.value.deleteEdge(dropOnEdge.id)

    // 添加新节点
    const newNode = lf.value.addNode(nodeConfig)

    // 创建新的连接
    lf.value.addEdge({
      type: 'bezier',
      sourceNodeId: sourceNodeId,
      targetNodeId: newNode.id,
      properties: {}
    })

    lf.value.addEdge({
      type: 'bezier',
      sourceNodeId: newNode.id,
      targetNodeId: targetNodeId,
      properties: {}
    })
  } else {
    // 不在边上拖拽，直接添加节点
    lf.value.addNode(nodeConfig)
  }
}

// 更新节点名称
const updateNodeName = () => {
  if (!lf.value || !selectedNode.value) return
  lf.value.setProperties(selectedNode.value.id, {
    ...selectedNode.value.properties
  })
}

// 更新节点属性
const handleNodePropertyChange = (key: string) => {
  if (!lf.value || !selectedNode.value) return
  
  // 更新节点属性
  lf.value.setProperties(selectedNode.value.id, {
    ...selectedNode.value.properties
  })

  // 如果是名称变更，同时更新节点文本
  if (key === 'name') {
    lf.value.updateText(selectedNode.value.id, selectedNode.value.properties.name)
  }
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

// 视图控制方法
const handleZoomIn = () => {
  if (!lf.value) return
  const zoomInfo = lf.value.getTransform()
  lf.value.setTransform({ ...zoomInfo, scale: zoomInfo.scale * 1.1 })
}

const handleZoomOut = () => {
  if (!lf.value) return
  const zoomInfo = lf.value.getTransform()
  lf.value.setTransform({ ...zoomInfo, scale: zoomInfo.scale * 0.9 })
}

const handleFitView = () => {
  if (!lf.value) return
  lf.value.resetTransform()
  lf.value.focusOn()
}

// 生命周期钩子
onMounted(async () => {
  await nextTick();
  await initLogicFlow();
  if (flowContainer.value) {
    flowContainer.value.addEventListener('dragover', handleDragOver)
    flowContainer.value.addEventListener('drop', handleDrop)
  }
});

onUnmounted(() => {
  if (lf.value) {
    // lf.value.destroy();
  }
  if (flowContainer.value) {
    flowContainer.value.removeEventListener('dragover', handleDragOver)
    flowContainer.value.removeEventListener('drop', handleDrop)
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

.bg-grid {
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 24px 24px;
}
</style>
