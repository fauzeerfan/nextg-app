import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:4000'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5175,
      host: true, // expose ke jaringan (0.0.0.0), bukan hanya localhost
      // ============================================================
      // PROXY — forward semua request /api/* ke backend NestJS.
      // Dengan proxy ini, browser melihat semua request ke origin
      // yang SAMA (tidak ada cross-origin) sehingga CORS tidak
      // diperlukan sama sekali untuk development.
      // CATATAN: Ini hanya berlaku saat dev (npm run dev).
      // Untuk production (npm run build + serve), pakai nginx proxy
      // atau biarkan CORS backend handle.
      // ============================================================
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: false,
        },
      },
    },
    preview: {
      port: 5175,
      host: true,
    },
  }
})