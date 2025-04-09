import { Handler } from '@netlify/functions';
import pg from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import 'dotenv/config';

const execAsync = promisify(exec);

export const handler: Handler = async (event) => {
  console.log('Running database migrations...');
  
  if (!process.env.DATABASE_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'DATABASE_URL environment variable is not set' }),
    };
  }
  
  try {
    // Create a connection to the database
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection
    console.log('Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('Database connection successful!');

    // Create tables if they don't exist
    console.log('Creating database tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "address" text NOT NULL,
        "username" text,
        "nickname" text,
        "is_online" boolean DEFAULT false,
        "last_seen" timestamp DEFAULT now(),
        CONSTRAINT "users_address_unique" UNIQUE("address"),
        CONSTRAINT "users_username_unique" UNIQUE("username")
      );
      
      CREATE TABLE IF NOT EXISTS "friends" (
        "id" serial PRIMARY KEY NOT NULL,
        "requestor_address" text NOT NULL,
        "recipient_address" text NOT NULL,
        "status" text NOT NULL,
        "timestamp" timestamp DEFAULT now() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" serial PRIMARY KEY NOT NULL,
        "content" text NOT NULL,
        "from_address" text NOT NULL,
        "to_address" text,
        "timestamp" timestamp DEFAULT now() NOT NULL,
        "read" boolean DEFAULT false
      );
      
      CREATE TABLE IF NOT EXISTS "reactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "message_id" serial NOT NULL,
        "from_address" text NOT NULL,
        "emoji" text NOT NULL,
        "timestamp" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    console.log('Database migration completed successfully!');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Database migration completed successfully' 
      }),
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : String(error)
      }),
    };
  }
}; 