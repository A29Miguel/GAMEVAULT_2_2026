import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Esto asegura que Vite cargue las variables de entorno
  envPrefix: 'VITE_', 
})