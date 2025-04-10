import { users, messages, friends, type User, type InsertUser, type Message, type InsertMessage, type UpdateUser, type Friend, type InsertFriendRequest } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, lt, not, isNull } from "drizzle-orm";
import { subDays } from "date-fns";
import { reactions, type Reaction, type InsertReaction } from "@shared/schema";
import { nations, type Nation, type InsertNation } from "@shared/schema";

// Rename the interface to match the implementation
interface StorageInterface {
  getUser(address: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(address: string, update: UpdateUser): Promise<User>;
  updateOnlineStatus(address: string, isOnline: boolean): Promise<void>;
  updateUserNation(address: string, nationCode: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  getMessages(): Promise<Message[]>;
  getGlobalMessages(): Promise<Message[]>;
  getNationMessages(nationId: number): Promise<Message[]>;
  clearMessages(): Promise<void>;
  cleanupOldMessages(): Promise<void>;
  sendFriendRequest(request: InsertFriendRequest): Promise<Friend>;
  acceptFriendRequest(id: number): Promise<Friend>;
  getFriendRequests(address: string): Promise<Friend[]>;
  getFriends(address: string): Promise<User[]>;
  checkFriendship(address1: string, address2: string): Promise<boolean>;
  addReaction(reaction: InsertReaction): Promise<Reaction>;
  getReactions(messageId: number): Promise<Reaction[]>;
  getReactionById(id: number): Promise<Reaction | undefined>;
  removeReaction(id: number): Promise<void>;
  createNation(nation: InsertNation): Promise<Nation>;
  getNation(id: number): Promise<Nation | undefined>;
  getNationByCode(code: string): Promise<Nation | undefined>;
  getAllNations(): Promise<Nation[]>;
  getActiveNations(): Promise<Nation[]>;
}

export class DatabaseStorage implements StorageInterface {
  async getUser(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.address, address));
    console.log("getUser result:", user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log("Looking up user by username:", username);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    console.log("getUserByUsername result:", user);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("Starting createUser with data:", insertUser);
    try {
      if (insertUser.username) {
        console.log("Checking if username is already taken:", insertUser.username);
        const existingUser = await this.getUserByUsername(insertUser.username);
        if (existingUser) {
          console.log("Username already taken by:", existingUser);
          throw new Error("Username already taken");
        }
      }
      
      console.log("Inserting new user into database");
      const [user] = await db.insert(users).values({
        ...insertUser,
        isOnline: true,
        lastSeen: new Date()
      }).returning();
      
      console.log("User created successfully:", user);
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }

  async updateUser(address: string, update: UpdateUser): Promise<User> {
    console.log("Updating user with address:", address);
    console.log("Update data:", update);

    // First explicitly check if user exists with this address
    try {
      const existingUsersList = await db
        .select()
        .from(users)
        .where(eq(users.address, address));
      
      console.log("Found users with this address:", existingUsersList.length);
      console.log("Existing users:", JSON.stringify(existingUsersList, null, 2));
      
      if (existingUsersList.length === 0) {
        console.error(`No user found with address: ${address}`);
        throw new Error("User not found");
      }
    } catch (error) {
      console.error("Error checking if user exists:", error);
      throw new Error(`Failed to verify user existence: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (update.username) {
      try {
        const existingUser = await this.getUserByUsername(update.username);
        if (existingUser && existingUser.address !== address) {
          throw new Error("Username already taken");
        }
      } catch (error) {
        console.error("Error checking username:", error);
        throw new Error(`Username check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Create a clean update object with only defined values
    const cleanUpdate: Record<string, any> = {};
    
    // Explicitly set each property, handling null values correctly
    if (update.username !== undefined) {
      cleanUpdate.username = update.username;
    }
    
    if (update.nickname !== undefined) {
      cleanUpdate.nickname = update.nickname;
    }
    
    console.log("Clean update data for database:", cleanUpdate);

    try {
      const updatedRows = await db
        .update(users)
        .set(cleanUpdate)
        .where(eq(users.address, address))
        .returning();
      
      console.log("Update query executed, returned rows:", updatedRows.length);
      console.log("Updated rows:", JSON.stringify(updatedRows, null, 2));

      if (!updatedRows.length) {
        throw new Error("User not found or no rows updated");
      }

      const [user] = updatedRows;
      console.log("updateUser result:", user);
      return user;
    } catch (error) {
      console.error("Database update operation failed:", error);
      throw new Error(`Database update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateOnlineStatus(address: string, isOnline: boolean): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          isOnline,
          lastSeen: new Date()
        })
        .where(eq(users.address, address));
    } catch (error) {
      console.error(`Failed to update online status for ${address}:`, error);
      throw error;
    }
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(messages.timestamp);
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        read: false,
        timestamp: new Date()
      })
      .returning();
    return message;
  }

  async clearMessages(): Promise<void> {
    await db.delete(messages);
  }

  async cleanupOldMessages(): Promise<void> {
    const thirtyDaysAgo = subDays(new Date(), 30);
    await db.delete(messages).where(lt(messages.timestamp, thirtyDaysAgo));
  }

  async sendFriendRequest(request: InsertFriendRequest): Promise<Friend> {
    const [friendRequest] = await db
      .insert(friends)
      .values({ ...request, status: 'pending' })
      .returning();
    return friendRequest;
  }

  async acceptFriendRequest(requestId: number): Promise<Friend> {
    console.log('Accepting friend request in storage:', requestId);
    const [friend] = await db
      .update(friends)
      .set({ status: 'accepted' })
      .where(eq(friends.id, requestId))
      .returning();

    if (!friend) {
      throw new Error("Friend request not found");
    }

    console.log('Friend request updated in database:', friend);
    return friend;
  }

  async getFriendRequests(address: string): Promise<Friend[]> {
    return await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.recipientAddress, address),
          eq(friends.status, 'pending')
        )
      );
  }

  async getFriends(address: string): Promise<User[]> {
    console.log('Getting friends for address:', address);
    const acceptedFriends = await db
      .select()
      .from(friends)
      .where(
        and(
          or(
            eq(friends.requestorAddress, address),
            eq(friends.recipientAddress, address)
          ),
          eq(friends.status, 'accepted')
        )
      );

    console.log('Found accepted friends:', acceptedFriends);

    if (acceptedFriends.length === 0) {
      return [];
    }

    const friendAddresses = acceptedFriends.map(f =>
      f.requestorAddress === address ? f.recipientAddress : f.requestorAddress
    );

    const friendUsers = await db
      .select()
      .from(users)
      .where(
        or(
          ...friendAddresses.map(addr => eq(users.address, addr))
        )
      );

    console.log('Retrieved friend users:', friendUsers);
    return friendUsers;
  }

  async checkFriendship(address1: string, address2: string): Promise<boolean> {
    const [friendship] = await db
      .select()
      .from(friends)
      .where(
        and(
          or(
            and(
              eq(friends.requestorAddress, address1),
              eq(friends.recipientAddress, address2)
            ),
            and(
              eq(friends.requestorAddress, address2),
              eq(friends.recipientAddress, address1)
            )
          ),
          eq(friends.status, 'accepted')
        )
      );

    return !!friendship;
  }

  async addReaction(reaction: InsertReaction): Promise<Reaction> {
    const [newReaction] = await db
      .insert(reactions)
      .values(reaction)
      .returning();
    return newReaction;
  }

  async getReactions(messageId: number): Promise<Reaction[]> {
    return await db
      .select()
      .from(reactions)
      .where(eq(reactions.messageId, messageId))
      .orderBy(reactions.timestamp);
  }

  async getReactionById(id: number): Promise<Reaction | undefined> {
    const result = await db
      .select()
      .from(reactions)
      .where(eq(reactions.id, id))
      .limit(1);
    
    return result[0];
  }

  async removeReaction(reactionId: number): Promise<void> {
    await db
      .delete(reactions)
      .where(eq(reactions.id, reactionId));
  }

  async updateUserNation(address: string, nationCode: string): Promise<User> {
    try {
      const nation = await this.getNationByCode(nationCode);
      if (!nation) {
        throw new Error(`Nation with code ${nationCode} not found`);
      }
      
      const [user] = await db
        .update(users)
        .set({
          preferredNation: nationCode,
          nation: nationCode
        })
        .where(eq(users.address, address))
        .returning();
      
      if (!user) {
        throw new Error(`User with address ${address} not found`);
      }
      
      return user;
    } catch (error) {
      console.error(`Failed to update nation for ${address}:`, error);
      throw error;
    }
  }

  async getGlobalMessages(): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.isGlobal, true))
      .orderBy(messages.timestamp);
  }

  async getNationMessages(nationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.nationId, nationId))
      .orderBy(messages.timestamp);
  }

  async createNation(insertNation: InsertNation): Promise<Nation> {
    const [nation] = await db
      .insert(nations)
      .values(insertNation)
      .returning();
    return nation;
  }

  async getNation(id: number): Promise<Nation | undefined> {
    const [nation] = await db
      .select()
      .from(nations)
      .where(eq(nations.id, id));
    return nation;
  }

  async getNationByCode(code: string): Promise<Nation | undefined> {
    const [nation] = await db
      .select()
      .from(nations)
      .where(eq(nations.code, code));
    return nation;
  }

  async getAllNations(): Promise<Nation[]> {
    return await db
      .select()
      .from(nations);
  }

  async getActiveNations(): Promise<Nation[]> {
    return await db
      .select()
      .from(nations)
      .where(eq(nations.active, true));
  }
}

export const storage = new DatabaseStorage();

// Create a mock storage implementation for offline mode
class MockStorage implements StorageInterface {
  private users: Map<string, User> = new Map();
  private messages: Message[] = [];
  private friendRequests: Friend[] = [];
  private reactionCounter = 0;
  private reactions: Reaction[] = [];

  async getUser(address: string): Promise<User | undefined> {
    return this.users.get(address);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.users.size + 1;
    const user: User = {
      id,
      address: insertUser.address,
      username: insertUser.username,
      nickname: insertUser.nickname,
      isOnline: true,
      lastSeen: new Date()
    };
    this.users.set(insertUser.address, user);
    return user;
  }

  async updateUser(address: string, update: UpdateUser): Promise<User> {
    const user = this.users.get(address);
    if (!user) {
      throw new Error("User not found");
    }
    const updatedUser = { ...user, ...update };
    this.users.set(address, updatedUser);
    return updatedUser;
  }

  async updateOnlineStatus(address: string, isOnline: boolean): Promise<void> {
    const user = this.users.get(address);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(address, user);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const newMessage: Message = {
      id: this.messages.length + 1,
      content: message.content,
      fromAddress: message.fromAddress,
      toAddress: message.toAddress,
      timestamp: new Date(),
      read: false
    };
    this.messages.push(newMessage);
    return newMessage;
  }

  async getMessages(): Promise<Message[]> {
    return this.messages;
  }

  async clearMessages(): Promise<void> {
    this.messages = [];
  }

  async cleanupOldMessages(): Promise<void> {
    // No-op for mock
  }

  async sendFriendRequest(request: InsertFriendRequest): Promise<Friend> {
    const newRequest: Friend = {
      id: this.friendRequests.length + 1,
      requestorAddress: request.requestorAddress,
      recipientAddress: request.recipientAddress,
      status: 'pending',
      timestamp: new Date()
    };
    this.friendRequests.push(newRequest);
    return newRequest;
  }

  async acceptFriendRequest(id: number): Promise<Friend> {
    const request = this.friendRequests.find(req => req.id === id);
    if (!request) {
      throw new Error("Friend request not found");
    }
    request.status = 'accepted';
    return request;
  }

  async getFriendRequests(address: string): Promise<Friend[]> {
    return this.friendRequests.filter(req => req.recipientAddress === address && req.status === 'pending');
  }

  async getFriends(address: string): Promise<User[]> {
    const acceptedRequests = this.friendRequests.filter(
      req => (req.requestorAddress === address || req.recipientAddress === address) && req.status === 'accepted'
    );
    
    const friendAddresses = acceptedRequests.map(req => 
      req.requestorAddress === address ? req.recipientAddress : req.requestorAddress
    );
    
    return Array.from(this.users.values()).filter(user => friendAddresses.includes(user.address));
  }

  async checkFriendship(address1: string, address2: string): Promise<boolean> {
    return this.friendRequests.some(
      req => ((req.requestorAddress === address1 && req.recipientAddress === address2) ||
              (req.requestorAddress === address2 && req.recipientAddress === address1)) &&
              req.status === 'accepted'
    );
  }

  async addReaction(reaction: InsertReaction): Promise<Reaction> {
    this.reactionCounter++;
    const newReaction: Reaction = {
      id: this.reactionCounter,
      messageId: reaction.messageId,
      fromAddress: reaction.fromAddress,
      emoji: reaction.emoji,
      timestamp: new Date()
    };
    this.reactions.push(newReaction);
    return newReaction;
  }

  async getReactions(messageId: number): Promise<Reaction[]> {
    return this.reactions.filter(r => r.messageId === messageId);
  }

  async getReactionById(id: number): Promise<Reaction | undefined> {
    return this.reactions.find(r => r.id === id);
  }

  async removeReaction(id: number): Promise<void> {
    const index = this.reactions.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reactions.splice(index, 1);
    }
  }

  async updateUserNation(address: string, nationCode: string): Promise<User> {
    // Implementation needed for mock storage
    throw new Error("Method not implemented in mock storage");
  }

  async getGlobalMessages(): Promise<Message[]> {
    // Implementation needed for mock storage
    throw new Error("Method not implemented in mock storage");
  }

  async getNationMessages(nationId: number): Promise<Message[]> {
    // Implementation needed for mock storage
    throw new Error("Method not implemented in mock storage");
  }

  async createNation(nation: InsertNation): Promise<Nation> {
    // Implementation needed for mock storage
    throw new Error("Method not implemented in mock storage");
  }

  async getNation(id: number): Promise<Nation | undefined> {
    // Implementation needed for mock storage
    throw new Error("Method not implemented in mock storage");
  }

  async getNationByCode(code: string): Promise<Nation | undefined> {
    // Implementation needed for mock storage
    throw new Error("Method not implemented in mock storage");
  }

  async getAllNations(): Promise<Nation[]> {
    // Implementation needed for mock storage
    throw new Error("Method not implemented in mock storage");
  }

  async getActiveNations(): Promise<Nation[]> {
    // Implementation needed for mock storage
    throw new Error("Method not implemented in mock storage");
  }
}

// Create fallback storage for when database is not available
export const mockStorage = new MockStorage();

// Export a function to get the appropriate storage implementation
export function getStorage(): StorageInterface {
  try {
    // Try connecting to the database with a simple query
    db.select().from(users).limit(1);
    return storage; // Return real storage if db works
  } catch (error) {
    console.warn("Using mock storage due to database connection issue");
    return mockStorage; // Return mock storage if db fails
  }
}