import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing mandatory environment variable: ${envVar}`);
    process.exit(1);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
  isProduction: process.env.NODE_ENV === 'production',
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || 'BN4aYgiIKCZLtbu3hJOGP-0zOmIssjVEGPAvtL0f0l2bvssi7vyprIQ74WE5TCZ-NWFKtabvZ1OBr5yEpzPFyus',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || 'vsOE3nMehWXs7DcaBRuguR7bI6ww_bSZVVQQ94bl-kc',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:furnicraft.erp@gmail.com',
};
