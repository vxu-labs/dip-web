import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const githubSessions=sqliteTable('github_sessions',{
 id:text('id').primaryKey(),
 userId:text('user_id').notNull(),
 login:text('login').notNull(),
 token:text('token').notNull(),
 expiresAt:integer('expires_at').notNull(),
 createdAt:integer('created_at').notNull(),
});
export const oauthStates=sqliteTable('oauth_states',{
 id:text('id').primaryKey(),
 verifier:text('verifier').notNull(),
 expiresAt:integer('expires_at').notNull(),
});
