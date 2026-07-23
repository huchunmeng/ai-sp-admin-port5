import { ref, reactive } from 'vue'

const BASE = '/data/cases'
const CACHE_KEY = 'aisp_case_data_cache'
const cache = reactive(new Map())
const indexCache = ref(null)
let indexLoading = false
let indexPromise = null

// 从 sessionStorage 恢复缓存（模块初始化时执行一次）
try {
  const saved = sessionStorage.getItem(CACHE_KEY)
  if (saved) {
    const entries = JSON.parse(saved)
    for (const [k, v] of entries) {
      cache.set(k, v)
    }
  }
} catch (e) { /* ignore */ }

function persistCache() {
  try {
    const entries = Array.from(cache.entries())
    if (entries.length > 20) entries.splice(0, entries.length - 20) // 最多保留20个
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entries))
  } catch (e) { /* ignore */ }
}

export function useCaseLoader() {
  const loading = ref(false)
  const error = ref(null)

  async function loadCaseIndex() {
    if (indexCache.value) return indexCache.value
    if (indexLoading && indexPromise) return indexPromise

    indexLoading = true
    indexPromise = (async () => {
      try {
        const resp = await fetch('/api/cases')
        if (!resp.ok) throw new Error(`Failed to load case index: ${resp.status}`)
        const data = await resp.json()
        indexCache.value = data
        return data
      } catch (e) {
        console.warn('[useCaseLoader] /api/cases failed, trying production fallback:', e.message)
        // Production fallback: try static JSON files generated at build time
        try {
          const resp = await fetch('/api/cases.json')
          if (resp.ok) {
            const data = await resp.json()
            indexCache.value = data
            return data
          }
        } catch {}
        try {
          const resp = await fetch('/data/case-index.json')
          if (resp.ok) {
            const data = await resp.json()
            indexCache.value = data
            return data
          }
        } catch {}
        return []
      } finally {
        indexLoading = false
        indexPromise = null
      }
    })()
    return indexPromise
  }

  async function loadCase(caseId) {
    if (cache.has(caseId)) return cache.get(caseId)

    loading.value = true
    error.value = null

    const modules = ['basic', 'reception', 'analysis', 'humanity', 'meta']
    const results = {}
    const errors = []

    const fetches = modules.map(async (mod) => {
      try {
        const resp = await fetch(`${BASE}/${caseId}-${mod}.json`)
        if (!resp.ok) {
          if (resp.status === 404) {
            if (mod === 'meta') {
              // Try scoreSheet as fallback for older format
              const ssResp = await fetch(`${BASE}/${caseId}-scoreSheet.json`)
              if (ssResp.ok) {
                results.scoreSheet = await ssResp.json()
                return
              }
            }
            return null
          }
          throw new Error(`${mod}: ${resp.status}`)
        }
        results[mod] = await resp.json()
      } catch (e) {
        errors.push(e.message)
      }
    })

    await Promise.all(fetches)

    if (Object.keys(results).length === 0) {
      error.value = `Failed to load case ${caseId}: ${errors.join(', ')}`
      loading.value = false
      return null
    }

    // Normalize the loaded data
    const caseData = normalizeCaseData(caseId, results)
    cache.set(caseId, caseData)
    persistCache()
    loading.value = false
    return caseData
  }

  async function loadCaseData(caseId, module) {
    const key = `${caseId}-${module}`
    if (cache.has(key)) return cache.get(key)

    try {
      const resp = await fetch(`${BASE}/${caseId}-${module}.json`)
      if (!resp.ok) return null
      const data = await resp.json()
      cache.set(key, data)
      persistCache()
      return data
    } catch (e) {
      return null
    }
  }

  function getCached(caseId) {
    return cache.get(caseId) || null
  }

  function clearCache(caseId) {
    if (caseId) {
      cache.delete(caseId)
    } else {
      cache.clear()
    }
  }

  return { loadCaseIndex, loadCase, loadCaseData, getCached, clearCache, loading, error }
}

function normalizeCaseData(caseId, raw) {
  const basic = raw.basic || {}
  const reception = raw.reception || {}
  const analysis = raw.analysis || {}
  const humanity = raw.humanity || {}
  const meta = raw.meta || null

  // Normalize reception qa_script format
  if (reception.sp_materials?.qa_script) {
    const qa = reception.sp_materials.qa_script
    if (qa.length > 0) {
      const first = qa[0]
      if (first.doctor !== undefined && first.patient !== undefined) {
        reception._format = 'doctor_patient'
      } else if (first.question !== undefined && first.answer !== undefined) {
        reception._format = 'question_answer'
      }
    }
  }

  // Normalize analysis format: ensure steps array with questions
  if (analysis.examiner_version?.steps) {
    analysis._format = analysis.examiner_version.steps[0]?.questions ? 'multi_question' : 'single_question'
  }

  // Normalize humanity format: detect speaker field presence
  if (humanity.scenarios) {
    for (const sc of humanity.scenarios) {
      if (sc.sp_materials?.script?.length > 0) {
        sc._has_speaker = sc.sp_materials.script[0].speaker !== undefined
      }
    }
  }

  return {
    caseId,
    basic,
    reception,
    analysis,
    humanity,
    meta
  }
}
