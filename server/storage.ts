import { users, messages, friends, type User, type InsertUser, type Message, type InsertMessage, type UpdateUser, type Friend, type InsertFriendRequest } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, lt, in } from "drizzle-orm";
import { subDays } from "date-fns";

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
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    console.log("createUser result:", user);
    return user;
  }

  async updateUser(address: string, update: UpdateUser): Promise<User> {
    console.log("Updating user with address:", address);
    console.log("Update data:", update);

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
      .values(insertMessage)
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
          messages.toAddress.notNull,
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
    const [friend] = await db
      .update(friends)
      .set({ status: 'accepted' })
      .where(eq(friends.id, requestId))
      .returning();

    if (!friend) {
      throw new Error("Friend request not found");
    }

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
    try {
      // Get all friendships where this user is involved and status is accepted
      const friendships = await db
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

      // If no friendships, return empty array
      if (!friendships || friendships.length === 0) {
        return [];
      }

      // Extract the addresses of friends
      const friendAddresses = friendships.map(friendship =>
        friendship.requestorAddress === address
          ? friendship.recipientAddress
          : friendship.requestorAddress
      );

      // Get the user objects for these addresses if there are any friend addresses
      if (friendAddresses.length === 0) {
        return [];
      }

      const friendUsers = await db
        .select()
        .from(users)
        .where(
          in(users.address, friendAddresses)
        );

      return Array.isArray(friendUsers) ? friendUsers : [];
    } catch (error) {
      console.error('Error in getFriends:', error);
      return [];
    }
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
}

export const storage = new DatabaseStorage();