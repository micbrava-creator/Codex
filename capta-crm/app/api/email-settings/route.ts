import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { requireApiUser, requireManager } from '../../chatgpt-auth';
import { defaultEmailSettings } from '../../../lib/email-template';

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('crm_email_settings').select('*').eq('id', defaultEmailSettings.id).maybeSingle();
  return NextResponse.json(data || defaultEmailSettings);
}
export async function PATCH(request: Request) {
  const manager = await requireManager();
  if (!manager) return NextResponse.json({ error: 'Somente o gestor pode editar esta mensagem' }, { status: 403 });
  const body = await request.json() as { subject?: string; message?: string };
  const subject = body.subject?.trim(); const message = body.message?.trim();
  if (!subject || !message) return NextResponse.json({ error: 'Assunto e mensagem são obrigatórios' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('crm_email_settings').upsert({ id: defaultEmailSettings.id, subject, message, updated_by: manager.memberId, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: 'Não foi possível salvar' }, { status: 500 });
  return NextResponse.json({ ...defaultEmailSettings, subject, message });
}
