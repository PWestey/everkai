import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';
export default defineConfig({base:'./',plugins:[react()],resolve:{alias:{'@':path.resolve(import.meta.dirname,'.')}},css:{postcss:{plugins:[tailwindcss()]}},build:{outDir:'dist/client'},server:{host:'127.0.0.1',port:5187,strictPort:true}});
