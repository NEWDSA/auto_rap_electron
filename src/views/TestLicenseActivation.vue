<template>
  <div class="test-page">
    <LicenseGuard>
      <div class="main-content">
        <h1 class="text-3xl font-bold text-center mb-8">Auto RAP Electron</h1>
        <div class="content-area">
          <h2 class="text-xl font-semibold mb-4">应用主界面</h2>
          <p class="text-gray-600 mb-4">恭喜！您已成功激活许可证，现在可以使用应用的所有功能。</p>

          <div class="feature-grid">
            <div class="feature-card">
              <h3 class="font-medium mb-2">基础自动化</h3>
              <p class="text-sm text-gray-500">录制和回放基础操作</p>
            </div>
            <div class="feature-card">
              <h3 class="font-medium mb-2">高级节点</h3>
              <p class="text-sm text-gray-500">使用高级自动化节点</p>
            </div>
            <div class="feature-card">
              <h3 class="font-medium mb-2">云端同步</h3>
              <p class="text-sm text-gray-500">同步数据到云端</p>
            </div>
            <div class="feature-card">
              <h3 class="font-medium mb-2">邮件支持</h3>
              <p class="text-sm text-gray-500">邮件自动化功能</p>
            </div>
          </div>

          <div class="mt-8">
            <LicenseStatus />
          </div>
        </div>
      </div>
    </LicenseGuard>
  </div>
</template>

<script setup lang="ts">
  import LicenseGuard from '@/components/LicenseGuard.vue'
  import LicenseStatus from '@/components/LicenseStatus.vue'
</script>

<style scoped>
  .test-page {
    min-height: 100vh;
    background: #f8fafc;
  }

  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .content-area {
    background: white;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 24px;
  }

  .feature-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.2s ease;
  }

  .feature-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  }
</style>
