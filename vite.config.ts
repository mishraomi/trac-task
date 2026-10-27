import { defineConfig } from 'vite'

// Vite's built-in esbuild JSX transform is sufficient for this React prototype.
// OAuth popups require access to their opener so Firebase can complete Google sign-in.
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
