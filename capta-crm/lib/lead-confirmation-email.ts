import { createSupabaseAdminClient } from './supabase/admin';
import { fillTemplate } from './email-template';
export const defaultLeadConfirmation = { id: 'lead-confirmation', subject: 'Recebemos seu contato, {lead}', message: 'Olá, {lead}!\n\nRecebemos seu cadastro com sucesso. Obrigado pelo seu interesse.\n\nUma pessoa da nossa equipe entrará em contato em breve para dar sequência ao seu atendimento.\n\nAtenciosamente,\nEquipe de atendimento' };
type ConfirmationInput = { contactId: string; lead: { name: string; email: string; phone: string; company: string }; listName: string };
function escape(value: string) { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char)); }
export async function sendLeadConfirmation(input: ConfirmationInput) {
  const key = process.env.RESEND_API_KEY; if (!key || !input.lead.email || !input.lead.email.includes('@')) return;
  const admin = createSupabaseAdminClient();
  const { data: saved } = await admin.from('crm_email_settings').select('*').eq('id', defaultLeadConfirmation.id).maybeSingle();
  const settings = saved || defaultLeadConfirmation;
  const values = { lead: input.lead.name || 'Olá', lista: input.listName, email: input.lead.email, telefone: input.lead.phone, empresa: input.lead.company };
  const subject = fillTemplate(settings.subject, values); const text = fillTemplate(settings.message, values);
  const paragraphs = text.split(/\n{2,}/).map((part) => `<p style="font-size:15px;line-height:1.7;color:#4d5049;margin:0 0 18px">${escape(part).replaceAll('\n', '<br>')}</p>`).join('');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `capta-confirm-${input.contactId}-${input.lead.email}` }, body: JSON.stringify({ from: process.env.CAPTA_EMAIL_FROM || 'Luciana França <luciana.franca@mail.forttuna.com.br>', to: [input.lead.email], reply_to: process.env.CAPTA_EMAIL_REPLY_TO || 'luciana.franca@forttuna.com.br', subject, html: `<!doctype html><html><body style="margin:0;background:#f4f3f8;font-family:Arial,Helvetica,sans-serif"><table width="100%"><tr><td align="center" style="padding:34px 16px"><table width="100%" style="max-width:580px;background:#fff;border-radius:16px"><tr><td style="padding:32px">${paragraphs}</td></tr></table></td></tr></table></body></html>`, text }) });
  const result = await response.json().catch(() => ({})) as { id?: string };
  await admin.from('crm_email_delivery_logs').insert({ id: crypto.randomUUID(), contact_id: input.contactId, kind: 'lead_confirmation', recipient: input.lead.email, status: response.ok ? 'sent' : 'failed', provider_message_id: result.id || null, error_code: response.ok ? null : `resend_${response.status}` });
  if (!response.ok) throw new Error(`Resend ${response.status}`);
}
