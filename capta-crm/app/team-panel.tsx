"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
type Member = {
  id: string;
  name: string;
  email: string;
  role: "manager" | "sales" | "admin";
  active: boolean;
};
const roleNames = {
  manager: "Gestor geral",
  sales: "Vendedor",
  admin: "Administrativo",
};
export default function TeamPanel({
  flash,
}: {
  flash: (message: string) => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "sales" as Member["role"],
  });
  const load = useCallback(async () => {
    const response = await fetch("/api/team");
    setMembers((await response.json()) as Member[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function add(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok)
      return flash(
        ((await response.json()) as { error?: string }).error ||
          "Não foi possível cadastrar.",
      );
    setForm({ name: "", email: "", role: "sales" });
    await load();
    flash("Integrante cadastrado. O convite de acesso foi enviado por e-mail.");
  }
  async function update(id: string, values: Partial<Member>) {
    const response = await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) return flash("Somente o gestor pode alterar a equipe.");
    await load();
    flash("Equipe atualizada.");
  }
  return (
    <div className="team-screen">
      <section className="team-hero">
        <div>
          <span className="eyebrow">GESTÃO DE ACESSOS</span>
          <h2>Equipe do Capta</h2>
          <p>Cadastre o e-mail profissional de cada integrante da equipe.</p>
        </div>
        <span>{members.filter((member) => member.active).length} ativos</span>
      </section>
      <div className="team-layout">
        <form className="add-member-card" onSubmit={add}>
          <h3>Adicionar integrante</h3>
          <label>
            Nome
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Nome completo"
            />
          </label>
          <label>
            E-mail de acesso
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="nome@empresa.com"
            />
          </label>
          <label>
            Perfil
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as Member["role"] })
              }
            >
              <option value="sales">Vendedor</option>
              <option value="admin">Administrativo</option>
              <option value="manager">Gestor geral</option>
            </select>
          </label>
          <button className="primary">Cadastrar acesso</button>
          <small>
            O acesso é individual e protegido pelo Supabase Auth. As senhas não
            ficam armazenadas no CRM.
          </small>
        </form>
        <section className="member-list">
          <header>
            <strong>Integrantes</strong>
            <span>Perfil e situação de acesso</span>
          </header>
          {members.map((member) => (
            <article
              key={member.id}
              className={!member.active ? "inactive" : ""}
            >
              <span className="member-avatar">
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
                <em>{member.active ? "Acesso ativo" : "Acesso desativado"}</em>
              </div>
              <select
                value={member.role}
                onChange={(event) =>
                  update(member.id, {
                    role: event.target.value as Member["role"],
                  })
                }
              >
                <option value="manager">Gestor geral</option>
                <option value="sales">Vendedor</option>
                <option value="admin">Administrativo</option>
              </select>
              <button
                className={
                  member.active ? "member-toggle" : "member-toggle enable"
                }
                onClick={() => update(member.id, { active: !member.active })}
              >
                {member.active ? "Desativar" : "Ativar"}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
