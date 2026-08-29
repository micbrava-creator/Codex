import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../lib/supabase/server';

export type CrmUser = {
  id: string;
  email: string;
  name?: string;
  memberId: string;
  role: 'manager' | 'sales' | 'admin';
};

export async function getCurrentCrmUser(): Promise<CrmUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data: profile } = await supabase.from('crm_profiles').select('id,email,name,role,active').eq('id', user.id).maybeSingle();
  if (!profile?.active || !['manager', 'sales', 'admin'].includes(profile.role)) return null;
  return { id: user.id, email: profile.email, name: profile.name, memberId: profile.id, role: profile.role as CrmUser['role'] };
}

export async function requireChatGPTUser(returnTo = '/') {
  const user = await getCurrentCrmUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireApiUser() { return getCurrentCrmUser(); }
export async function requireManager() { const user = await getCurrentCrmUser(); return user?.role === 'manager' ? user : null; }
