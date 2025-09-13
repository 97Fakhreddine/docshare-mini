import { createApp } from 'vue';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from './lib/queryClient';
import router from './router';
import App from './app/App.vue';
import './styles.css';

createApp(App).use(VueQueryPlugin, { queryClient }).use(router).mount('#app');
