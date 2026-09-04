"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PipelineBoard from "./pipeline-board";
import AutomationPanel from "./automation-panel";
import TeamPanel from "./team-panel";
import EmailPanel from "./email-panel";
import LeadEmailPanel from "./lead-email-panel";
import DashboardPanel from "./dashboard-panel";
import AgendaPanel from "./agenda-panel";
import ProductsPanel from "./products-panel";
import ProductTracksPanel from "./product-tracks-panel";
import CustomerJourneyPanel from "./customer-journey-panel";
import { logout } from "./login/actions";
import "./pipeline.css";
import "./enhancements.css";
import "./polish.css";
import "./team.css";
import "./automation-flow.css";
import "./email-panel.css";
import "./pipeline-values.css";
import "./dashboard.css";
import "./dashboard-ranking.css";
import "./contact-choice.css";
import "./stage-contact.css";
import "./dashboard-sorting.css";
import "./responsive.css";
import "./aesthetic-refresh.css";
import "./agenda.css";
import "./follow-up.css";
import "./follow-up-per-list.css";
import "./commerce.css";

type ContactList = {
  id: string;
  name: string;
  segment: string;
  color: string;
  webhookToken: string;
  pipelineId: string | null;
  routingStageId: string | null;
  assignmentMode: "manual" | "fixed" | "round_robin";
  fixedSellerId: string | null;
  rotationMemberIds: string[];
  emailAlertsEnabled: boolean;
  confirmationEmailEnabled: boolean;
  followUpEnabled: boolean;
  firstFollowUpDelayMinutes: number;
  followUpIntervalMinutes: number;
  followUpTitle: string;
  followUpNotes: string;
  nextFollowUpTitle: string;
  nextFollowUpNotes: string;
  contactCount: number;
};
type Contact = {
  id: string;
  listId: string;
  assignedUserId: string | null;
  assignedSeller: { id: string; name: string; email: string } | null;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  source: string;
  createdAt: string;
};
type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};
type PipelineOption = {
  id: string;
  name: string;
  color: string;
  stages: { id: string; name: string }[];
};
const emptyContact = {
  listId: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
  assignedUserId: "",
};
const WEBHOOK_BASE_URL = "https://capta-crm-webhooks.michelbrasio.chatgpt.site";
const colors = ["#5B5BD6", "#F26B4A", "#2F9C75", "#D99A2B", "#A455C2"];

type ImportContact = {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
};
const headerAliases: Record<keyof ImportContact, string[]> = {
  name: ["nome", "name", "nome completo", "full name"],
  email: ["email", "e-mail"],
  phone: ["telefone", "phone", "celular", "whatsapp"],
  company: ["empresa", "company"],
  notes: ["observacoes", "observações", "notes", "mensagem"],
};
function readCsvLine(line: string, separator: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) {
      current += '"';
      index++;
    } else if (char === '"') quoted = !quoted;
    else if (char === separator && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}
