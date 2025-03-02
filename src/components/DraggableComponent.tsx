import React from 'react'
import { Button } from 'antd'
import type { DragEvent } from 'react'

interface DraggableComponentProps {
  type: string
  icon: React.ReactNode
  label: string
}

export const DraggableComponent: React.FC<DraggableComponentProps> = ({
  type,
  icon,
  label
}) => {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    // 设置拖拽数据
    e.dataTransfer.setData('nodeType', type)
    
    // 设置默认属性
    const defaultProperties: any = {
      parentId: null
    }

    // 根据组件类型设置特定的默认属性
    switch (type) {
      case 'excel-export':
        defaultProperties.format = 'excel'
        defaultProperties.sheetName = 'Sheet1'
        defaultProperties.encoding = 'utf-8'
        break
      // ... 其他组件的默认属性 ...
    }

    e.dataTransfer.setData('properties', JSON.stringify(defaultProperties))
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{ cursor: 'move' }}
    >
      <Button
        type="text"
        icon={icon}
        block
        style={{
          height: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span style={{ marginTop: 4, fontSize: 12 }}>{label}</span>
      </Button>
    </div>
  )
} 