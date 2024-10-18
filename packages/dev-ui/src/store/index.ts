import { createPinia } from 'pinia';
import { piniaHooksPlugin } from './plugins/pinia-hooks-plugin';

const pinia = createPinia();
pinia.use(piniaHooksPlugin);

export default pinia;
