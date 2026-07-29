import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'training-user-identity'

export const useUserStore = defineStore('user', () => {
  const name = ref('')
  const institution = ref('')
  const isLoggedIn = ref(false)

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const s = JSON.parse(saved)
        if (s.name) name.value = s.name
        if (s.institution) institution.value = s.institution
        if (s.name && s.institution) isLoggedIn.value = true
      }
    } catch { /* ignore */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        name: name.value,
        institution: institution.value
      }))
    } catch { /* ignore */ }
  }

  function login(n, inst) {
    name.value = n
    institution.value = inst
    isLoggedIn.value = true
    saveState()
  }

  function logout() {
    name.value = ''
    institution.value = ''
    isLoggedIn.value = false
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  loadState()

  return { name, institution, isLoggedIn, login, logout }
})
