import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { join } from 'path'
import commonjs from '@rollup/plugin-commonjs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        // 主进程入口文件
        entry: 'electron/main.ts',
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ['sqlite3'],
              plugins: [
                commonjs({
                  dynamicRequireTargets: [
                    'node_modules/sqlite3/**/*.node'
                  ],
                  ignoreDynamicRequires: true
                })
              ],
              output: {
                format: 'cjs'
              }
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
      },
    ]),
    renderer({
      nodeIntegration: true
    }),
  ],
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
      '@components': join(__dirname, 'src/components'),
      '@views': join(__dirname, 'src/views'),
      '@store': join(__dirname, 'src/store'),
      '@utils': join(__dirname, 'src/utils'),
      '@assets': join(__dirname, 'src/assets'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
}) 