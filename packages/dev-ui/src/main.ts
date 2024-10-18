import { createApp } from 'vue';
import { createWebHistory, createRouter } from 'vue-router';
import FloatingVue from 'floating-vue';
import { createHead } from '@unhead/vue';

import '@dmno/ui-lib/style/vars.css';
import '@dmno/ui-lib/style/base.css';
import '@dmno/ui-lib/style/utilities.css';
import './assets/main.css';
import 'floating-vue/dist/style.css';

import App from './App.vue';
import pinia from './store';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: { name: 'config-overview' } },
    { path: '/config', name: 'config-overview', component: () => import('./views/ConfigOverview.vue') },
    {
      path: '/config/plugin\\::pluginId(.*)',
      name: 'config-plugin-detail',
      component: () => import('./views/PluginOverview.vue'),
    },
    {
      path: '/config/:serviceId',
      name: 'config-service-detail',
      component: () => import('./views/ServiceOverview.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: '404',
      component: () => import('./views/NotFoundPage.vue'),
    },
  ],
});




createApp(App)
  .use(createHead())
  .use(router)
  .use(pinia)
  .use(FloatingVue)
  .mount('#app');
