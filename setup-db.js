// Simple script to check database connection
import 'dotenv/config';
import pg from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const { Pool } = pg;
const execAsync = promisify(exec);

async function main() {
  console.log('Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Test connection
    console.log('Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('Database connection successful!');

    // Push schema migrations
    console.log('Applying database migrations...');
    const { stdout, stderr } = await execAsync('npx drizzle-kit push:pg');
    console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('Migrations applied successfully!');

    console.log('Database setup complete! You can now run the application with:');
    console.log('npm run dev');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.log('\nPossible solutions:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check the DATABASE_URL in your .env file');
    console.log('3. Create the database if it doesn\'t exist:');
    console.log('   createdb buzzy_chat');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 