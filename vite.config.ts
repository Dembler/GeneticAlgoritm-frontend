import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

const normalizeBasePath = (value?: string) => {
  const normalized = value?.trim()

  if (!normalized || normalized === '/') {
    return '/'
  }

  const trimmed = normalized.replace(/^\/+|\/+$/g, '')

  return `/${trimmed}/`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = env.VITE_DEV_PORT ? Number(env.VITE_DEV_PORT) : undefined

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    plugins: [
      vue(),
      tailwindcss(),
      ...(env.VITE_ENABLE_VUE_DEVTOOLS === 'true' ? [vueDevTools()] : []),
    ],
    server: {
      host: env.VITE_DEV_HOST || '0.0.0.0',
      ...(devPort && Number.isFinite(devPort) ? { port: devPort, strictPort: true } : {}),
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
