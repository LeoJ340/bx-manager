import { createRouter, createWebHistory } from 'vue-router'
import RootLayout from '@/layout/RootLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: RootLayout,
      redirect: '/flow',
      children: [
        {
          path: 'flow',
          name: 'flow',
          component: () => import('@/layout/components/StepFlow.vue'),
        },
      ]
    },
  ],
})

export default router
