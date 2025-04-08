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

// Register routes
registerRoutes(app);

// Export handler for Netlify
export const handler = serverless(app); 