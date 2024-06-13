import { createApp } from 'vue';
import './style.css';
import App from './App.vue';

const app = createApp(App);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.config.globalProperties.DMNO_CONFIG = (globalThis as any).DMNO_CONFIG;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.config.globalProperties.DMNO_PUBLIC_CONFIG = (globalThis as any).DMNO_PUBLIC_CONFIG;

app.mount('#app');
