#!/usr/bin/env node
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkUsers() {
  console.log("Checking users in the database...");
  
  try {
    // Select all users
    const allUsers = await db.select().from(users);
    console.log("Total users found:", allUsers.length);
    console.log("Users:", JSON.stringify(allUsers, null, 2));
    
    // Check specific test user
    const address = "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E";
    console.log(`\nChecking specific user with address: ${address}`);
    const user = await db.select().from(users).where(eq(users.address, address));
    console.log("User found:", JSON.stringify(user, null, 2));
    
  } catch (error) {
    console.error("Error checking users:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
checkUsers(); 