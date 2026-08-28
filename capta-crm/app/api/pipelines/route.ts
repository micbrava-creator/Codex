import { NextResponse } from 'next/server';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../../../db';
import { cardTasks, contactLists, contacts, pipelines, pipelineStages, teamMembers } from '../../../db/schema';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const [allPipelines, stages, lists, members] = await Promise.all([getDb().select().from(pipelines).orderBy(desc(pipelines.createdAt)), getDb().select().from(pipelineStages).orderBy(asc(pipelineStages.position)), getDb().select({ id: contactLists.id, name: contactLists.name, pipelineId: contactLists.pipelineId }).from(contactLists), getDb().select({ id: teamMembers.id, name: teamMembers.name, email: teamMembers.email }).from(teamMembers)]);
  const stageIds = stages.map((stage) => stage.id);
  const cards = stageIds.length ? await getDb().select().from(contacts).where(inArray(contacts.stageId, stageIds)).orderBy(desc(contacts.updatedAt)) : [];
  const cardIds = cards.map((card) => card.id);
  const tasks = cardIds.length ? await getDb().select().from(cardTasks).where(inArray(cardTasks.contactId, cardIds)).orderBy(asc(cardTasks.dueDate)) : [];
  return NextResponse.json(allPipelines.map((pipeline) => ({ ...pipeline, lists: lists.filter((list) => list.pipelineId === pipeline.id), stages: stages.filter((stage) => stage.pipelineId === pipeline.id).map((stage) => ({ ...stage, cards: cards.filter((card) => card.stageId === stage.id).map((card) => ({ ...card, assignedSeller: members.find((member) => member.id === card.assignedUserId) || null, tasks: tasks.filter((task) => task.contactId === card.id) })) })) })));
}

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { name?: string; color?: string }; const name = body.name?.trim(); if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const pipeline = { id: crypto.randomUUID(), name, color: body.color || '#5B5BD6', createdAt: new Date() }; await getDb().insert(pipelines).values(pipeline);
  await getDb().insert(pipelineStages).values(['Novo lead', 'Em contato', 'Proposta'].map((stageName, position) => ({ id: crypto.randomUUID(), pipelineId: pipeline.id, name: stageName, position, color: ['#E8E7FF', '#FFF1D6', '#E4F4EC'][position] })));
  return NextResponse.json(pipeline, { status: 201 });
}
