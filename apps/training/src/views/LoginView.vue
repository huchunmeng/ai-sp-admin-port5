<template>
  <div class="login-page">
    <div class="login-card">
      <!-- 标题 -->
      <div class="title-main">欢迎登录</div>
      <div class="title-sub">"医道星途"教培智能体</div>

      <!-- 分割线 -->
      <div class="title-divider"></div>

      <!-- 手机号 -->
      <div class="field-row">
        <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <input
          class="field-input"
          type="text"
          placeholder="请输入手机号"
          v-model="formPhone"
          @keydown.enter="focusPassword"
        />
      </div>

      <!-- 密码 -->
      <div class="field-row">
        <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          <circle cx="12" cy="16" r="1"/>
        </svg>
        <input
          ref="passwordRef"
          class="field-input"
          :type="showPassword ? 'text' : 'password'"
          placeholder="请输入密码"
          v-model="formPassword"
          @keydown.enter="focusCaptcha"
        />
        <span class="eye-icon" @click="showPassword = !showPassword">
          <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </span>
      </div>

      <!-- 验证码 -->
      <div class="captcha-row">
        <div class="captcha-left">
          <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <input
            ref="captchaRef"
            class="field-input captcha-input"
            type="text"
            placeholder="请输入图片内容"
            v-model="formCaptcha"
            @keydown.enter="doLogin"
          />
        </div>
        <div class="captcha-img" @click="refreshCaptcha">
          <span class="captcha-text">{{ captchaCode }}</span>
        </div>
      </div>

      <!-- 协议 -->
      <div class="agreement-row">
        <span class="checkbox-box" :class="{ checked: formAgreed }" @click="formAgreed = !formAgreed">
          <i v-if="formAgreed" class="fa-solid fa-check"></i>
        </span>
        <span class="agreement-text">
          我已阅读并同意<span class="agreement-link">用户协议</span>、<span class="agreement-link">隐私政策</span>
        </span>
      </div>

      <!-- 登录按钮 -->
      <button class="login-btn" :disabled="!canLogin" @click="doLogin">
        登录
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const formPhone = ref('')
const formPassword = ref('')
const formCaptcha = ref('')
const formAgreed = ref(false)
const showPassword = ref(false)
const passwordRef = ref(null)
const captchaRef = ref(null)

const captchaChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCaptcha() {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += captchaChars.charAt(Math.floor(Math.random() * captchaChars.length))
  }
  return code
}
const captchaCode = ref(generateCaptcha())

function refreshCaptcha() {
  captchaCode.value = generateCaptcha()
}

function focusPassword() {
  passwordRef.value?.focus()
}

function focusCaptcha() {
  captchaRef.value?.focus()
}

const canLogin = computed(() =>
  formPhone.value.trim() && formPassword.value && formCaptcha.value.trim() && formAgreed.value
)

function doLogin() {
  if (!canLogin.value) return
  if (formCaptcha.value.trim().toUpperCase() !== captchaCode.value.toUpperCase()) {
    refreshCaptcha()
    formCaptcha.value = ''
    return
  }
  userStore.login(formPhone.value.trim(), '东南大学附属中大医院')
  router.push({ name: 'home' })
}
</script>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  background-image: url('/images/login-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

/* ═══════════════════════════════════════════
   登录卡片
   ═══════════════════════════════════════════ */
.login-card {
  position: absolute;
  right: 200px;
  top: calc(50% - 10px);
  transform: translateY(-50%);
  width: 384px;
  min-height: 520px;
  background: #FFFFFF;
  border-radius: 14px;
  padding: 40px 36px 36px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, .08);
}

/* ═══════════════════════════════════════════
   标题
   ═══════════════════════════════════════════ */
.title-main {
  font-size: 24px;
  font-weight: 600;
  color: #222;
  text-align: center;
  line-height: 1.3;
}

.title-sub {
  font-size: 19px;
  font-weight: 600;
  color: #222;
  text-align: center;
  margin-top: 8px;
  line-height: 1.3;
}

.title-divider {
  height: 1px;
  background: #ECECEC;
  margin: 20px 0 28px;
}

/* ═══════════════════════════════════════════
   输入框
   ═══════════════════════════════════════════ */
.field-row {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.field-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: #4A84F5;
  z-index: 1;
  pointer-events: none;
}

.field-input {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 38px;
  border: 1px solid #E6EAF2;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  color: #333;
  background: #FFFFFF;
  outline: none;
  box-sizing: border-box;
  transition: border-color .15s;
}

.field-input:focus {
  border-color: #4A84F5;
}

.field-input::placeholder {
  color: #A6A6A6;
  font-size: 14px;
}

/* 密码眼睛图标 */
.eye-icon {
  position: absolute;
  right: 12px;
  width: 16px;
  height: 16px;
  color: #4A84F5;
  cursor: pointer;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.eye-icon svg {
  width: 16px;
  height: 16px;
}

/* ═══════════════════════════════════════════
   验证码
   ═══════════════════════════════════════════ */
.captcha-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.captcha-left {
  position: relative;
  width: 170px;
  flex-shrink: 0;
}

.captcha-input {
  padding-right: 8px;
}

.captcha-img {
  width: 90px;
  height: 40px;
  flex-shrink: 0;
  background: repeating-linear-gradient(
    45deg,
    #f5f7fa 0px,
    #f5f7fa 2px,
    #eef1f5 2px,
    #eef1f5 4px
  );
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  position: relative;
}

.captcha-img::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 40%, rgba(0,0,0,.07) 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(0,0,0,.05) 0%, transparent 50%);
  pointer-events: none;
}

.captcha-text {
  position: relative;
  z-index: 1;
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 4px;
  font-family: 'Comic Sans MS', 'KaiTi', 'STKaiti', cursive, sans-serif;
  transform: skewX(-4deg) rotate(-2deg);
  text-shadow: 1px 1px 0 rgba(255,255,255,.6);
}

/* ═══════════════════════════════════════════
   协议
   ═══════════════════════════════════════════ */
.agreement-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 20px;
  margin-bottom: 24px;
}

.checkbox-box {
  width: 14px;
  height: 14px;
  border: 1.5px solid #d0d5dd;
  border-radius: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .15s;
  font-size: 8px;
  color: transparent;
}

.checkbox-box.checked {
  background: #4A84F5;
  border-color: #4A84F5;
  color: #fff;
}

.agreement-text {
  font-size: 13px;
  color: #666;
  line-height: 20px;
}

.agreement-link {
  color: #4A84F5;
  cursor: pointer;
}

.agreement-link:hover {
  text-decoration: underline;
}

/* ═══════════════════════════════════════════
   登录按钮
   ═══════════════════════════════════════════ */
.login-btn {
  width: 100%;
  height: 40px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: #4A84F5;
  color: #FFFFFF;
  font-family: inherit;
  transition: background .15s;
}

.login-btn:hover:not(:disabled) {
  background: #3B75EB;
}

.login-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
