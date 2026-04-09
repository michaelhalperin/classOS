import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use 127.0.0.1 so the proxy matches the Express listen target reliably on all platforms.
const api = 'http://127.0.0.1:5001';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': api,
      '/lessons': api,
      '/lesson-notes': api,
      '/assignments': api,
      '/submissions': api,
      '/exercises': api,
      '/code': api,
      '/questions': api,
      '/answers': api,
      '/ai': api,
      '/classes': api,
      '/quizzes': api,
      '/uploads': api,
    },
  },
});
