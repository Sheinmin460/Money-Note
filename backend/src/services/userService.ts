import { db, type UserRow } from "../db/index.js";

export const userService = {
  getUserById(id: number) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  },

  getUserByEmail(email: string) {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  },

  createUser(username: string, email: string, passwordHash: string) {
    const info = db.prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)").run(username, email, passwordHash);
    return this.getUserById(Number(info.lastInsertRowid))!;
  }
};
