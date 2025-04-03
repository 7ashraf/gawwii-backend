
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
import { marketplaceRoutes } from './routes/marketplace.routes.js';
// import responseTime /from './middleware/responseTime.middleware.js';
const app = express();
app.use(express.json());
// app.use(responseTime)

app.use(cors());

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World');
});

// Register routes
app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/ticket', ticketRoutes);
app.use('/marketplace', marketplaceRoutes);


// Only use app.listen in development, not for Vercel deployment
if (process.env.NODE_ENV !== 'prod') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for Vercel
export default app;