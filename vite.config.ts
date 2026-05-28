import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Expose the system OPENAI_API_KEY to the browser bundle via import.meta.env
    'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY ?? ''),
  },
})