function parseCsv(text: string): ImportContact[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) return [];
  const separator =
    (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const headers = readCsvLine(lines[0], separator).map((header) =>
    header.toLowerCase().trim(),
  );
  const indexes = Object.fromEntries(
    Object.entries(headerAliases).map(([key, aliases]) => [
      key,
      headers.findIndex((header) => aliases.includes(header)),
    ]),
  ) as Record<keyof ImportContact, number>;
  return lines
    .slice(1)
    .map((line) => {
      const cells = readCsvLine(line, separator);
      return {
        name: cells[indexes.name] ?? "",
        email: (cells[indexes.email] ?? "").toLowerCase(),
        phone: cells[indexes.phone] ?? "",
        company: cells[indexes.company] ?? "",
        notes: cells[indexes.notes] ?? "",
      };
    })
    .filter((contact) => contact.name || contact.email || contact.phone);
}
function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export default function Home() {
  const [view, setView] = useState<
    | "dashboard"
    | "contacts"
    | "automation"
    | "pipelines"
    | "agenda"
    | "team"
    | "email"
    | "lead-email"
    | "products"
    | "product-tracks"
    | "journey"
  >("contacts");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [pipelineOptions, setPipelineOptions] = useState<PipelineOption[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [listModal, setListModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [listForm, setListForm] = useState({
    name: "",
    segment: "",
    color: colors[0],
    pipelineId: "",
    routingStageId: "",
    followUpEnabled: true,
    firstFollowUpDelayMinutes: 15,
    followUpIntervalMinutes: 2880,
    followUpTitle: "Entrar em contato com {{lead}}",
    followUpNotes: "",
    nextFollowUpTitle: "Retomar contato com {{lead}}",
    nextFollowUpNotes: "",
  });
  const [contactForm, setContactForm] = useState(emptyContact);
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState<ImportContact[]>([]);
  const [importFile, setImportFile] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = lists.find((list) => list.id === selectedId) ?? lists[0];

  const loadLists = useCallback(async () => {
    const response = await fetch("/api/lists");
    const data = (await response.json()) as ContactList[];
    setLists(data);
    setSelectedId((current) => current || data[0]?.id || "");
    setLoading(false);
  }, []);
  const loadPipelineOptions = useCallback(async () => {
    const response = await fetch("/api/pipelines");
    const data = (await response.json()) as PipelineOption[];
    setPipelineOptions(data);
  }, []);
  const loadContacts = useCallback(async (listId: string) => {
    if (!listId) return setContacts([]);
    const response = await fetch(
      `/api/contacts?listId=${encodeURIComponent(listId)}`,
    );
    setContacts((await response.json()) as Contact[]);
  }, []);
  useEffect(() => {
    loadLists().catch(() => setLoading(false));
  }, [loadLists]);
  useEffect(() => {
    loadPipelineOptions();
    fetch("/api/team")
      .then((response) => response.json())
      .then((data) => setTeam(data as TeamMember[]));
  }, [loadPipelineOptions]);
  useEffect(() => {
    if (selected?.id) loadContacts(selected.id);
  }, [selected?.id, loadContacts]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? contacts.filter((contact) =>
          [contact.name, contact.email, contact.phone, contact.company].some(
            (value) => value.toLowerCase().includes(term),
          ),
        )
      : contacts;
  }, [contacts, search]);
  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  async function saveList(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listForm),
    });
    if (!response.ok) return flash("Não foi possível criar a lista.");
    const created = (await response.json()) as ContactList;
    setListModal(false);
    setListForm({
      name: "",
      segment: "",
      color: colors[(lists.length + 1) % colors.length],
      pipelineId: "",
      routingStageId: "",
      followUpEnabled: true,
      firstFollowUpDelayMinutes: 15,
      followUpIntervalMinutes: 2880,
      followUpTitle: "Entrar em contato com {{lead}}",
      followUpNotes: "",
      nextFollowUpTitle: "Retomar contato com {{lead}}",
      nextFollowUpNotes: "",
    });
    await loadLists();
    setSelectedId(created.id);
    flash("Lista criada com direcionamento e follow-up configurados.");
  }
  async function renameList() {
    if (!selected) return;
    const name = window.prompt("Novo nome da lista", selected.name)?.trim();
    if (!name) return;
    await fetch(`/api/lists/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await loadLists();
    flash("Lista atualizada.");
  }
  async function deleteList() {
    if (
      !selected ||
      !window.confirm(`Excluir “${selected.name}” e todos os seus contatos?`)
    )
      return;
    await fetch(`/api/lists/${selected.id}`, { method: "DELETE" });
    setSelectedId("");
    await loadLists();
    flash("Lista excluída.");
  }
  function openContact(contact?: Contact) {
    setEditingContact(contact ?? null);
    setContactForm(
      contact
        ? {
            listId: contact.listId,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            notes: contact.notes,
            assignedUserId: contact.assignedUserId || "",
          }
        : { ...emptyContact, listId: selected?.id || lists[0]?.id || "" },
    );
    setContactModal(true);
  }
  async function saveContact(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const response = await fetch(
      editingContact ? `/api/contacts/${editingContact.id}` : "/api/contacts",
      {
        method: editingContact ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      },
    );
    if (!response.ok) return flash("Confira os dados e tente novamente.");
    setContactModal(false);
    await Promise.all([loadContacts(selected.id), loadLists()]);
    flash(
      editingContact
        ? "Contato atualizado."
        : "Contato adicionado à lista escolhida.",
    );
  }
  async function deleteContact(contact: Contact) {
    if (!window.confirm(`Excluir o contato ${contact.name || contact.email}?`))
      return;
    await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    await Promise.all([loadContacts(contact.listId), loadLists()]);
    flash("Contato excluído.");
  }
  async function chooseCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    setImportFile(file.name);
    setImportRows(rows);
    if (!rows.length)
      flash("O CSV precisa ter cabeçalho e ao menos um contato válido.");
  }
  async function importContacts() {
    if (!selected || !importRows.length) return;
    setImporting(true);
    const response = await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId: selected.id, contacts: importRows }),
    });
    const result = (await response.json()) as {
      created?: number;
      duplicates?: number;
      error?: string;
    };
    setImporting(false);
    if (!response.ok)
      return flash(result.error || "Não foi possível importar o arquivo.");
    setImportModal(false);
    setImportRows([]);
    setImportFile("");
    await Promise.all([loadContacts(selected.id), loadLists()]);
    flash(
      `${result.created ?? 0} contatos importados${result.duplicates ? ` · ${result.duplicates} duplicados ignorados` : ""}.`,
    );
  }
  function exportContacts() {
    if (!selected || !contacts.length)
      return flash("Esta lista ainda não tem contatos para baixar.");
    const header = [
      "Nome",
      "E-mail",
      "Telefone",
      "Empresa",
      "Observações",
      "Origem",
      "Data e hora de entrada",
    ];
    const rows = contacts.map((contact) => [
      contact.name,
      contact.email,
      contact.phone,
      contact.company,
      contact.notes,
      contact.source === "webhook"
        ? "Great Pages"
        : contact.source === "import"
          ? "Importação"
          : "Manual",
      new Date(contact.createdAt).toLocaleString("pt-BR"),
    ]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `${selected.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-contatos.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    flash("Arquivo CSV baixado.");
  }
  const webhookUrl = selected
    ? `${WEBHOOK_BASE_URL}/api/webhooks/${selected.webhookToken}`
    : "";

  const sideNav = (
    <div className="main-nav">
      <button
        className={view === "dashboard" ? "active" : ""}
        onClick={() => setView("dashboard")}
      >
        ◫ <span>Dashboard</span>
      </button>
      <button
        className={view === "contacts" ? "active" : ""}
        onClick={() => setView("contacts")}
      >
        ☷ <span>Contatos</span>
      </button>
      <button
        className={view === "automation" ? "active" : ""}
        onClick={() => setView("automation")}
      >
        ⚡ <span>Automação</span>
      </button>
      <button
        className={view === "pipelines" ? "active" : ""}
        onClick={() => setView("pipelines")}
      >
        ▥ <span>Funis de vendas</span>
      </button>
      <button
        className={view === "agenda" ? "active" : ""}
        onClick={() => setView("agenda")}
      >
        ◷ <span>Minha agenda</span>
      </button>
      <button
        className={view === "products" ? "active" : ""}
        onClick={() => setView("products")}
      >
        ◈ <span>Produtos</span>
      </button>
      <button
        className={view === "product-tracks" ? "active" : ""}
        onClick={() => setView("product-tracks")}
      >
        ⇢ <span>Esteira de produtos</span>
      </button>
      <button
        className={view === "journey" ? "active" : ""}
        onClick={() => setView("journey")}
      >
        ♢ <span>Jornada do cliente</span>
      </button>
      <button
        className={view === "team" ? "active" : ""}
        onClick={() => setView("team")}
      >
        ♙ <span>Equipe</span>
      </button>
      <button
        className={view === "email" ? "active" : ""}
        onClick={() => setView("email")}
      >
        ✉ <span>Alertas equipe</span>
      </button>
      <button
        className={view === "lead-email" ? "active" : ""}
        onClick={() => setView("lead-email")}
      >
        ✓ <span>E-mail aos leads</span>
      </button>
      <form action={logout} className="logout-form">
        <button type="submit">
          ↪ <span>Sair</span>
        </button>
      </form>
    </div>
  );
  if (view === "dashboard")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">C</span>
            <div>
              <strong>Capta</strong>
              <small>CRM de contatos</small>
            </div>
          </div>
          {sideNav}
          <div className="sidebar-foot">
            <span className="status-dot" /> Indicadores atualizados
          </div>
        </aside>
        <section className="workspace">
          <header className="topbar">
            <div>
              <p>VISÃO GERAL</p>
              <h1>Dashboard do CRM</h1>
            </div>
          </header>
          <DashboardPanel />
        </section>
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
      </main>
    );
  if (view === "pipelines")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">C</span>
            <div>
              <strong>Capta</strong>
              <small>CRM de contatos</small>
            </div>
          </div>
          {sideNav}
          <div className="sidebar-foot">
            <span className="status-dot" /> Integrações preservadas
          </div>
        </aside>
        <section className="workspace">
          <header className="topbar">
            <div>
              <p>PIPELINES</p>
              <h1>Funis de vendas</h1>
            </div>
          </header>
          <PipelineBoard lists={lists} reloadLists={loadLists} flash={flash} />
        </section>
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
      </main>
    );
  if (view === "agenda")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">C</span>
            <div>
              <strong>Capta</strong>
              <small>CRM de contatos</small>
            </div>
          </div>
          {sideNav}
          <div className="sidebar-foot">
            <span className="status-dot" /> Follow-ups organizados
          </div>
        </aside>
        <section className="workspace">
          <header className="topbar">
            <div>
              <p>RELACIONAMENTO</p>
              <h1>Minha agenda comercial</h1>
            </div>
            <div className="top-actions">
              <button
                className="secondary"
                onClick={() => setView("pipelines")}
              >
                Ver funis
              </button>
            </div>
          </header>
          <AgendaPanel flash={flash} />
        </section>
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
      </main>
    );
  if (view === "automation")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">C</span>
            <div>
              <strong>Capta</strong>
              <small>CRM de contatos</small>
            </div>
          </div>
          {sideNav}
          <div className="sidebar-foot">
            <span className="status-dot" /> Webhooks ativos
          </div>
        </aside>
        <section className="workspace">
          <header className="topbar">
            <div>
              <p>AUTOMAÇÃO</p>
              <h1>Direcionamentos</h1>
            </div>
            <div className="top-actions">
              <button className="primary" onClick={() => setView("pipelines")}>
                Gerenciar funis
              </button>
            </div>
          </header>
          <AutomationPanel
            lists={lists}
            reloadLists={loadLists}
            flash={flash}
            openPipelines={() => setView("pipelines")}
          />
        </section>
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
      </main>
    );
  if (view === "products")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand"><span className="brand-mark">C</span><div><strong>Capta</strong><small>CRM de contatos</small></div></div>
          {sideNav}
          <div className="sidebar-foot"><span className="status-dot" /> Catálogo comercial</div>
        </aside>
        <section className="workspace">
          <header className="topbar"><div><p>PORTFÓLIO</p><h1>Produtos</h1></div></header>
          <ProductsPanel flash={flash} />
        </section>
        {notice && <div className="toast" role="status">✓ {notice}</div>}
      </main>
    );
  if (view === "product-tracks")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand"><span className="brand-mark">C</span><div><strong>Capta</strong><small>CRM de contatos</small></div></div>
          {sideNav}
          <div className="sidebar-foot"><span className="status-dot" /> Sequência comercial</div>
        </aside>
        <section className="workspace">
          <header className="topbar"><div><p>PORTFÓLIO</p><h1>Esteira de produtos</h1></div></header>
          <ProductTracksPanel flash={flash} />
        </section>
        {notice && <div className="toast" role="status">✓ {notice}</div>}
      </main>
    );
  if (view === "journey")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand"><span className="brand-mark">C</span><div><strong>Capta</strong><small>CRM de contatos</small></div></div>
          {sideNav}
          <div className="sidebar-foot"><span className="status-dot" /> Oportunidades organizadas</div>
        </aside>
        <section className="workspace">
          <header className="topbar"><div><p>RELACIONAMENTO</p><h1>Jornada do cliente</h1></div></header>
          <CustomerJourneyPanel flash={flash} openPipelines={() => setView("pipelines")} />
        </section>
        {notice && <div className="toast" role="status">✓ {notice}</div>}
      </main>
    );
  if (view === "team")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">C</span>
            <div>
              <strong>Capta</strong>
              <small>CRM de contatos</small>
            </div>
          </div>
          {sideNav}
          <div className="sidebar-foot">
            <span className="status-dot" /> Acessos protegidos
          </div>
        </aside>
        <section className="workspace">
          <header className="topbar">
            <div>
              <p>EQUIPE</p>
              <h1>Usuários e permissões</h1>
            </div>
          </header>
          <TeamPanel flash={flash} />
        </section>
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
      </main>
    );
  if (view === "email")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">C</span>
            <div>
              <strong>Capta</strong>
              <small>CRM de contatos</small>
            </div>
          </div>
          {sideNav}
          <div className="sidebar-foot">
            <span className="status-dot" /> Resend conectado
          </div>
        </aside>
        <section className="workspace">
          <header className="topbar">
            <div>
              <p>COMUNICAÇÃO</p>
              <h1>Alertas por e-mail</h1>
            </div>
          </header>
          <EmailPanel flash={flash} />
        </section>
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
      </main>
    );
  if (view === "lead-email")
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">C</span>
            <div>
              <strong>Capta</strong>
              <small>CRM de contatos</small>
            </div>
          </div>
          {sideNav}
          <div className="sidebar-foot">
            <span className="status-dot" /> Resend conectado
          </div>
        </aside>
        <section className="workspace">
          <header className="topbar">
            <div>
              <p>COMUNICAÇÃO</p>
              <h1>E-mail para novos leads</h1>
            </div>
          </header>
          <LeadEmailPanel flash={flash} />
        </section>
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
      </main>
    );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <div>
            <strong>Capta</strong>
            <small>CRM de contatos</small>
          </div>
        </div>
        {sideNav}
        <div className="sidebar-foot">
          <span className="status-dot" /> Integração ativa
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <p>LISTA DE CONTATOS</p>
            <h1>{selected?.name ?? "Seus contatos"}</h1>
          </div>
          <select
            className="mobile-list-switch"
            value={selected?.id || ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {lists.map((list) => (
              <option value={list.id} key={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <div className="top-actions">
            <button className="secondary" onClick={() => setView("automation")}>
              ⚡ Automação
            </button>
            <button
              className="secondary webhook-copy-top"
              onClick={() =>
                selected &&
                navigator.clipboard
                  .writeText(webhookUrl)
                  .then(() => flash("URL do webhook copiada."))
              }
            >
              ↗ URL
            </button>
            <button
              className="primary"
              onClick={() => openContact()}
              disabled={!selected}
            >
              + Contato nesta lista
            </button>
          </div>
        </header>
        <section className="contact-list-strip">
          <div>
            <span className="eyebrow">LISTAS DE CONTATOS</span>
            <strong>Suas captações</strong>
          </div>
          <nav>
            {lists.map((list) => (
              <button
                key={list.id}
                className={list.id === selected?.id ? "active" : ""}
                onClick={() => setSelectedId(list.id)}
              >
                <i style={{ background: list.color }} />
                <span>
                  {list.name}
                  <small>{list.contactCount} contatos</small>
                </span>
              </button>
            ))}
            <button
              className="create-list-chip"
              onClick={() => setListModal(true)}
            >
              + Nova lista
            </button>
          </nav>
        </section>
        <div className="content">
          {loading ? (
            <div className="empty">
              <h2>Carregando seu CRM…</h2>
            </div>
          ) : !selected ? (
            <div className="empty">
              <span>↗</span>
              <h2>Crie sua primeira lista</h2>
              <p>Separe os leads por campanha, produto ou segmento.</p>
              <button className="primary" onClick={() => setListModal(true)}>
                Criar lista
              </button>
            </div>
          ) : (
            <>
              <div className="summary-row">
                <div>
                  <strong>{selected.contactCount}</strong>
                  <span>contatos nesta lista</span>
                </div>
                <div>
                  <strong>
                    {contacts.filter((c) => c.source === "webhook").length}
                  </strong>
                  <span>recebidos via webhook</span>
                </div>
                <div className="summary-accent">
                  <strong>{selected.segment || "Sem segmento"}</strong>
                  <span>segmento</span>
                </div>
              </div>
              <section className="integration-card">
                <div className="integration-icon">↗</div>
                <div className="integration-copy">
                  <div>
                    <span className="eyebrow">INTEGRAÇÃO GREAT PAGES</span>
                    <h2>Webhook desta lista</h2>
                    <p>
                      Use esta URL no Great Pages. Cada novo lead entrará
                      automaticamente em <strong>{selected.name}</strong>.
                    </p>
                  </div>
                  <div className="webhook-box">
                    <code>{webhookUrl}</code>
                    <button
                      onClick={() =>
                        navigator.clipboard
                          .writeText(webhookUrl)
                          .then(() => flash("URL copiada."))
                      }
                    >
                      Copiar
                    </button>
                  </div>
                </div>
                <span className="live-badge">● Ativo</span>
              </section>
              <div className="toolbar">
                <label className="search">
                  <span>⌕</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nome, e-mail, telefone ou empresa"
                  />
                </label>
                <div>
                  <button
                    className="secondary small"
                    onClick={() => setImportModal(true)}
                  >
                    ↑ Importar CSV
                  </button>
                  <button className="secondary small" onClick={exportContacts}>
                    ↓ Baixar contatos
                  </button>
                  <button className="secondary small" onClick={renameList}>
                    Editar lista
                  </button>
                  <button className="danger small" onClick={deleteList}>
                    Excluir lista
                  </button>
                </div>
              </div>
              <section className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>CONTATO</th>
                      <th>TELEFONE</th>
                      <th>EMPRESA</th>
                      <th>VENDEDOR</th>
                      <th>ORIGEM</th>
                      <th>ENTRADA</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((contact) => (
                      <tr key={contact.id}>
                        <td>
                          <div className="person">
                            <span>
                              {(contact.name || contact.email || "?")
                                .slice(0, 1)
                                .toUpperCase()}
                            </span>
                            <div>
                              <strong>{contact.name || "Sem nome"}</strong>
                              <small>{contact.email || "Sem e-mail"}</small>
                            </div>
                          </div>
                        </td>
                        <td>{contact.phone || "—"}</td>
                        <td>{contact.company || "—"}</td>
                        <td>
                          {contact.assignedSeller ? (
                            <span className="seller-badge">
                              <i>
                                {contact.assignedSeller.name
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </i>
                              {contact.assignedSeller.name}
                            </span>
                          ) : (
                            <span className="seller-empty">Não atribuído</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              contact.source === "webhook"
                                ? "source webhook"
                                : "source manual"
                            }
                          >
                            {contact.source === "webhook"
                              ? "Great Pages"
                              : contact.source === "import"
                                ? "Importado"
                                : "Manual"}
                          </span>
                        </td>
                        <td>
                          <time className="entry-time">
                            {new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            }).format(new Date(contact.createdAt))}
                            <small>
                              {new Intl.DateTimeFormat("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(contact.createdAt))}
                            </small>
                          </time>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button onClick={() => openContact(contact)}>
                              Editar
                            </button>
                            <button onClick={() => deleteContact(contact)}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="table-empty">
                    <h3>Nenhum contato encontrado</h3>
                    <p>
                      Adicione manualmente ou envie um lead pelo webhook desta
                      lista.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </section>
      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
        </div>
      )}
      {listModal && (
        <div className="modal-backdrop" onMouseDown={() => setListModal(false)}>
          <form
            className="modal"
            onSubmit={saveList}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">NOVA CAPTAÇÃO</span>
                <h2>Criar lista</h2>
              </div>
              <button type="button" onClick={() => setListModal(false)}>
                ×
              </button>
            </div>
            <label>
              Nome da lista
              <input
                required
                autoFocus
                value={listForm.name}
                onChange={(e) =>
                  setListForm({ ...listForm, name: e.target.value })
                }
                placeholder="Ex.: Leads do e-book"
              />
            </label>
            <label>
              Segmento
              <input
                value={listForm.segment}
                onChange={(e) =>
                  setListForm({ ...listForm, segment: e.target.value })
                }
                placeholder="Ex.: Imobiliário"
              />
            </label>
            <div className="form-grid">
              <label>
                Funil de destino
                <select
                  className="form-select"
                  value={listForm.pipelineId}
                  onChange={(e) => {
                    const pipelineId = e.target.value;
                    setListForm({
                      ...listForm,
                      pipelineId,
                      routingStageId:
                        pipelineOptions.find(
                          (pipeline) => pipeline.id === pipelineId,
                        )?.stages[0]?.id || "",
                    });
                  }}
                >
                  <option value="">Não direcionar agora</option>
                  {pipelineOptions.map((pipeline) => (
                    <option value={pipeline.id} key={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Etapa de entrada
                <select
                  className="form-select"
                  value={listForm.routingStageId}
                  disabled={!listForm.pipelineId}
                  onChange={(e) =>
                    setListForm({ ...listForm, routingStageId: e.target.value })
                  }
                >
                  <option value="">Primeira etapa</option>
                  {pipelineOptions
                    .find((pipeline) => pipeline.id === listForm.pipelineId)
                    ?.stages.map((stage) => (
                      <option value={stage.id} key={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <small className="field-help">
              Você poderá alterar depois na aba Automação.
            </small>
            <section className="new-list-follow-up">
              <div>
                <strong>Follow-up automático</strong>
                <button
                  type="button"
                  role="switch"
                  aria-checked={listForm.followUpEnabled}
                  className={
                    listForm.followUpEnabled
                      ? "email-alert-switch active"
                      : "email-alert-switch"
                  }
                  onClick={() =>
                    setListForm({
                      ...listForm,
                      followUpEnabled: !listForm.followUpEnabled,
                    })
                  }
                >
                  <i />
                  <b>{listForm.followUpEnabled ? "Ativado" : "Desativado"}</b>
                </button>
              </div>
              {listForm.followUpEnabled && (
                <>
                  <div className="form-grid">
                    <label>
                      Primeira chamada após
                      <input
                        type="number"
                        min="1"
                        max="43200"
                        value={listForm.firstFollowUpDelayMinutes}
                        onChange={(e) =>
                          setListForm({
                            ...listForm,
                            firstFollowUpDelayMinutes: Number(e.target.value),
                          })
                        }
                      />
                      <small>minutos</small>
                    </label>
                    <label>
                    Próximos follow-ups a cada
                    <input
                      type="number"
                      min="1"
                      max="365"
                      step="1"
                      value={Math.max(
                        1,
                        Math.round(listForm.followUpIntervalMinutes / 1440),
                      )}
                      onChange={(e) =>
                        setListForm({
                          ...listForm,
                          followUpIntervalMinutes: Number(e.target.value) * 1440,
                        })
                      }
                    />
                    <small>dias</small>
                    </label>
                  </div>
                  <label>
                    Primeira tarefa
                    <input
                      value={listForm.followUpTitle}
                      maxLength={240}
                      onChange={(e) =>
                        setListForm({
                          ...listForm,
                          followUpTitle: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Orientação ao vendedor
                    <textarea
                      rows={2}
                      value={listForm.followUpNotes}
                      maxLength={2000}
                      onChange={(e) =>
                        setListForm({
                          ...listForm,
                          followUpNotes: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Próximos acompanhamentos
                    <input
                      value={listForm.nextFollowUpTitle}
                      maxLength={240}
                      onChange={(e) =>
                        setListForm({
                          ...listForm,
                          nextFollowUpTitle: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Orientação dos próximos contatos
                    <textarea
                      rows={2}
                      value={listForm.nextFollowUpNotes}
                      maxLength={2000}
                      onChange={(e) =>
                        setListForm({
                          ...listForm,
                          nextFollowUpNotes: e.target.value,
                        })
                      }
                    />
                  </label>
                </>
              )}
            </section>
            <fieldset>
              <legend>Cor da lista</legend>
              <div className="color-picker">
                {colors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    aria-label={`Cor ${color}`}
                    className={listForm.color === color ? "selected" : ""}
                    style={{ background: color }}
                    onClick={() => setListForm({ ...listForm, color })}
                  />
                ))}
              </div>
            </fieldset>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setListModal(false)}
              >
                Cancelar
              </button>
              <button className="primary">Criar lista</button>
            </div>
          </form>
        </div>
      )}
      {contactModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setContactModal(false)}
        >
          <form
            className="modal"
            onSubmit={saveContact}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  {editingContact ? "EDITAR CADASTRO" : "NOVO CADASTRO"}
                </span>
                <h2>
                  {editingContact ? "Editar contato" : "Adicionar contato"}
                </h2>
              </div>
              <button type="button" onClick={() => setContactModal(false)}>
                ×
              </button>
            </div>
            <label className="contact-list-choice">
              Lista de destino
              <select
                className="form-select"
                required
                disabled={Boolean(editingContact)}
                value={contactForm.listId}
                onChange={(e) =>
                  setContactForm({ ...contactForm, listId: e.target.value })
                }
              >
                <option value="">Escolha a lista</option>
                {lists.map((list) => (
                  <option value={list.id} key={list.id}>
                    {list.name}
                    {list.segment ? ` · ${list.segment}` : ""}
                  </option>
                ))}
              </select>
              <small>
                {editingContact
                  ? "A lista original é preservada durante a edição."
                  : "A automação configurada para esta lista será aplicada ao contato."}
              </small>
            </label>
            <div className="form-grid">
              <label>
                Nome
                <input
                  autoFocus
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, name: e.target.value })
                  }
                  placeholder="Nome completo"
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, email: e.target.value })
                  }
                  placeholder="nome@empresa.com"
                />
              </label>
              <label>
                Telefone
                <input
                  value={contactForm.phone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, phone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </label>
              <label>
                Empresa
                <input
                  value={contactForm.company}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, company: e.target.value })
                  }
                  placeholder="Empresa"
                />
              </label>
            </div>
            <label>
              Vendedor responsável
              <select
                className="form-select"
                value={contactForm.assignedUserId}
                onChange={(e) =>
                  setContactForm({
                    ...contactForm,
                    assignedUserId: e.target.value,
                  })
                }
              >
                <option value="">Sem vendedor / usar automação</option>
                {team
                  .filter((member) => member.role === "sales" && member.active)
                  .map((member) => (
                    <option value={member.id} key={member.id}>
                      {member.name} · {member.email}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Observações
              <textarea
                rows={3}
                value={contactForm.notes}
                onChange={(e) =>
                  setContactForm({ ...contactForm, notes: e.target.value })
                }
                placeholder="Informações úteis sobre o lead"
              />
            </label>
            <p className="form-hint">
              O gestor pode atribuir ou trocar o vendedor manualmente.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setContactModal(false)}
              >
                Cancelar
              </button>
              <button className="primary">Salvar contato</button>
            </div>
          </form>
        </div>
      )}
      {importModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setImportModal(false)}
        >
          <section
            className="modal import-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">IMPORTAÇÃO EM MASSA</span>
                <h2>Adicionar vários contatos</h2>
              </div>
              <button type="button" onClick={() => setImportModal(false)}>
                ×
              </button>
            </div>
            <button
              className="upload-zone"
              type="button"
              onClick={() => fileInput.current?.click()}
            >
              <span>↑</span>
              <strong>{importFile || "Selecionar arquivo CSV"}</strong>
              <small>
                Colunas aceitas: nome, email, telefone, empresa e observações
              </small>
            </button>
            <input
              ref={fileInput}
              className="file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={chooseCsv}
            />
            {importRows.length > 0 && (
              <div className="import-preview">
                <div>
                  <strong>{importRows.length}</strong>
                  <span>contatos prontos para importar</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>NOME</th>
                      <th>E-MAIL</th>
                      <th>TELEFONE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 4).map((contact, index) => (
                      <tr key={`${contact.email}-${index}`}>
                        <td>{contact.name || "—"}</td>
                        <td>{contact.email || "—"}</td>
                        <td>{contact.phone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 4 && (
                  <small>e mais {importRows.length - 4} contatos…</small>
                )}
              </div>
            )}
            <a
              className="template-link"
              href={
                "data:text/csv;charset=utf-8," +
                encodeURIComponent(
                  "Nome;E-mail;Telefone;Empresa;Observações\nMaria Silva;maria@empresa.com;11999999999;Empresa Exemplo;Lead do evento",
                )
              }
              download="modelo-contatos-capta.csv"
            >
              ↓ Baixar modelo de CSV
            </a>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setImportModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                disabled={!importRows.length || importing}
                onClick={importContacts}
              >
                {importing
                  ? "Importando…"
                  : `Importar ${importRows.length || ""} contatos`}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
