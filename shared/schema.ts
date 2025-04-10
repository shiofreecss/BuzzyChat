import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define all tables first
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  username: text("username").unique(),
  nickname: text("nickname"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  nation: text("nation"),
  preferredNation: text("preferred_nation"),
});

// Nations table to keep track of available chat rooms
export const nations = pgTable("nations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  displayName: text("display_name").notNull(),
  active: boolean("active").default(true),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  read: boolean("read").default(false),
  nationId: integer("nation_id"),
  isGlobal: boolean("is_global").default(false),
});

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  requestorAddress: text("requestor_address").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  status: text("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  messageId: serial("message_id").notNull(),
  fromAddress: text("from_address").notNull(),
  emoji: text("emoji").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Then define the schemas
const usernameSchema = z.string().nullable().refine(
  (val) => !val || (
    val.length >= 4 && 
    val.length <= 20 && 
    /^[a-zA-Z0-9_]+$/.test(val)
  ),
  {
    message: "Username must be 4-20 characters and can only contain letters, numbers, and underscores"
  }
);

const nicknameSchema = z.string().nullable().refine(
  (val) => !val || (
    val.length >= 1 && 
    val.length <= 30 && 
    /^[a-zA-Z0-9_\s]+$/.test(val)
  ),
  {
    message: "Nickname can only contain letters, numbers, underscores, and spaces"
  }
);

// Wallet address validation that properly handles Ethereum addresses
const walletAddressSchema = z.string()
  .trim()
  .refine(
    (val) => val.length > 0, 
    { message: "Wallet address cannot be empty" }
  );

export const insertUserSchema = createInsertSchema(users).pick({
  address: true,
  username: true,
  nickname: true,
  nation: true,
  preferredNation: true,
}).extend({
  username: usernameSchema,
  nickname: nicknameSchema,
  address: walletAddressSchema,
  nation: z.string().nullable(),
  preferredNation: z.string().nullable(),
});

export const updateUserSchema = createInsertSchema(users).pick({
  username: true,
  nickname: true,
  nation: true,
  preferredNation: true,
}).extend({
  username: usernameSchema,
  nickname: nicknameSchema,
  nation: z.string().nullable(),
  preferredNation: z.string().nullable(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  fromAddress: true,
  toAddress: true,
  nationId: true,
  isGlobal: true,
});

export const insertFriendRequestSchema = createInsertSchema(friends).pick({
  requestorAddress: true,
  recipientAddress: true,
}).extend({
  status: z.literal('pending')
});

export const insertReactionSchema = createInsertSchema(reactions).pick({
  messageId: true,
  fromAddress: true,
  emoji: true,
});

export const insertNationSchema = createInsertSchema(nations).pick({
  name: true,
  code: true,
  displayName: true,
  active: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Friend = typeof friends.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;
export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Nation = typeof nations.$inferSelect;
export type InsertNation = z.infer<typeof insertNationSchema>;