import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Port 3000 is required by the environment reverse proxy (Nginx listens on 8080 and proxies to 3000)
const PORT = 3000;

app.use(express.json());

// API health endpoint for Cloud Run and container liveness probes
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'Controle de Folgas e Viagens – UMCA',
    timestamp: new Date().toISOString(),
  });
});

const distPath = path.join(__dirname, 'dist');

// Serve static assets from Vite build output
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback to index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (_req, res) => {
    res.status(503).send('Aplicação em compilação. Por favor, aguarde alguns instantes.');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor UMCA rodando na porta ${PORT}`);
});
