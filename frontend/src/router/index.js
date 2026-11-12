import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import DigitalTwin from '../pages/DigitalTwin.vue'
import Analytics from '../pages/Analytics.vue'
import Battery from '../pages/Battery.vue'
import Validation from '../pages/Validation.vue'
import Settings from '../pages/Settings.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/twin', name: 'DigitalTwin', component: DigitalTwin },
  { path: '/analytics', name: 'Analytics', component: Analytics },
  { path: '/battery', name: 'Battery', component: Battery },
  { path: '/validation', name: 'Validation', component: Validation },
  { path: '/settings', name: 'Settings', component: Settings },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
