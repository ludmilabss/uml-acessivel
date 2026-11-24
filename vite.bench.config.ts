import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.ts';

// Build de produção só da página de benchmark (bench.html), para medir com o React otimizado.
export default mergeConfig(
  baseConfig,
  defineConfig({
    build: { outDir: 'dist-bench', rollupOptions: { input: 'bench.html' } },
  }),
);
