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
