import 'element-plus/theme-chalk/index.css'
import './assets/main.css'
// import 'element-plus/theme-chalk/el-message.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
