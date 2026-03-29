<template>
  <div class="space-y-4" @click.stop>
    <el-form-item label="SMTP 服务器">
      <el-input
        v-model="node.properties.host"
        placeholder="例如: smtp.qq.com"
        @change="handleChange('host')"
      />
    </el-form-item>

    <div class="flex space-x-4">
      <el-form-item label="端口" class="flex-1">
        <el-input-number
          v-model="node.properties.port"
          :min="1"
          :max="65535"
          placeholder="465"
          class="w-full"
          @change="handleChange('port')"
        />
      </el-form-item>

      <el-form-item label="SSL/TLS" class="w-24">
        <el-switch v-model="node.properties.secure" @change="handleChange('secure')" />
      </el-form-item>
    </div>

    <el-form-item label="账号">
      <el-input
        v-model="node.properties.user"
        placeholder="邮箱账号"
        @change="handleChange('user')"
      />
    </el-form-item>

    <el-form-item label="密码/授权码">
      <el-input
        v-model="node.properties.pass"
        type="password"
        show-password
        placeholder="邮箱密码或授权码"
        @change="handleChange('pass')"
      />
    </el-form-item>

    <el-divider />

    <el-form-item label="发件人名称">
      <el-input
        v-model="node.properties.from"
        placeholder="例如: AutoRPA <xxx@qq.com>"
        @change="handleChange('from')"
      />
    </el-form-item>

    <el-form-item label="收件人">
      <el-input
        v-model="node.properties.to"
        placeholder="多个收件人用逗号分隔"
        @change="handleChange('to')"
      />
    </el-form-item>

    <el-form-item label="邮件主题">
      <el-input
        v-model="node.properties.subject"
        placeholder="请输入邮件主题"
        @change="handleChange('subject')"
      />
    </el-form-item>

    <el-form-item label="邮件正文">
      <el-input
        v-model="node.properties.text"
        type="textarea"
        :rows="4"
        placeholder="请输入邮件内容"
        @change="handleChange('text')"
      />
    </el-form-item>

    <div class="pt-2">
      <el-button type="primary" class="w-full" :loading="testing" @click="handleTest">
        发送测试邮件
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { ipcRenderer } from '@/utils/electron'
  import { ElMessage } from 'element-plus'

  const props = defineProps<{
    node: any
  }>()

  const emit = defineEmits(['update'])

  const testing = ref(false)

  // 初始化默认值
  if (!props.node.properties.port) {
    props.node.properties.port = 465
    props.node.properties.secure = true
  }

  const handleChange = (key: string) => {
    emit('update', key, props.node.properties[key])
  }

  const handleTest = async () => {
    const { host, port, secure, user, pass, from, to, subject, text } = props.node.properties

    if (!host || !user || !pass || !to) {
      ElMessage.warning('请填写完整的邮件配置信息')
      return
    }

    testing.value = true
    try {
      // 处理发件人格式
      let fromAddress = from || user
      // 如果发件人只填了名称且没有邮箱格式，且账号是邮箱，则组合成 Name <email> 格式
      if (fromAddress && !fromAddress.includes('@') && user.includes('@')) {
        fromAddress = `${fromAddress} <${user}>`
      }

      const result = await ipcRenderer.invoke('email:send', {
        host,
        port,
        secure,
        user,
        pass,
        from: fromAddress,
        to,
        subject: subject || '测试邮件',
        text: text || '这是一封来自 Auto RPA 的测试邮件。',
      })

      if (result.success) {
        ElMessage.success('测试邮件发送成功')
      } else {
        let errorMessage = result.error
        if (typeof errorMessage === 'string') {
          if (errorMessage.includes('535')) {
            errorMessage =
              '登录失败: 用户名或密码错误 (535)。\n如果您使用 Resend，请确保账号填写为 "resend"。'
          } else if (errorMessage.includes('timeout')) {
            errorMessage = '连接超时: 请检查服务器地址和端口'
          }
        }
        ElMessage.error(errorMessage)
      }
    } catch (error: any) {
      let errorMessage = error.message
      if (errorMessage.includes('535')) {
        errorMessage =
          '登录失败: 用户名或密码错误 (535)。\n如果您使用 Resend，请确保账号填写为 "resend"。'
      }
      ElMessage.error('发送出错: ' + errorMessage)
    } finally {
      testing.value = false
    }
  }
</script>
