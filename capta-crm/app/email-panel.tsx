"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
const variables = [
  "{vendedor}",
  "{lead}",
  "{lista}",
  "{email}",
  "{telefone}",
  "{empresa}",
];
const previewValues: Record<string, string> = {
  vendedor: "Mariana",
  lead: "Carlos Silva",
  lista: "Leads do site",
  email: "carlos@empresa.com",
  telefone: "(11) 99999-9999",
  empresa: "Empresa Exemplo",
};
function preview(text: string) {
  return Object.entries(previewValues).reduce(
    (value, [key, replacement]) => value.replaceAll(`{${key}}`, replacement),
    text,
  );
}
export default function EmailPanel({
  flash,
}: {
  flash: (message: string) => void;
}) {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [saving, setSaving] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    fetch("/api/email-settings")
      .then(
        (response) =>
          response.json() as Promise<{ subject: string; message: string }>,
      )
      .then((data) =>
        setForm({ subject: data.subject, message: data.message }),
      );
  }, []);
  function insertVariable(value: string) {
    const input = messageRef.current;
    if (!input) return setForm({ ...form, message: `${form.message}${value}` });
    const start = input.selectionStart;
    const end = input.selectionEnd;
    setForm({
      ...form,
      message: `${form.message.slice(0, start)}${value}${form.message.slice(end)}`,
    });
    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + value.length, start + value.length);
    }, 0);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/email-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    flash(
      response.ok
        ? "Mensagem de alerta salva."
        : ((await response.json()) as { error?: string }).error ||
          "Não foi possível salvar.",
    );
  }
  return (
    <div className="email-screen">
      <section className="email-hero">
        <div className="email-icon">✉</div>
        <div>
          <span className="eyebrow">ALERTA PARA O VENDEDOR</span>
          <h2>Mensagem de novo lead</h2>
          <p>
            Personalize o e-mail enviado automaticamente quando um vendedor
            recebe um lead.
          </p>
        </div>
        <span className="email-live">● Resend conectado</span>
      </section>
      <div className="email-layout">
        <form className="email-editor" onSubmit={save}>
          <label>
            Assunto do e-mail
            <input
              required
              value={form.subject}
              onChange={(event) =>
                setForm({ ...form, subject: event.target.value })
              }
              placeholder="Novo lead atribuído: {lead}"
            />
          </label>
          <label>
            Mensagem
            <textarea
              ref={messageRef}
              required
              rows={13}
              value={form.message}
              onChange={(event) =>
                setForm({ ...form, message: event.target.value })
              }
            />
          </label>
          <div className="variable-picker">
            <span>Inserir informação dinâmica</span>
            {variables.map((variable) => (
              <button
                type="button"
                key={variable}
                onClick={() => insertVariable(variable)}
              >
                {variable}
              </button>
            ))}
          </div>
          <div className="email-actions">
            <small>
              As alterações valem para os próximos alertas enviados pelas
              automações.
            </small>
            <button className="primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar mensagem"}
            </button>
          </div>
        </form>
        <section className="email-preview">
          <span className="eyebrow">PRÉVIA DO E-MAIL</span>
          <div className="preview-window">
            <header>
              <i>C</i>
              <div>
                <strong>Capta CRM</strong>
                <small>Alerta automático de novo lead</small>
              </div>
            </header>
            <div className="preview-subject">
              {preview(form.subject || "Assunto do e-mail")}
            </div>
            <article>
              {preview(form.message || "Sua mensagem aparecerá aqui.")
                .split("\n")
                .map((line, index) => (
                  <p key={index}>{line || <br />}</p>
                ))}
            </article>
            <footer>Responder para luciana.franca@forttuna.com.br</footer>
          </div>
        </section>
      </div>
    </div>
  );
}
