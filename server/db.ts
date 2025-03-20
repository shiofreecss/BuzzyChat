import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Neon database to use WebSockets
neonConfig.webSocketConstructor = ws;

// Default database URL for local development
const DEFAULT_DB_URL = "postgresql://postgres:postgres@localhost:5432/buzzy_chat";

// Get database URL from environment or use default
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DB_URL;

console.log("Database connection string available:", !!databaseUrl);

// Create database pool with error handling
let pool;
let db;

try {
  pool = new Pool({
    connectionString: databaseUrl,
  });
  
  // Create Drizzle ORM instance
  db = drizzle({
    client: pool,
    schema
  });
  
  console.log("Database connection initialized");
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  // Create dummy implementations for offline mode
  pool = {} as Pool;
  db = {
    select: () => ({ from: () => [] }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
    delete: () => ({ where: () => [] }),
  } as any;
  
  console.warn("Running in offline mode with mock database");
}

export { db, pool };
