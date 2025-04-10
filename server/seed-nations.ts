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
    name: 'Earth',
    code: 'EARTH',
    displayName: 'Earth',
    active: true
  },
  {
    name: 'Mars',
    code: 'MARS',
    displayName: 'Mars',
    active: true
  },
  {
    name: 'Jupiter',
    code: 'JUPITER',
    displayName: 'Jupiter',
    active: true
  },
  {
    name: 'Saturn',
    code: 'SATURN',
    displayName: 'Saturn',
    active: true
  }
];

async function seedNations() {
  console.log('🌱 Seeding nations...');

  try {
    // Check if nations already exist
    const existingNations = await db.select().from(nations);
    
    if (existingNations.length > 0) {
      console.log(`Found ${existingNations.length} existing nations.`);
      console.log('Deleting existing nations to insert new ones...');
      await db.delete(nations);
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