import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

// Get database configuration from environment
const useNeon = process.env.USE_NEON_DB === 'true';
const neonDatabaseUrl = process.env.NEON_DATABASE_URL;
const localDatabaseUrl = process.env.LOCAL_DATABASE_URL;
const fallbackUrl = "postgresql://postgres:postgres@localhost:5432/buzzy_chat";

// Determine which database URL to use
let databaseUrl;
if (useNeon) {
  databaseUrl = neonDatabaseUrl || process.env.DATABASE_URL || fallbackUrl;
  console.log("Using NeonDB serverless PostgreSQL");
} else {
  databaseUrl = localDatabaseUrl || process.env.DATABASE_URL || fallbackUrl;
  console.log("Using local PostgreSQL");
}

console.log(`Database connection string available: ${!!databaseUrl}`);

// Create database pool with error handling
let pool;
let db;

try {
  if (useNeon) {
    // Use NeonDB serverless connection
    pool = new NeonPool({
      connectionString: databaseUrl,
    });
    
    // Create Drizzle ORM instance for Neon
    db = drizzleNeon({
      client: pool,
      schema
    });
    
    console.log("NeonDB connection initialized");
  } else {
    // Use standard PostgreSQL connection
    pool = new pg.Pool({
      connectionString: databaseUrl,
    });
    
    // Create Drizzle ORM instance for PostgreSQL
    db = drizzle(pool, { schema });
    
    console.log("PostgreSQL connection initialized");
  }
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  // Create dummy implementations for offline mode
  pool = {} as any;
  db = {
    select: () => ({ from: () => [] }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
    delete: () => ({ where: () => [] }),
  } as any;
  
  console.warn("Running in offline mode with mock database");
}

export { db, pool };
