import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

// Register plugins in this order:
// 1. Pinia first (stores may be used in router guards)
// 2. Router second
app.use(createPinia())
app.use(router)

app.mount('#app')
