import CrmClient from './crm-client';
import { getCurrentCrmUser, requireChatGPTUser } from './chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await requireChatGPTUser('/');
  const member = await getCurrentCrmUser();
  if (!member) return <main className="access-denied"><div><span>C</span><h1>Acesso ainda não liberado</h1><p>Peça ao gestor do Capta CRM para cadastrar o e-mail desta conta ChatGPT na equipe.</p><a href="/signout-with-chatgpt?return_to=/">Trocar de conta</a></div></main>;
  return <CrmClient />;
}
