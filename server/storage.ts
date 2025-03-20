import { users, messages, friends, type User, type InsertUser, type Message, type InsertMessage, type UpdateUser, type Friend, type InsertFriendRequest } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, lt, not } from "drizzle-orm";
import { subDays } from "date-fns";
import { reactions, type Reaction, type InsertReaction } from "@shared/schema";

export interface IStorage {
  getUser(address: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(address: string, update: UpdateUser): Promise<User>;
  getMessages(): Promise<Message[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  addMessage(message: InsertMessage): Promise<Message>;
  clearMessages(): Promise<void>;
  cleanupOldMessages(): Promise<void>;
  // Friend request methods
  sendFriendRequest(request: InsertFriendRequest): Promise<Friend>;
  acceptFriendRequest(requestId: number): Promise<Friend>;
  getFriendRequests(address: string): Promise<Friend[]>;
  getFriends(address: string): Promise<User[]>;
  checkFriendship(address1: string, address2: string): Promise<boolean>;
  // Add reaction methods
  addReaction(reaction: InsertReaction): Promise<Reaction>;
  getReactions(messageId: number): Promise<Reaction[]>;
  removeReaction(reactionId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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
    if (insertUser.username) {
      const existingUser = await this.getUserByUsername(insertUser.username);
      if (existingUser) {
        throw new Error("Username already taken");
      }
    }
    const [user] = await db.insert(users).values({
      ...insertUser,
      isOnline: true,
      lastSeen: new Date()
    }).returning();
    console.log("createUser result:", user);
    return user;
  }

  async updateUser(address: string, update: UpdateUser): Promise<User> {
    console.log("Updating user with address:", address);
    console.log("Update data:", update);

    if (update.username) {
      const existingUser = await this.getUserByUsername(update.username);
      if (existingUser && existingUser.address !== address) {
        throw new Error("Username already taken");
      }
    }

    const [user] = await db
      .update(users)
      .set(update)
      .where(eq(users.address, address))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    console.log("updateUser result:", user);
    return user;
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
    const sixtyDaysAgo = subDays(new Date(), 60);

    // Delete public messages older than 30 days
    await db.delete(messages)
      .where(
        and(
          eq(messages.toAddress, null),
          lt(messages.timestamp, thirtyDaysAgo)
        )
      );

    // Delete private messages older than 60 days
    await db.delete(messages)
      .where(
        and(
          not(eq(messages.toAddress, null)),
          lt(messages.timestamp, sixtyDaysAgo)
        )
      );
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

  async removeReaction(reactionId: number): Promise<void> {
    await db
      .delete(reactions)
      .where(eq(reactions.id, reactionId));
  }
}

export const storage = new DatabaseStorage();