# Capta CRM

CRM leve para organizar contatos em várias listas e receber leads do Great Pages por webhook exclusivo.

## Recursos

- Criação, edição e exclusão de listas segmentadas
- Cadastro, edição, busca e exclusão de contatos
- Importação de até 500 contatos por arquivo CSV, com prévia e deduplicação por e-mail
- Exportação de todos os contatos da lista em CSV compatível com Excel/Google Sheets
- Modelo de CSV disponível diretamente na tela de importação
- Funis de vendas vinculados às listas, com entrada automática na primeira etapa
- Kanban com movimentação de cartões por arrastar e soltar
- Criação, edição e exclusão de funis e etapas, com cores personalizáveis
- Cartões Kanban em três tamanhos: pequeno, médio e grande
- Aba de Automação para direcionar cada lista ao funil desejado
- Escolha da etapa exata de entrada para cada lista, inclusive para leads do Great Pages
- Reordenação das etapas do funil para frente ou para trás
- Direcionamento opcional para um funil já durante a criação da lista
- Edição completa do cartão do lead e tarefas com prazo e conclusão
- Interface responsiva para celular, notebook e desktop
- Data e horário de entrada visíveis e incluídos na exportação CSV
- Acesso individual via conta ChatGPT, com perfis de gestor, vendedor e administrativo
- Gestão de equipe por e-mail e ativação/desativação de acessos
- Atribuição manual, vendedor fixo ou distribuição alternada por lista
- Rodízio com reserva atômica para entradas simultâneas
- Alertas de novos leads por e-mail para o vendedor responsável
- Aba de E-mails para personalizar assunto e mensagem do alerta, com prévia e informações dinâmicas do lead
- Nome do vendedor em todos os cartões Kanban e troca manual do responsável na edição do cartão
- Valor padrão por funil aplicado automaticamente aos novos leads, com edição por negociação
- Totais financeiros e percentual de distribuição/conversão visíveis em cada etapa do Kanban
- Conversão de cada etapa calculada em relação à etapa imediatamente anterior para identificar gargalos
- Troca rápida de etapa diretamente no cartão, além do movimento por arrastar e soltar
- Venda concluída por cartão, com conversão geral e soma do valor efetivamente vendido
- Painel do funil com contatos recebidos, potencial total, conversão e faturamento concluído
- Histórico de passagem por etapas e conversão de cada etapa sobre o total de entradas do funil
- Dashboard executivo com KPIs gerais, desempenho por vendedor, origens e pipeline financeiro
- Cadastro manual com escolha explícita da lista de destino e aplicação da respectiva automação
- Dashboard completo com todos os leads, filtro mensal ou total e ranking dos três melhores e três piores funis
- Cadastro direto em qualquer etapa do Kanban e ordenação crescente/decrescente dos resultados
- Quadro comercial com tarefas pendentes e ticket médio individual por vendedor
- URL de webhook exclusiva e copiável para cada lista
- Recebimento de JSON ou formulário (`application/x-www-form-urlencoded` / `multipart/form-data`)
- Compatibilidade com campos em português e inglês: `nome`/`name`, `email`, `telefone`/`phone`, `whatsapp`, `empresa`/`company`
- Deduplicação de e-mail dentro da mesma lista
- Persistência em banco D1

## Great Pages

No painel do CRM, crie ou selecione uma lista e copie a URL em **Webhook desta lista**. Configure o Great Pages para enviar um `POST` para essa URL. Exemplo de payload:

```json
{
  "nome": "Ana Silva",
  "email": "ana@empresa.com",
  "telefone": "11999999999",
  "empresa": "Empresa Exemplo"
}
```

O webhook responde `201` para um lead criado e `200` quando o e-mail já existe na lista.

## Desenvolvimento

```bash
npm install
npm run dev
```

O projeto foi criado do zero com Next.js/Vinext, Cloudflare Workers e banco D1.
