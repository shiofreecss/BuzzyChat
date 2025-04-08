#!/usr/bin/env node
import { promises as fs, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { exec } from 'child_process';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const dbType = args[0]?.toLowerCase();

console.log('Current working directory:', process.cwd());
console.log('Switching database to:', dbType);

if (!dbType || (dbType !== 'neon' && dbType !== 'local')) {
  console.log('Usage: node switch-db.js [neon|local]');
  console.log('  neon  - Switch to NeonDB (cloud/serverless)');
  console.log('  local - Switch to local PostgreSQL');
  process.exit(1);
}

// Load current .env file
const envPath = resolve(process.cwd(), '.env');
console.log('Loading .env file from:', envPath);

let envConfig = {};

try {
  if (existsSync(envPath)) {
    console.log('.env file exists, reading contents...');
    const envContent = await fs.readFile(envPath, 'utf8');
    envConfig = dotenv.parse(envContent);
    console.log('Current env config:', envConfig);
  } else {
    console.log('.env file does not exist!');
  }
} catch (error) {
  console.error('Error reading .env file:', error);
  process.exit(1);
}

// Update USE_NEON_DB value
const previousValue = envConfig.USE_NEON_DB;
envConfig.USE_NEON_DB = dbType === 'neon' ? 'true' : 'false';
console.log(`Changing USE_NEON_DB from ${previousValue} to ${envConfig.USE_NEON_DB}`);

// Also update DATABASE_URL to match the selected database
if (dbType === 'neon' && envConfig.NEON_DATABASE_URL) {
  envConfig.DATABASE_URL = envConfig.NEON_DATABASE_URL;
  console.log('Updated DATABASE_URL to use NEON_DATABASE_URL');
} else if (dbType === 'local' && envConfig.LOCAL_DATABASE_URL) {
  envConfig.DATABASE_URL = envConfig.LOCAL_DATABASE_URL;
  console.log('Updated DATABASE_URL to use LOCAL_DATABASE_URL');
}

// Write updated .env file
try {
  const newEnvContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  console.log('Writing new .env content...');
  await fs.writeFile(envPath, newEnvContent);
  
  console.log(`Successfully switched to ${dbType === 'neon' ? 'NeonDB' : 'local PostgreSQL'}`);
  console.log('');
  
  // Check if database URLs are configured
  if (dbType === 'neon' && (!envConfig.NEON_DATABASE_URL || envConfig.NEON_DATABASE_URL.includes('your-neon-username'))) {
    console.log('⚠️ Warning: NeonDB URL is not configured properly.');
    console.log('Please update your .env file with a valid NEON_DATABASE_URL.');
    console.log('');
  }
  
  if (dbType === 'local' && !envConfig.LOCAL_DATABASE_URL) {
    console.log('⚠️ Warning: Local PostgreSQL URL is not configured.');
    console.log('Please update your .env file with a valid LOCAL_DATABASE_URL.');
    console.log('');
  }
  
  console.log('Restart your server to apply the changes:');
  console.log('npm run dev');
} catch (error) {
  console.error('Error updating .env file:', error);
  process.exit(1);
} 