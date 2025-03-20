import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedTestWallets() {
  console.log("Seeding test wallets to the database...");
  
  // Define test wallets with the same addresses used in the mock wallet implementation
  const testWallets = [
    {
      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      username: "test_user1",
      nickname: "Test User 1",
      isOnline: false,
      lastSeen: new Date()
    },
    {
      address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
      username: "test_user2",
      nickname: "Test User 2",
      isOnline: false,
      lastSeen: new Date()
    },
    {
      address: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
      username: "test_user3",
      nickname: "Test User 3",
      isOnline: false,
      lastSeen: new Date()
    }
  ];

  try {
    // Insert test wallets one by one, ignoring conflicts
    for (const wallet of testWallets) {
      try {
        // Check if wallet already exists
        const existingUser = await db.select().from(users).where(eq(users.address, wallet.address));
        
        if (existingUser.length === 0) {
          // Insert if not exists
          await db.insert(users).values(wallet);
          console.log(`Added test wallet: ${wallet.address} (${wallet.nickname})`);
        } else {
          console.log(`Test wallet already exists: ${wallet.address} (${wallet.nickname})`);
        }
      } catch (error) {
        console.error(`Error adding wallet ${wallet.address}:`, error);
      }
    }
    
    console.log("Test wallet seeding completed!");
  } catch (error) {
    console.error("Database seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

// Run the seeding function
seedTestWallets(); 