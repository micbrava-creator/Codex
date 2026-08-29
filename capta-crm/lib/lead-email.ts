import { createSupabaseAdminClient } from './supabase/admin';
import { defaultEmailSettings, fillTemplate } from './email-template';
type LeadEmail = { contactId: string; seller: { name: string; email: string }; lead: { name: string; email: string; phone: string; company: string }; listName: string };
function escape(value: string) { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char)); }
export async function notifySeller(input: LeadEmail) {
  const key = process.env.RESEND_API_KEY; if (!key) return;
  const admin = createSupabaseAdminClient();
  const { data: saved } = await admin.from('crm_email_settings').select('*').eq('id', defaultEmailSettings.id).maybeSingle();
  const settings = saved || defaultEmailSettings;
  const values = { vendedor: input.seller.name, lead: input.lead.name || input.lead.email || input.lead.phone || 'Novo lead', lista: input.listName, email: input.lead.email, telefone: input.lead.phone, empresa: input.lead.company };
  const subject = fillTemplate(settings.subject, values); const text = fillTemplate(settings.message, values);
  const paragraphs = text.split(/\n{2,}/).map((part) => `<p style="font-size:14px;line-height:1.65;color:#55574f;margin:0 0 16px">${escape(part).replaceAll('\n', '<br>')}</p>`).join('');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `capta-lead-${input.contactId}-${input.seller.email}` }, body: JSON.stringify({ from: process.env.CAPTA_EMAIL_FROM || 'Luciana França <luciana.franca@mail.forttuna.com.br>', to: [input.seller.email], reply_to: process.env.CAPTA_EMAIL_REPLY_TO || 'luciana.franca@forttuna.com.br', subject, html: `<!doctype html><html><body style="margin:0;background:#f4f3f8;font-family:Arial,Helvetica,sans-serif"><table width="100%"><tr><td align="center" style="padding:32px 16px"><table width="100%" style="max-width:560px;background:#fff;border-radius:14px"><tr><td style="padding:28px"><p style="font-size:12px;color:#6d5dfb;font-weight:700">CAPTA CRM</p>${paragraphs}</td></tr></table></td></tr></table></body></html>`, text }) });
  const result = await response.json().catch(() => ({})) as { id?: string };
  await admin.from('crm_email_delivery_logs').insert({ id: crypto.randomUUID(), contact_id: input.contactId, kind: 'seller_alert', recipient: input.seller.email, status: response.ok ? 'sent' : 'failed', provider_message_id: result.id || null, error_code: response.ok ? null : `resend_${response.status}` });
  if (!response.ok) throw new Error(`Resend ${response.status}`);
}
