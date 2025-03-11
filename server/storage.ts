import { users, messages, type User, type InsertUser, type Message, type InsertMessage, type UpdateUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(address: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(address: string, update: UpdateUser): Promise<User>;
  getMessages(): Promise<Message[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  addMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getUser(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.address, address));
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
    return user;
  }

  async updateUser(address: string, update: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set(update)
      .where(eq(users.address, address))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

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
}

export const storage = new DatabaseStorage();