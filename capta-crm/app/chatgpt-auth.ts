import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { teamMembers } from '../db/schema';

export type ChatGPTUser = { id: string; email: string; name?: string };

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const id = requestHeaders.get('oai-authenticated-user-id');
  const email = requestHeaders.get('oai-authenticated-user-email');
  if (!id || !email) return null;
  const encodedName = requestHeaders.get('oai-authenticated-user-full-name');
  const encoding = requestHeaders.get('oai-authenticated-user-full-name-encoding');
  let name: string | undefined;
  if (encodedName && encoding === 'percent-encoded-utf-8') { try { name = decodeURIComponent(encodedName); } catch { name = undefined; } }
  return { id, email, name };
}

export async function requireChatGPTUser(returnTo = '/') {
  const user = await getChatGPTUser();
  if (!user) redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
  return user;
}

export type CrmUser = ChatGPTUser & { memberId: string; role: 'manager' | 'sales' | 'admin' };

export async function getCurrentCrmUser(): Promise<CrmUser | null> {
  const user = await getChatGPTUser(); if (!user) return null;
  const db = getDb();
  let [member] = await db.select().from(teamMembers).where(eq(teamMembers.email, user.email.toLowerCase())).limit(1);
  if (!member) { const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(teamMembers); if (Number(count) === 0) { const record = { id: crypto.randomUUID(), chatgptUserId: user.id, email: user.email.toLowerCase(), name: user.name || user.email.split('@')[0], role: 'manager' as const, active: true, createdAt: new Date() }; await db.insert(teamMembers).values(record); member = record; } }
  if (!member?.active) return null;
  if (!member.chatgptUserId) { await db.update(teamMembers).set({ chatgptUserId: user.id }).where(eq(teamMembers.id, member.id)); }
  return { ...user, memberId: member.id, role: member.role };
}

export async function requireApiUser() { return getCurrentCrmUser(); }
export async function requireManager() { const user = await getCurrentCrmUser(); return user?.role === 'manager' ? user : null; }
