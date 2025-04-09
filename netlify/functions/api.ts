import express, { Express } from 'express';
import serverless from 'serverless-http';
import { registerRoutes } from '../../server/routes';
import cors from 'cors';
import bodyParser from 'body-parser';

// Initialize express
const app: Express = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Add a specific route for checking WebSocket status
app.get('/api/ws-status', (req, res) => {
  res.json({
    status: 'fallback_mode',
    message: 'WebSockets are not supported on Netlify. Using fallback HTTP polling for messages.'
  });
});

// Register routes
registerRoutes(app);

// Export handler for Netlify
export const handler = serverless(app); 