
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });


import express from 'express';
import cors from 'cors';
// Import routes
// Import routes
import { authRoutes } from './routes/auth.routes.js';  // Note the .js extension
import { walletRoutes } from './routes/wallet.routes.js';
import { ticketRoutes } from './routes/ticket.routes.js';
import  bodyParser from 'body-parser';
const app = express();
app.use(express.json());

app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// Register routes
app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/ticket', ticketRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});