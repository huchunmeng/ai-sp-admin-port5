import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { hydrateTemplate } from './views/imaging-samples/templateStore'

import './styles/variables.css'
import './styles/global.css'

// 装载本机保存的评分表模板 / 难度标定（本期无服务端，只在本机管理端生效）
 hydrateTemplate()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
