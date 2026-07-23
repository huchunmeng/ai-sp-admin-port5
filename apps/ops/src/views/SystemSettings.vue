<template>
  <div class="content-container">
    <h2 style="margin-bottom:4px;">系统设置</h2>
    <p class="text-secondary mb-4" style="font-size:13px;">平台全局配置与管理</p>

    <div class="card mb-4" style="padding: 24px;">
      <h3 style="margin-bottom: 16px;">基础信息</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="filter-item">
          <label>平台名称</label>
          <input class="input w-full" v-model="form.platformName">
        </div>
        <div class="filter-item">
          <label>平台版本</label>
          <input class="input w-full" v-model="form.version" disabled>
        </div>
        <div class="filter-item">
          <label>管理员邮箱</label>
          <input class="input w-full" v-model="form.adminEmail">
        </div>
        <div class="filter-item">
          <label>客服电话</label>
          <input class="input w-full" v-model="form.servicePhone">
        </div>
      </div>
    </div>

    <div class="card mb-4" style="padding: 24px;">
      <h3 style="margin-bottom: 16px;">安全设置</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="filter-item">
          <label>登录超时（分钟）</label>
          <input type="number" class="input w-full" v-model="form.loginTimeout" min="5" max="480">
        </div>
        <div class="filter-item">
          <label>最大登录失败次数</label>
          <input type="number" class="input w-full" v-model="form.maxLoginAttempts" min="3" max="20">
        </div>
        <div class="filter-item">
          <label>会话保持（小时）</label>
          <input type="number" class="input w-full" v-model="form.sessionDuration" min="1" max="72">
        </div>
        <div class="filter-item">
          <label>密码最小长度</label>
          <input type="number" class="input w-full" v-model="form.minPasswordLength" min="6" max="32">
        </div>
      </div>
    </div>

    <div class="card mb-4" style="padding: 24px;">
      <h3 style="margin-bottom: 16px;">数据备份</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="filter-item">
          <label>自动备份</label>
          <label class="switch">
            <input type="checkbox" v-model="form.autoBackup">
            <span class="slider"></span>
          </label>
        </div>
        <div class="filter-item">
          <label>备份频率</label>
          <select class="select" v-model="form.backupFrequency" :disabled="!form.autoBackup">
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
          </select>
        </div>
        <div class="filter-item">
          <label>备份保留天数</label>
          <input type="number" class="input w-full" v-model="form.backupRetention" min="7" max="365">
        </div>
        <div class="filter-item" style="justify-content: flex-end;">
          <button class="btn" @click="manualBackup">立即备份</button>
        </div>
      </div>
    </div>

    <div class="card mb-4" style="padding: 24px;">
      <h3 style="margin-bottom: 16px;">通知配置</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="filter-item">
          <label>审核结果通知</label>
          <label class="switch">
            <input type="checkbox" v-model="form.notifyAudit">
            <span class="slider"></span>
          </label>
        </div>
        <div class="filter-item">
          <label>考核提醒通知</label>
          <label class="switch">
            <input type="checkbox" v-model="form.notifyExam">
            <span class="slider"></span>
          </label>
        </div>
        <div class="filter-item">
          <label>系统公告通知</label>
          <label class="switch">
            <input type="checkbox" v-model="form.notifyAnnouncement">
            <span class="slider"></span>
          </label>
        </div>
        <div class="filter-item">
          <label>数据导出完成通知</label>
          <label class="switch">
            <input type="checkbox" v-model="form.notifyExport">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div style="display:flex; gap: 12px;">
      <button class="btn btn-primary" @click="saveSettings">保存设置</button>
      <button class="btn" @click="resetForm">恢复默认</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { toast } from '@ai-sp/shared'

const defaults = {
  platformName: 'AI标准化病人教学与考核系统',
  version: 'v2.0.0',
  adminEmail: 'admin@ai-sp.com',
  servicePhone: '400-888-0000',
  loginTimeout: 30,
  maxLoginAttempts: 5,
  sessionDuration: 8,
  minPasswordLength: 8,
  autoBackup: true,
  backupFrequency: 'daily',
  backupRetention: 30,
  notifyAudit: true,
  notifyExam: true,
  notifyAnnouncement: true,
  notifyExport: false
}

const form = reactive({ ...defaults })

const saveSettings = () => toast.show('系统设置已保存（演示）')
const resetForm = () => {
  Object.assign(form, defaults)
  toast.show('已恢复默认设置')
}
const manualBackup = () => toast.show('手动备份已启动（演示）')
</script>
