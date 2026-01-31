import { createRouter, createWebHashHistory } from 'vue-router'
import { useProjectStore } from '@/store/project'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('@/views/EditorView.vue'),
  },
  {
    path: '/outline',
    name: 'Outline',
    component: () => import('@/views/OutlineView.vue'),
  },
  {
    path: '/characters',
    name: 'Characters',
    component: () => import('@/views/CharacterView.vue'),
  },
  {
    path: '/worldview',
    name: 'Worldview',
    component: () => import('@/views/WorldviewView.vue'),
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: () => import('@/views/TimelineView.vue'),
  },
  {
    path: '/relations',
    name: 'Relations',
    component: () => import('@/views/RelationsView.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/AboutView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 导航守卫：未打开项目时限制访问特定视图
router.beforeEach((to, _from, next) => {
  const projectStore = useProjectStore()
  
  // 需要项目加载才能访问的路由
  const protectedRoutes = ['Editor', 'Outline', 'Characters', 'Worldview', 'Timeline']
  
  if (protectedRoutes.includes(to.name as string) && !projectStore.isLoaded) {
    // 如果没有加载项目，重定向回首页
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
