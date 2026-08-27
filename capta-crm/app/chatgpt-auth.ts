import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

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

export async function requireApiUser() { return getChatGPTUser(); }
