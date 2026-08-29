import { login, requestPasswordReset } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand">C</div><h1>Entrar no Capta CRM</h1><p>Acesso seguro para sua equipe.</p>
    {params.error && <div className="auth-error">E-mail ou senha inválidos.</div>}
    {params.reset && <div className="auth-success">Enviamos as instruções de recuperação.</div>}
    <form action={login}><label>E-mail<input name="email" type="email" required autoComplete="email" /></label><label>Senha<input name="password" type="password" required autoComplete="current-password" /></label><button type="submit">Entrar</button></form>
    <details><summary>Esqueci minha senha</summary><form action={requestPasswordReset}><label>E-mail<input name="email" type="email" required /></label><button type="submit">Enviar recuperação</button></form></details>
  </section></main>;
}
