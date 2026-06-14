import { createApp } from 'vue'

import App from '@/App.vue'
import { i18n } from './i18n'
import router from './router'
import { applyTheme, getStoredTheme } from './theme'

import 'vue-sonner/style.css'
import './styles/tailwind.css'
import './styles/index.scss'

applyTheme(getStoredTheme())

const app = createApp(App)

app.use(router)
app.use(i18n)

app.mount('#app')
