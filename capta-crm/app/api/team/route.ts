import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { createSupabaseAdminClient } from '../../../lib/supabase/admin';
import { requireApiUser, requireManager } from '../../chatgpt-auth';

function member(row: Record<string, any>) { return { id: row.id, email: row.email, name: row.name, role: row.role, active: row.active, createdAt: row.created_at }; }
export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.from('crm_profiles').select('*').order('name');
  if (error) return NextResponse.json({ error: 'Não foi possível carregar a equipe' }, { status: 500 });
  return NextResponse.json((data || []).map(member));
}
export async function POST(request: Request) {
  if (!await requireManager()) return NextResponse.json({ error: 'Somente gestores podem cadastrar usuários' }, { status: 403 });
  const body = await request.json() as { email?: string; name?: string; role?: 'manager' | 'sales' | 'admin' };
  const email = body.email?.trim().toLowerCase(); if (!email || !email.includes('@')) return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
  const name = body.name?.trim() || email.split('@')[0]; const role = body.role || 'sales';
  try {
    const admin = createSupabaseAdminClient();
    let userId: string | undefined;
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { name } });
    if (!inviteError) userId = invited.user?.id;
    if (!userId) {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      userId = users.users.find((user) => user.email?.toLowerCase() === email)?.id;
    }
    if (!userId) return NextResponse.json({ error: 'Não foi possível enviar o convite de acesso' }, { status: 502 });
    const { data, error } = await admin.from('crm_profiles').upsert({ id: userId, email, name, role, active: true, updated_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    return NextResponse.json(member(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Configuração privada do Supabase ainda não disponível' }, { status: 503 });
  }
}
