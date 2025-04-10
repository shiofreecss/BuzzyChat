import { db } from './db';
import { nations } from '@shared/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initial list of nations to seed
const defaultNations = [
  {
    name: 'Global',
    code: 'GLOBAL',
    displayName: 'Global Chat',
    active: true
  },
  {
    name: 'United States',
    code: 'US',
    displayName: 'United States',
    active: true
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    displayName: 'United Kingdom',
    active: true
  },
  {
    name: 'Canada',
    code: 'CA',
    displayName: 'Canada',
    active: true
  },
  {
    name: 'Australia',
    code: 'AU',
    displayName: 'Australia',
    active: true
  },
  {
    name: 'Germany',
    code: 'DE',
    displayName: 'Germany',
    active: true
  },
  {
    name: 'France',
    code: 'FR',
    displayName: 'France',
    active: true
  },
  {
    name: 'Japan',
    code: 'JP',
    displayName: 'Japan',
    active: true
  },
  {
    name: 'China',
    code: 'CN',
    displayName: 'China',
    active: true
  },
  {
    name: 'Brazil',
    code: 'BR',
    displayName: 'Brazil',
    active: true
  },
  {
    name: 'India',
    code: 'IN',
    displayName: 'India',
    active: true
  },
  {
    name: 'Singapore',
    code: 'SG',
    displayName: 'Singapore',
    active: true
  },
  {
    name: 'South Korea',
    code: 'KR',
    displayName: 'South Korea',
    active: true
  }
];

async function seedNations() {
  console.log('🌱 Seeding nations...');

  try {
    // Check if nations already exist
    const existingNations = await db.select().from(nations);
    
    if (existingNations.length > 0) {
      console.log(`Found ${existingNations.length} existing nations. Skipping seed.`);
      return;
    }

    // Insert all default nations
    const result = await db.insert(nations).values(defaultNations);
    
    console.log(`✅ Successfully inserted ${defaultNations.length} nations`);
  } catch (error) {
    console.error('❌ Error seeding nations:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedNations(); 