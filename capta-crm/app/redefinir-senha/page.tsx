import { createSupabaseServerClient } from '../../lib/supabase/server';
import { redirect } from 'next/navigation';

async function updatePassword(formData: FormData) {
  'use server';
  const password = String(formData.get('password') || '');
  if (password.length < 8) redirect('/redefinir-senha?error=curta');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/redefinir-senha?error=falha');
  redirect('/');
}

export default function ResetPasswordPage() {
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand">C</div><h1>Definir nova senha</h1><form action={updatePassword}><label>Nova senha<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><button type="submit">Salvar senha</button></form></section></main>;
}
