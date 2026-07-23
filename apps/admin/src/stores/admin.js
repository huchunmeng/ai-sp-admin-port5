import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAdminStore = defineStore('admin', () => {
  const tabs = ref([{ id: 'home', label: '首页', closable: false }])
  const activeTabId = ref('home')
  const currentInstitution = ref('仁爱医院 (总部)')

  function openTab(page) {
    const existing = tabs.value.find(t => t.id === page.id)
    if (existing) {
      activeTabId.value = page.id
      return
    }
    tabs.value.push({ id: page.id, label: page.label, closable: true })
    activeTabId.value = page.id
  }

  function setActiveTab(id) {
    activeTabId.value = id
  }

  function closeTab(id) {
    if (id === 'home') return
    const idx = tabs.value.findIndex(t => t.id === id)
    if (idx === -1) return
    tabs.value.splice(idx, 1)
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[tabs.value.length - 1].id
    }
  }

  return { tabs, activeTabId, currentInstitution, openTab, closeTab, setActiveTab }
})
