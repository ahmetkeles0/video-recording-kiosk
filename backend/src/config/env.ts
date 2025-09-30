import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  frontend: {
    tabletUrl: process.env.FRONTEND_TABLET_URL || 'http://localhost:5173',
    phoneUrl: process.env.FRONTEND_PHONE_URL || 'http://localhost:5174',
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
