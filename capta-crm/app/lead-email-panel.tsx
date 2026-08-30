"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
const variables = ["{lead}", "{lista}", "{email}", "{telefone}", "{empresa}"];
const examples: Record<string, string> = {
  lead: "Carlos Silva",
  lista: "Interesse no produto",
  email: "carlos@empresa.com",
  telefone: "(11) 99999-9999",
  empresa: "Empresa Exemplo",
};
function preview(text: string) {
  return Object.entries(examples).reduce(
    (value, [key, example]) => value.replaceAll(`{${key}}`, example),
    text,
  );
}
export default function LeadEmailPanel({
  flash,
}: {
  flash: (message: string) => void;
}) {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [saving, setSaving] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    fetch("/api/lead-email-settings")
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
    if (!input) return;
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
    const response = await fetch("/api/lead-email-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    flash(
      response.ok
        ? "Mensagem de confirmação salva."
        : ((await response.json()) as { error?: string }).error ||
          "Não foi possível salvar.",
    );
  }
  return (
    <div className="email-screen">
      <section className="email-hero lead-confirmation-hero">
        <div className="email-icon">✓</div>
        <div>
          <span className="eyebrow">E-MAIL PARA O LEAD</span>
          <h2>Confirmação de cadastro</h2>
          <p>
            Crie a mensagem profissional enviada automaticamente ao contato após
            a entrada na lista.
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
              placeholder="Recebemos seu contato, {lead}"
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
            <span>Inserir informação do cadastro</span>
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
              Ative ou desative o envio individualmente para cada lista na aba
              Automação.
            </small>
            <button className="primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar template"}
            </button>
          </div>
        </form>
        <section className="email-preview">
          <span className="eyebrow">PRÉVIA PROFISSIONAL</span>
          <div className="preview-window lead-preview">
            <header>
              <i>C</i>
              <div>
                <strong>Equipe de atendimento</strong>
                <small>Confirmação automática</small>
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
