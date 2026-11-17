import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@fantaz/widgetz/tauri':fileURLToPath(new URL('./packages/widgetz/src/tauri.ts',import.meta.url)),'@fantaz/widgetz/style.css':fileURLToPath(new URL('./packages/widgetz/src/style.css',import.meta.url)),'@fantaz/widgetz':fileURLToPath(new URL('./packages/widgetz/src/index.ts',import.meta.url))}},server:{port:5188,strictPort:true},build:{rollupOptions:{input:{main:'index.html',notice:'notice.html'}}},clearScreen:false});
