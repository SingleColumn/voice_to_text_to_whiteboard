import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Both API keys are read from system environment variables at dev-server start time
// and baked into the browser bundle. Set them in your shell before running npm run dev:
//   export DEEPGRAM_API_KEY=your_key_here
//   export OPENAI_API_KEY=your_key_here
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEEPGRAM_API_KEY': JSON.stringify(process.env.DEEPGRAM_API_KEY ?? ''),
    'import.meta.env.VITE_OPENAI_API_KEY':   JSON.stringify(process.env.OPENAI_API_KEY   ?? ''),
  },
})
