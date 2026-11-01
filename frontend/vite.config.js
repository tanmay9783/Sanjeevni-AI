import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'screenshot-capture',
      configureServer(server) {
        server.middlewares.use('/api/save-screenshot', (req, res) => {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            const base64Data = body.replace(/^data:image\/png;base64,/, "");
            const outPath = path.resolve(__dirname, 'public/images/rendered_avatar.png');
            fs.writeFileSync(outPath, base64Data, 'base64');
            const brainPath = '/home/tanmay/.gemini/antigravity/brain/6a3fc4a0-6f3b-412e-9169-451eeaa1a72d/rendered_avatar.png';
            try { fs.writeFileSync(brainPath, base64Data, 'base64'); } catch (e) {}
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('ok');
          });
        });
      }
    }
  ],
})
