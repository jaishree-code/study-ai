import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateStudyPlan } from './server/plannerEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API endpoint
app.post('/api/generate-plan', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body is required' });
    }
    const plan = await generateStudyPlan(req.body);
    res.json(plan);
  } catch (error: any) {
    console.error('Error generating plan:', error);
    const isValidationError = error.message && (
      error.message.includes('Please provide') ||
      error.message.includes('must have') ||
      error.message.includes('missing an exam date') ||
      error.message.includes('earlier than') ||
      error.message.includes('must be a positive number') ||
      error.message.includes('cannot exceed 16 hours')
    );
    res.status(isValidationError ? 400 : 500).json({ error: error.message || 'Failed to generate plan' });
  }
});

// Serve static assets from Vite build output
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
