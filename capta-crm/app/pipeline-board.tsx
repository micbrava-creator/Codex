"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  kind: "task" | "follow_up";
  notes: string;
  reminderEnabled: boolean;
};
type Card = {
  id: string;
  productId: string | null;
  stageId: string;
  assignedUserId: string | null;
  assignedSeller: { id: string; name: string; email: string } | null;
  negotiationValueCents: number;
  saleCompleted: boolean;
  saleCompletedAt: string | null;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  source: string;
  tasks: Task[];
  followUpEnabled: boolean;
  followUpIntervalDays: number;
  followUpIntervalMinutes: number;
};
type Stage = {
  id: string;
  name: string;
  color: string;
  position: number;
  passedCount: number;
  cards: Card[];
};
type Pipeline = {
  id: string;
  name: string;
  color: string;
  defaultValueCents: number;
  stages: Stage[];
  lists: { id: string; name: string; pipelineId: string | null }[];
};
type ContactList = { id: string; name: string; pipelineId: string | null };
type Product = { id: string; name: string; pipelineId: string | null; active: boolean };
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
function parseMoney(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Math.max(0, Math.round((Number(normalized) || 0) * 100));
}
function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  const international =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${international}`;
}
function localDateTime(value: string | null) { if (!value) return ""; const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }

export default function PipelineBoard({
  lists,
  reloadLists,
  flash,
}: {
  lists: ContactList[];
  reloadLists: () => Promise<void>;
  flash: (message: string) => void;
}) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<Card | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDateState] = useState("");
  const [taskKind, setTaskKind] = useState<"task" | "follow_up">("follow_up");
  function setTaskDate(value: string | Record<string, string>) {
    setTaskDateState(
      typeof value === "string" ? value : Object.values(value).join(""),
    );
  }
  const [cardSize, setCardSize] = useState<"compact" | "comfortable" | "large">(
    "comfortable",
  );
  const [defaultValueInput, setDefaultValueInput] = useState("0,00");
  const [cardValueInput, setCardValueInput] = useState("0,00");
  const [copyTarget, setCopyTarget] = useState<{ pipelineId: string; stageId: string } | null>(null);
  const [stageContact, setStageContact] = useState<{
    stageId: string;
    listId: string;
    assignedUserId: string;
    productId: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    notes: string;
    negotiationValue: string;
  } | null>(null);
  const [stageEditor, setStageEditor] = useState<{
    id?: string;
    name: string;
    color: string;
  } | null>(null);
  const [sellers, setSellers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [sellerFilter, setSellerFilter] = useState("all");
  const [currentRole, setCurrentRole] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const selected =
    pipelines.find((pipeline) => pipeline.id === selectedId) ?? pipelines[0];
  const load = useCallback(async () => {
    const response = await fetch("/api/pipelines");
    const data = (await response.json()) as Pipeline[];
    setPipelines(data);
    setSelectedId((current) =>
      data.some((pipeline) => pipeline.id === current)
        ? current
        : data[0]?.id || "",
    );
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    Promise.all([
      fetch("/api/team").then(
        (response) =>
          response.json() as Promise<
            {
              id: string;
              name: string;
              email: string;
              role: string;
              active: boolean;
            }[]
          >,
      ),
      fetch("/api/team/me").then(
        (response) =>
          response.json() as Promise<{ role: string; memberId: string }>,
      ),
      fetch("/api/products").then((response) => response.json() as Promise<Product[]>),
    ]).then(([team, me, productData]) => {
      const available = team.filter(
        (member) => member.role === "sales" && member.active,
      );
      setSellers(available);
      setCurrentRole(me.role || "");
      if (me.role === "sales") setSellerFilter(me.memberId);
      setProducts(Array.isArray(productData) ? productData.filter((product) => product.active) : []);
    });
  }, [load]);
  useEffect(() => {
    const saved = window.localStorage.getItem("capta-card-size");
    if (saved === "compact" || saved === "comfortable" || saved === "large")
      setCardSize(saved);
  }, []);
  useEffect(() => {
    if (selected)
      setDefaultValueInput(
        (selected.defaultValueCents / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        }),
      );
  }, [selected?.id, selected?.defaultValueCents]);
  useEffect(() => {
    if (card)
      setCardValueInput(
        (card.negotiationValueCents / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        }),
      );
  }, [card?.id]);
  function changeCardSize(size: "compact" | "comfortable" | "large") {
    setCardSize(size);
    window.localStorage.setItem("capta-card-size", size);
  }
  function cardsFor(stage: Stage) {
    return sellerFilter === "all"
      ? stage.cards
      : sellerFilter === "unassigned"
        ? stage.cards.filter((item) => !item.assignedUserId)
        : stage.cards.filter((item) => item.assignedUserId === sellerFilter);
  }
  function funnelCards() {
    return selected ? selected.stages.flatMap((stage) => cardsFor(stage)) : [];
  }
  async function saveDefaultValue() {
    if (!selected) return;
    const defaultValueCents = parseMoney(defaultValueInput);
    await fetch(`/api/pipelines/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultValueCents }),
    });
    await load();
    flash("Valor padrão do funil atualizado.");
  }
  function openStageContact() {
    if (!selected) return;
    const available = selected.lists.length ? selected.lists : lists;
    setStageContact({
      stageId: selected.stages[0]?.id || "",
      listId: available[0]?.id || "",
      assignedUserId: "",
      productId: products.find((product) => product.pipelineId === selected.id)?.id || "",
      name: "",
      email: "",
      phone: "",
      company: "",
      notes: "",
      negotiationValue: (selected.defaultValueCents / 100).toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 2 },
      ),
    });
  }
  async function saveStageContact(event: FormEvent) {
    event.preventDefault();
    if (!stageContact?.listId || !stageContact.stageId) return;
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stageContact),
    });
    if (!response.ok) return flash("Não foi possível criar o contato.");
    const created = (await response.json()) as { id: string };
    await Promise.all([
      fetch(`/api/contacts/${created.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: stageContact.stageId }),
      }),
      fetch(`/api/contacts/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: stageContact.company,
          notes: stageContact.notes,
          assignedUserId: stageContact.assignedUserId || null,
          productId: stageContact.productId || null,
          negotiationValueCents: parseMoney(stageContact.negotiationValue),
        }),
      }),
    ]);
    setStageContact(null);
    await load();
    flash("Contato adicionado ao funil com o cartão completo.");
  }

  async function createPipeline() {
    const name = window.prompt("Nome do novo funil")?.trim();
    if (!name) return;
    const defaultValueCents = parseMoney(
      window.prompt("Valor padrão de cada nova negociação (R$)", "0,00") || "0",
    );
    await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, defaultValueCents }),
    });
    await load();
    flash("Funil criado com valor padrão definido.");
  }
  async function editPipeline() {
    if (!selected) return;
    const name = window.prompt("Nome do funil", selected.name)?.trim();
    if (!name) return;
    const defaultValueCents = parseMoney(
      window.prompt(
        "Valor padrão para os próximos leads (R$)",
        (selected.defaultValueCents / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        }),
      ) || "0",
    );
    await fetch(`/api/pipelines/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, defaultValueCents }),
    });
    await load();
    flash("Funil e valor padrão atualizados.");
  }
  async function deletePipeline() {
    if (
      !selected ||
      !window.confirm(
        `Excluir o funil “${selected.name}”? Os contatos permanecerão nas listas.`,
      )
    )
      return;
    await fetch(`/api/pipelines/${selected.id}`, { method: "DELETE" });
    await Promise.all([load(), reloadLists()]);
    flash("Funil excluído.");
  }
  function addStage() {
    if (selected) setStageEditor({ name: "", color: "#7C3AED" });
  }
  function editStage(stage: Stage) {
    setStageEditor({ id: stage.id, name: stage.name, color: stage.color });
  }
  async function saveStage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !stageEditor?.name.trim()) return;
    const url = stageEditor.id
      ? `/api/stages/${stageEditor.id}`
      : `/api/pipelines/${selected.id}/stages`;
    await fetch(url, {
      method: stageEditor.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: stageEditor.name,
        color: stageEditor.color,
      }),
    });
    setStageEditor(null);
    await load();
    flash(stageEditor.id ? "Etapa atualizada." : "Etapa adicionada.");
  }
  async function deleteStage(stage: Stage) {
    if (
      !window.confirm(
        `Excluir a etapa “${stage.name}”? Os cartões ficarão sem etapa.`,
      )
    )
      return;
    await fetch(`/api/stages/${stage.id}`, { method: "DELETE" });
    await load();
    flash("Etapa excluída.");
  }
  async function moveStage(stage: Stage, direction: -1 | 1) {
    if (!selected) return;
    const index = selected.stages.findIndex((item) => item.id === stage.id);
    const other = selected.stages[index + direction];
    if (!other) return;
    await Promise.all([
      fetch(`/api/stages/${stage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: other.position }),
      }),
      fetch(`/api/stages/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: stage.position }),
      }),
    ]);
    await load();
    flash("Posição da etapa atualizada.");
  }
  async function moveCard(contactId: string, stageId: string) {
    setPipelines((current) =>
      current.map((pipeline) => ({
        ...pipeline,
        stages: pipeline.stages.map((stage) => ({
          ...stage,
          cards: stage.cards
            .filter((item) => item.id !== contactId)
            .concat(
              stage.id === stageId
                ? pipeline.stages
                    .flatMap((item) => item.cards)
                    .filter((item) => item.id === contactId)
                    .map((item) => ({ ...item, stageId }))
                : [],
            ),
        })),
      })),
    );
    await fetch(`/api/contacts/${contactId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    await load();
  }
  async function assignList(listId: string, pipelineId: string | null) {
    await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineId }),
    });
    await Promise.all([load(), reloadLists()]);
    flash("Direcionamento da lista atualizado.");
  }
  async function saveCard(event: FormEvent) {
    event.preventDefault();
    if (!card) return;
    await fetch(`/api/contacts/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: card.name,
        email: card.email,
        phone: card.phone,
        company: card.company,
        notes: card.notes,
        assignedUserId: card.assignedUserId,
        productId: card.productId,
        negotiationValueCents: parseMoney(cardValueInput),
      }),
    });
    setCard(null);
    await load();
    flash("Cartão atualizado.");
  }
  async function toggleSale(item: Card) {
    const saleCompleted = !item.saleCompleted;
    await fetch(`/api/contacts/${item.id}/sale`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleCompleted }),
    });
    await load();
    flash(saleCompleted ? "Venda marcada como concluída." : "Venda reaberta.");
  }
  async function duplicateCard(targetPipelineId: string, targetStageId?: string) {
    if (!card) return;
    const response = await fetch(`/api/contacts/${card.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPipelineId, targetStageId }),
    });
    if (!response.ok) return flash("Não foi possível duplicar o cartão.");
    setCopyTarget(null);
    setCard(null);
    await load();
    flash(targetPipelineId === selected?.id ? "Cartão duplicado no funil." : "Cópia enviada para o outro funil.");
  }
  async function addTask(event: FormEvent) {
    event.preventDefault();
    if (!card || !taskTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: card.id,
        title: taskTitle,
        dueDate: taskDate,
        kind: taskKind,
        reminderEnabled: taskKind === "follow_up",
      }),
    });
    setTaskTitle("");
    setTaskDate("");
    await load();
    const response = await fetch("/api/pipelines");
    const data = (await response.json()) as Pipeline[];
    const updated = data
      .flatMap((pipeline) => pipeline.stages)
      .flatMap((stage) => stage.cards)
      .find((item) => item.id === card.id);
    if (updated) setCard(updated);
  }
  async function configureFollowUp(enabled: boolean) {
    if (!card) return;
    const intervalMinutes = (card.followUpIntervalDays || Math.max(1, Math.round((card.followUpIntervalMinutes || 2880) / 1440))) * 1440;
    const pending = card.tasks.find((task) => task.kind === "follow_up" && !task.completed);
    const nextAt = pending?.dueDate || new Date(Date.now() + intervalMinutes * 60000).toISOString();
    const response = await fetch(`/api/contacts/${card.id}/follow-up`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, intervalMinutes, nextAt, title: pending?.title, notes: pending?.notes, reminderEnabled: pending?.reminderEnabled ?? true }) });
    if (!response.ok) return flash("Não foi possível alterar o follow-up.");
    await load();
    const refreshed = await fetch("/api/pipelines").then((item) => item.json()) as Pipeline[];
    const updated = refreshed.flatMap((pipeline) => pipeline.stages).flatMap((stage) => stage.cards).find((item) => item.id === card.id);
    if (updated) setCard(updated);
    flash(enabled ? "Follow-up automático ativado." : "Follow-up automático desativado.");
  }
  async function rescheduleFollowUp(value: string) {
    if (!card) return; const pending = card.tasks.find((task) => task.kind === "follow_up" && !task.completed);
    const iso = new Date(value).toISOString();
    setCard((current) => current ? { ...current, tasks: current.tasks.map((task) => task.id === pending?.id ? { ...task, dueDate: iso, reminderEnabled: true } : task) } : null);
    if (pending) await fetch(`/api/tasks/${pending.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: value, reminderEnabled: true }) });
    else await fetch(`/api/contacts/${card.id}/follow-up`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: true, intervalMinutes: card.followUpIntervalMinutes || 2880, nextAt: value, reminderEnabled: true }) });
    await load(); const refreshed = await fetch("/api/pipelines").then((item) => item.json()) as Pipeline[]; const updated = refreshed.flatMap((pipeline) => pipeline.stages).flatMap((stage) => stage.cards).find((item) => item.id === card.id); if (updated) setCard(updated); flash("Data e horário do follow-up atualizados.");
  }
  async function toggleTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    setCard((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((item) =>
              item.id === task.id
                ? { ...item, completed: !item.completed }
                : item,
            ),
          }
        : null,
    );
    load();
  }
  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setCard((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.filter((task) => task.id !== taskId),
          }
        : null,
    );
    load();
  }

  if (loading)
    return (
      <div className="empty">
        <h2>Carregando funis…</h2>
      </div>
    );
  return (
    <div className="pipeline-screen" data-card-size={cardSize}>
      {selected && (
        <section className="pipeline-value-summary sales-summary">
          <label>
            <span>Valor padrão por lead</span>
            <div className="default-value-edit">
              <span>R$</span>
              <input
                inputMode="decimal"
                value={defaultValueInput}
                onChange={(event) => setDefaultValueInput(event.target.value)}
              />
              <button type="button" onClick={saveDefaultValue}>
                Salvar
              </button>
            </div>
          </label>
          <div>
            <span>Contatos recebidos</span>
            <strong>{funnelCards().length}</strong>
          </div>
          <div>
            <span>Potencial do funil</span>
            <strong>
              {money.format(
                funnelCards().reduce(
                  (total, item) => total + item.negotiationValueCents,
                  0,
                ) / 100,
              )}
            </strong>
          </div>
          <div>
            <span>Conversão total</span>
            <strong>
              {funnelCards().length
                ? Math.round(
                    (funnelCards().filter((item) => item.saleCompleted).length /
                      funnelCards().length) *
                      100,
                  )
                : 0}
              %
            </strong>
          </div>
          <div className="sales-total">
            <span>Vendas concluídas</span>
            <strong>
              {money.format(
                funnelCards()
                  .filter((item) => item.saleCompleted)
                  .reduce(
                    (total, item) => total + item.negotiationValueCents,
                    0,
                  ) / 100,
              )}
            </strong>
            <small>
              {funnelCards().filter((item) => item.saleCompleted).length} vendas
            </small>
          </div>
        </section>
      )}
      <div className="pipeline-toolbar">
        <div className="pipeline-tabs">
          {pipelines.map((pipeline) => (
            <button
              key={pipeline.id}
              className={pipeline.id === selected?.id ? "active" : ""}
              onClick={() => setSelectedId(pipeline.id)}
            >
              <span style={{ background: pipeline.color }} />
              {pipeline.name}
            </button>
          ))}
          <button className="add-pipeline" onClick={createPipeline}>
            + Novo funil
          </button>
        </div>
        {selected && (
          <div className="pipeline-actions">
            <label className="seller-filter">
              <span>Visualizar vendedor</span>
              <select
                value={sellerFilter}
                onChange={(event) => setSellerFilter(event.target.value)}
              >
                <option value="all">Todos os vendedores</option>
                {sellers.map((seller) => (
                  <option value={seller.id} key={seller.id}>
                    {seller.name}
                  </option>
                ))}
                {currentRole === "manager" && (
                  <option value="unassigned">Não atribuídos</option>
                )}
              </select>
            </label>
            <div className="card-size-control" aria-label="Tamanho dos cartões">
              <span>Cartões</span>
              <button
                className={cardSize === "compact" ? "active" : ""}
                onClick={() => changeCardSize("compact")}
                title="Compacto"
              >
                P
              </button>
              <button
                className={cardSize === "comfortable" ? "active" : ""}
                onClick={() => changeCardSize("comfortable")}
                title="Médio"
              >
                M
              </button>
              <button
                className={cardSize === "large" ? "active" : ""}
                onClick={() => changeCardSize("large")}
                title="Grande"
              >
                G
              </button>
            </div>
            <button className="primary small" onClick={openStageContact}>
              + Novo contato
            </button>
            <button className="secondary small" onClick={editPipeline}>
              Editar funil
            </button>
            <button className="primary small" onClick={addStage}>
              + Nova etapa
            </button>
            <button className="danger small" onClick={deletePipeline}>
              Excluir
            </button>
          </div>
        )}
      </div>
      {!selected ? (
        <div className="empty">
          <span>↗</span>
          <h2>Crie seu primeiro funil</h2>
          <p>Organize o acompanhamento dos leads em etapas visuais.</p>
          <button className="primary" onClick={createPipeline}>
            Criar funil de vendas
          </button>
        </div>
      ) : (
        <>
          <section className="kanban-board">
            {selected.stages.map((stage, stageIndex) => (
              <div
                className="kanban-column"
                key={stage.id}
                style={{ borderTopColor: stage.color }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const id = event.dataTransfer.getData("text/contact-id");
                  if (id) moveCard(id, stage.id);
                }}
              >
                <header style={{ background: stage.color }}>
                  <div>
                    <span />
                    <strong>{stage.name}</strong>
                    <small>{cardsFor(stage).length}</small>
                  </div>
                  <div className="stage-actions">
                    <button
                      disabled={stageIndex === 0}
                      onClick={() => moveStage(stage, -1)}
                      aria-label={`Mover ${stage.name} para trás`}
                    >
                      ←
                    </button>
                    <button
                      disabled={stageIndex === selected.stages.length - 1}
                      onClick={() => moveStage(stage, 1)}
                      aria-label={`Mover ${stage.name} para frente`}
                    >
                      →
                    </button>
                    <button
                      onClick={() => editStage(stage)}
                      aria-label={`Editar ${stage.name}`}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteStage(stage)}
                      aria-label={`Excluir ${stage.name}`}
                    >
                      ×
                    </button>
                  </div>
                </header>
                <div className="stage-metrics">
                  <div>
                    <span>Potencial da etapa</span>
                    <strong>
                      {money.format(
                        cardsFor(stage).reduce(
                          (total, item) => total + item.negotiationValueCents,
                          0,
                        ) / 100,
                      )}
                    </strong>
                  </div>
                </div>
                <div className="kanban-cards">
                  {cardsFor(stage).map((item) => (
                    <article
                      className={
                        item.saleCompleted
                          ? "kanban-card sale-completed"
                          : "kanban-card"
                      }
                      key={item.id}
                      style={{ borderLeftColor: stage.color }}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/contact-id", item.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => setCard(item)}
                    >
                      <div className="card-top">
                        <span style={{ background: stage.color }}>
                          {(item.name || item.email || "?")
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                        <small>
                          {item.saleCompleted
                            ? "✓ Venda concluída"
                            : item.source === "webhook"
                              ? "Great Pages"
                              : item.source === "import"
                                ? "Importado"
                                : "Manual"}
                        </small>
                      </div>
                      <h3>{item.name || "Sem nome"}</h3>
                      <p>{item.company || item.email || "Sem detalhes"}</p>
                      {item.phone && (
                        <a
                          className="kanban-whatsapp"
                          href={whatsappUrl(item.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Conversar com ${item.name || item.phone} pelo WhatsApp`}
                        >
                          <span>WhatsApp</span>
                          <strong>{item.phone}</strong>
                        </a>
                      )}
                      <div className="deal-value">
                        <span>Valor da negociação</span>
                        <strong>
                          {money.format(item.negotiationValueCents / 100)}
                        </strong>
                      </div>
                      <button
                        className={
                          item.saleCompleted
                            ? "sale-toggle completed"
                            : "sale-toggle"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSale(item);
                        }}
                      >
                        {item.saleCompleted
                          ? "✓ Venda concluída · Reabrir"
                          : "✓ Marcar venda concluída"}
                      </button>
                      <label
                        className="quick-stage"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span>Trocar etapa</span>
                        <select
                          value={item.stageId}
                          onChange={(event) => {
                            event.stopPropagation();
                            moveCard(item.id, event.target.value);
                          }}
                        >
                          {selected.stages.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div
                        className={
                          item.assignedSeller
                            ? "kanban-seller"
                            : "kanban-seller unassigned"
                        }
                      >
                        <i>
                          {item.assignedSeller
                            ? item.assignedSeller.name.slice(0, 1).toUpperCase()
                            : "?"}
                        </i>
                        <span>
                          {item.assignedSeller?.name ||
                            "Sem vendedor atribuído"}
                        </span>
                      </div>
                      <div className={item.followUpEnabled ? "follow-up-chip active" : "follow-up-chip"}>◷ {item.followUpEnabled ? "Follow-up ativo" : "Follow-up desativado"}</div>
                      <footer>
                        <span>
                          ☑{" "}
                          {item.tasks.filter((task) => !task.completed).length}{" "}
                          tarefas
                        </span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setCard(item);
                          }}
                        >
                          Editar
                        </button>
                      </footer>
                    </article>
                  ))}
                  {!cardsFor(stage).length && (
                    <div className="column-empty">Nenhum lead neste filtro</div>
                  )}
                </div>
              </div>
            ))}
            <button className="add-column" onClick={addStage}>
              + Nova etapa
            </button>
          </section>
        </>
      )}
      {stageEditor && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setStageEditor(null)}
        >
          <form
            className="modal stage-modal"
            onSubmit={saveStage}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">PERSONALIZAR ETAPA</span>
                <h2>{stageEditor.id ? "Editar etapa" : "Nova etapa"}</h2>
              </div>
              <button type="button" onClick={() => setStageEditor(null)}>
                ×
              </button>
            </div>
            <label>
              Nome da etapa
              <input
                autoFocus
                required
                value={stageEditor.name}
                onChange={(event) =>
                  setStageEditor({ ...stageEditor, name: event.target.value })
                }
                placeholder="Ex.: Reunião agendada"
              />
            </label>
            <fieldset>
              <legend>Cor de identificação</legend>
              <div className="stage-colors">
                {[
                  "#E8E7FF",
                  "#DDF2FF",
                  "#FFF1D6",
                  "#FFE3DE",
                  "#E4F4EC",
                  "#F2E2F8",
                  "#E9E9E7",
                  "#DDEBE8",
                ].map((color) => (
                  <button
                    type="button"
                    key={color}
                    className={stageEditor.color === color ? "active" : ""}
                    style={{ background: color }}
                    onClick={() => setStageEditor({ ...stageEditor, color })}
                    aria-label={`Escolher cor ${color}`}
                  />
                ))}
                <label className="custom-color">
                  <input
                    type="color"
                    value={stageEditor.color}
                    onChange={(event) =>
                      setStageEditor({
                        ...stageEditor,
                        color: event.target.value,
                      })
                    }
                  />
                  <span>Cor personalizada</span>
                </label>
              </div>
            </fieldset>
            <div className="stage-preview">
              <span style={{ background: stageEditor.color }} />
              <div>
                <small>PRÉVIA DA COLUNA</small>
                <strong>{stageEditor.name || "Nome da etapa"}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setStageEditor(null)}
              >
                Cancelar
              </button>
              <button className="primary">
                {stageEditor.id ? "Salvar alterações" : "Criar etapa"}
              </button>
            </div>
          </form>
        </div>
      )}
      {stageContact && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setStageContact(null)}
        >
          <form
            className="modal stage-contact-modal full-contact-modal"
            onSubmit={saveStageContact}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">NOVO CARTÃO NO FUNIL</span>
                <h2>Adicionar contato em {selected?.name}</h2>
              </div>
              <button type="button" onClick={() => setStageContact(null)}>
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                Lista de origem
                <select
                  className="form-select"
                  required
                  value={stageContact.listId}
                  onChange={(event) =>
                    setStageContact({
                      ...stageContact,
                      listId: event.target.value,
                    })
                  }
                >
                  {(selected?.lists.length ? selected.lists : lists).map(
                    (list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Etapa do funil
                <select
                  className="form-select"
                  required
                  value={stageContact.stageId}
                  onChange={(event) =>
                    setStageContact({
                      ...stageContact,
                      stageId: event.target.value,
                    })
                  }
                >
                  {selected?.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nome
                <input
                  autoFocus
                  required
                  value={stageContact.name}
                  onChange={(event) =>
                    setStageContact({
                      ...stageContact,
                      name: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={stageContact.email}
                  onChange={(event) =>
                    setStageContact({
                      ...stageContact,
                      email: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Telefone
                <input
                  value={stageContact.phone}
                  onChange={(event) =>
                    setStageContact({
                      ...stageContact,
                      phone: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Empresa
                <input
                  value={stageContact.company}
                  onChange={(event) =>
                    setStageContact({
                      ...stageContact,
                      company: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Vendedor responsável
                <select
                  className="form-select"
                  value={stageContact.assignedUserId}
                  onChange={(event) =>
                    setStageContact({
                      ...stageContact,
                      assignedUserId: event.target.value,
                    })
                  }
                >
                  <option value="">Usar automação da lista</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Produto desta oportunidade
                <select
                  className="form-select"
                  value={stageContact.productId}
                  onChange={(event) => setStageContact({ ...stageContact, productId: event.target.value })}
                >
                  <option value="">Sem produto vinculado</option>
                  {products
                    .filter((product) => !product.pipelineId || product.pipelineId === selected?.id)
                    .map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <small>Ao concluir a venda, este produto entra automaticamente na jornada do cliente.</small>
              </label>
              <label>
                Valor da negociação (R$)
                <input
                  inputMode="decimal"
                  value={stageContact.negotiationValue}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) =>
                    setStageContact({
                      ...stageContact,
                      negotiationValue: event.target.value,
                    })
                  }
                />
              </label>
            </div>
            <label>
              Observações
              <textarea
                rows={3}
                value={stageContact.notes}
                onChange={(event) =>
                  setStageContact({
                    ...stageContact,
                    notes: event.target.value,
                  })
                }
              />
            </label>
            <p className="form-hint">
              Se nenhum vendedor for escolhido, permanece válida a atribuição
              configurada na automação da lista.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setStageContact(null)}
              >
                Cancelar
              </button>
              <button className="primary">Criar cartão no funil</button>
            </div>
          </form>
        </div>
      )}
      {card && (
        <div className="modal-backdrop" onMouseDown={() => setCard(null)}>
          <section
            className="modal card-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">CARTÃO DO LEAD</span>
                <h2>{card.name || "Editar cartão"}</h2>
              </div>
              <button onClick={() => setCard(null)}>×</button>
            </div>
            <form onSubmit={saveCard}>
              <div className="form-grid">
                <label>
                  Nome
                  <input
                    value={card.name}
                    onChange={(event) =>
                      setCard({ ...card, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={card.email}
                    onChange={(event) =>
                      setCard({ ...card, email: event.target.value })
                    }
                  />
                </label>
                <label>
                  Telefone
                  <input
                    value={card.phone}
                    onChange={(event) =>
                      setCard({ ...card, phone: event.target.value })
                    }
                  />
                </label>
                <label>
                  Empresa
                  <input
                    value={card.company}
                    onChange={(event) =>
                      setCard({ ...card, company: event.target.value })
                    }
                  />
                </label>
              </div>
              <label className="easy-value-field">
                Valor da negociação (R$)
                <input
                  inputMode="decimal"
                  value={cardValueInput}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setCardValueInput(event.target.value)}
                  placeholder="Ex.: 1.500,00"
                />
                <small>
                  Digite o valor livremente. Ele será formatado ao salvar.
                </small>
              </label>
              <label>
                Vendedor responsável
                <select
                  className="form-select"
                  value={card.assignedUserId || ""}
                  onChange={(event) => {
                    const assignedUserId = event.target.value || null;
                    const assignedSeller =
                      sellers.find((seller) => seller.id === assignedUserId) ||
                      null;
                    setCard({ ...card, assignedUserId, assignedSeller });
                  }}
                >
                  <option value="">Sem vendedor</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Observações
                <textarea
                  rows={3}
                  value={card.notes}
                  onChange={(event) =>
                    setCard({ ...card, notes: event.target.value })
                  }
                />
              </label>
              <label>
                Produto desta oportunidade
                <select
                  className="form-select"
                  value={card.productId || ""}
                  onChange={(event) => setCard({ ...card, productId: event.target.value || null })}
                >
                  <option value="">Sem produto vinculado</option>
                  {products
                    .filter((product) => !product.pipelineId || product.pipelineId === selected?.id)
                    .map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <small>Ao concluir a venda, este produto entra automaticamente na jornada do cliente.</small>
              </label>
              <button className="primary save-card">Salvar alterações</button>
            </form>
            <section className="tasks-panel">
              <div className="follow-up-control">
                <div><span className="eyebrow">FOLLOW-UP AUTOMÁTICO</span><strong>{card.followUpEnabled ? "Acompanhamento ativo" : "Acompanhamento pausado"}</strong><small>Ao concluir um follow-up, o próximo é programado automaticamente.</small></div>
                <label className="follow-up-switch"><input type="checkbox" checked={card.followUpEnabled} onChange={(event) => configureFollowUp(event.target.checked)} /><span /></label>
                <label>Intervalo em dias<input type="number" min="1" max="365" step="1" value={card.followUpIntervalDays || Math.max(1, Math.round((card.followUpIntervalMinutes || 2880) / 1440))} onChange={(event) => setCard({ ...card, followUpIntervalDays: Number(event.target.value), followUpIntervalMinutes: Number(event.target.value) * 1440 })} /></label>
                {card.followUpEnabled && <button className="secondary small" onClick={() => configureFollowUp(true)}>Salvar intervalo</button>}
                <label className="follow-up-date">Próximo contato<input type="datetime-local" value={localDateTime(card.tasks.find((task) => task.kind === "follow_up" && !task.completed)?.dueDate || null)} onChange={(event) => rescheduleFollowUp(event.target.value)} /></label>
              </div>
              <div className="card-copy-actions">
                <div><span className="eyebrow">OUTRAS OPORTUNIDADES</span><small>Crie outra negociação para este mesmo lead sem alterar o cartão atual.</small></div>
                <button type="button" className="secondary" onClick={() => selected && duplicateCard(selected.id, card.stageId)}>Duplicar nesta etapa</button>
                <button type="button" className="secondary" onClick={() => { const target = pipelines.find((pipeline) => pipeline.id !== selected?.id); setCopyTarget(target ? { pipelineId: target.id, stageId: target.stages[0]?.id || "" } : { pipelineId: "", stageId: "" }); }}>Enviar cópia para outro funil</button>
              </div>
              <div className="tasks-title">
                <span className="eyebrow">TAREFAS</span>
                <strong>
                  {card.tasks.filter((task) => !task.completed).length}{" "}
                  pendentes
                </strong>
              </div>
              <div className="task-list">
                {card.tasks.map((task) => (
                  <div
                    className={task.completed ? "task completed" : "task"}
                    key={task.id}
                  >
                    <button onClick={() => toggleTask(task)}>
                      {task.completed ? "✓" : ""}
                    </button>
                    <span>
                      {task.title}
                      <small>
                        {task.dueDate
                          ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(task.dueDate))
                          : "Sem prazo"}
                        {task.kind === "follow_up" ? ` · Follow-up${task.reminderEnabled ? " · alerta por e-mail" : ""}` : ""}
                      </small>
                    </span>
                    <button onClick={() => deleteTask(task.id)}>×</button>
                  </div>
                ))}
              </div>
              <form className="add-task" onSubmit={addTask}>
                <select value={taskKind} onChange={(event) => setTaskKind(event.target.value as "task" | "follow_up")}><option value="follow_up">Follow-up com alerta</option><option value="task">Tarefa comum</option></select>
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Nova tarefa…"
                />
                <input
                  type="datetime-local"
                  value={taskDate}
                  onChange={(event) => setTaskDate(event.target.value)}
                />
                <button className="secondary">Adicionar</button>
              </form>
            </section>
          </section>
        </div>
      )}
      {card && copyTarget && (
        <div className="modal-backdrop nested-modal" onMouseDown={() => setCopyTarget(null)}>
          <section className="modal copy-card-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><span className="eyebrow">NOVA OPORTUNIDADE</span><h2>Enviar cópia para outro funil</h2></div><button type="button" onClick={() => setCopyTarget(null)}>×</button></div>
            <p className="copy-card-help">O cartão original será preservado. A cópia começa como uma nova negociação, com o valor padrão do funil escolhido.</p>
            <label>Funil de destino<select className="form-select" value={copyTarget.pipelineId} onChange={(event) => { const pipeline = pipelines.find((item) => item.id === event.target.value); setCopyTarget({ pipelineId: event.target.value, stageId: pipeline?.stages[0]?.id || "" }); }}><option value="">Escolha o funil</option>{pipelines.filter((pipeline) => pipeline.id !== selected?.id).map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}</select></label>
            <label>Etapa inicial<select className="form-select" value={copyTarget.stageId} disabled={!copyTarget.pipelineId} onChange={(event) => setCopyTarget({ ...copyTarget, stageId: event.target.value })}><option value="">Escolha a etapa</option>{pipelines.find((pipeline) => pipeline.id === copyTarget.pipelineId)?.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setCopyTarget(null)}>Cancelar</button><button type="button" className="primary" disabled={!copyTarget.pipelineId || !copyTarget.stageId} onClick={() => duplicateCard(copyTarget.pipelineId, copyTarget.stageId)}>Criar oportunidade</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
