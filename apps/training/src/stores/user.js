import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 原型演示：无需登录，固定演示身份
  const name = ref('演示学员')
  const institution = ref('东南大学附属中大医院')
  const isLoggedIn = ref(true)
  /**
   * 学号 —— 考核侧靠它认人：
   *   · 老师派发时按学号生成名单（服务端据此校验"这场考没派给我"）
   *   · 会话按 (taskId, 学号) 分开，所以同一场考试不同考生互不干扰
   * 原型固定为 '001'（与「新建考核」考生池里的张三一致，便于演示名单过滤）。
   */
  const examNumber = ref('001')

  function login(n, inst) {
    name.value = n
    institution.value = inst
    isLoggedIn.value = true
  }

  function logout() {
    isLoggedIn.value = false
  }

  return { name, institution, examNumber, isLoggedIn, login, logout }
})
