import { logger } from "../config/logger";
import 'dotenv/config';

/**
 * Environment Variables Validator
 * Ensure all required env variables are set before app starts
 */

interface EnvConfig {
  GEMINI_API_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  FIREBASE_SERVICE_ACCOUNT_KEY?: string;
  APP_URL?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
}

export function validateEnvironment(): EnvConfig {
  const errors: string[] = [];

  // Required variables check (warn only)
  if (!process.env.GEMINI_API_KEY) {
    errors.push('GEMINI_API_KEY is not set in environment');
  }

  if (errors.length > 0) {
    logger.warn('⚠️ Environment Validation Warnings:');
    errors.forEach(error => logger.warn(`  - ${error}`));
  }

  const config: EnvConfig = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    APP_URL: process.env.APP_URL,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
  };

  return config;
}

export const env = validateEnvironment();
