import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/bookings': 'http://localhost:3000',
      '/payments': 'http://localhost:3000',
      '/notifications': 'http://localhost:3000',
      '/resources': 'http://localhost:3000',
      '/upload': 'http://localhost:3000',
    },
  },
});
