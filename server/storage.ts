import { users, messages, type User, type InsertUser, type Message, type InsertMessage, type UpdateUser } from "@shared/schema";

export interface IStorage {
  getUser(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(address: string, update: UpdateUser): Promise<User>;
  getMessages(): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private userId: number;
  private messageId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.userId = 1;
    this.messageId = 1;
  }

  async getUser(address: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.address === address,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      username: insertUser.username || null,
      nickname: insertUser.nickname || null 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(address: string, update: UpdateUser): Promise<User> {
    const user = await this.getUser(address);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      ...update,
    };
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values()).sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();