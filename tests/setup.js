import { config } from 'dotenv';
import path from 'path';

// Load test-specific environment variables
config({
  path: path.resolve(process.cwd(), '.env.test')
});

// Verify environment variables
if (!process.env.SUPABASE_KEY || !process.env.SUPABASE_URL) {
  throw new Error('Supabase credentials missing in .env.test');
}