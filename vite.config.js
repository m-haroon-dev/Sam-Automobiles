import {defineConfig} from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
export default defineConfig({plugins:[laravel({input:['resources/css/app.css','resources/js/app.jsx'],refresh:true}),react(),tailwind()],build:{sourcemap:false,chunkSizeWarningLimit:350,rolldownOptions:{output:{codeSplitting:{groups:[{name:'react',test:/node_modules\/(react|react-dom|scheduler)\//},{name:'motion',test:/node_modules\/(gsap|@gsap)\//}]}}}}});
