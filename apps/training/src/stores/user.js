import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 原型演示：无需登录，固定演示身份
  const name = ref('演示学员')
  const institution = ref('东南大学附属中大医院')
  const isLoggedIn = ref(true)

  function login(n, inst) {
    name.value = n
    institution.value = inst
    isLoggedIn.value = true
  }

  function logout() {
    isLoggedIn.value = false
  }

  return { name, institution, isLoggedIn, login, logout }
})
