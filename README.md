# CRM Instituto Forttuna

CRM comercial responsivo para contatos, listas, funis Kanban, produtos, eventos,
compras e jornada da cliente. A interface publicada atualmente mantém o D1 como
camada de compatibilidade; a pasta `supabase/` contém a migração incremental e o
webhook de produção para a transição ao PostgreSQL sem apagar dados existentes.

## Arquitetura

- Interface: React 19 + TypeScript + Tailwind/Vinext (compatível com Next.js).
- Publicação atual: ChatGPT Sites/Cloudflare.
- Banco de produção alvo: Supabase PostgreSQL com Supabase Auth e RLS.
- Webhook: Supabase Edge Function `greatpages-webhook`, sem JWT e protegida por
  token secreto individual de 256 bits por lista.
- Segredos: somente no runtime server-side ou nos secrets da Edge Function.

## Desenvolvimento

```bash
npm ci
npm run dev
npm test
```

O seed existente pertence apenas ao ambiente D1 de demonstração. Nunca execute
seed sobre o projeto Supabase de produção.

## Supabase

1. Crie ou conecte o projeto de produção.
2. Aplique, em ordem, `supabase/migrations/202608250001_crm_core.sql` e
   `supabase/migrations/202608250002_production_crm.sql`.
3. Crie o primeiro usuário no Supabase Auth e altere seu perfil para
   `administrator` pelo SQL Editor seguro.
4. Publique a função:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy greatpages-webhook --no-verify-jwt
```

O arquivo `supabase/config.toml` também desativa a validação JWT somente nessa
função pública. A função usa `SUPABASE_SERVICE_ROLE_KEY` exclusivamente dentro do
backend gerenciado pelo Supabase.

## Variáveis de ambiente

Copie os nomes de `.env.example`. No ambiente do frontend configure:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: valores públicos;
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: somente runtime server-side;
- `GREATPAGES_WEBHOOK_BASE_URL`:
  `https://PROJECT_REF.supabase.co/functions/v1/greatpages-webhook`;
- `NEXT_PUBLIC_APP_URL`: domínio público do CRM.

Resend e WhatsApp são opcionais até que as chaves dos provedores sejam fornecidas.
Nunca faça commit de `.env` ou de chaves reais.

## GreatPages

Na tela **Listas de Leads**, crie a lista, defina o funil e a etapa e clique em
**Configurar integração**. A URL só aparece depois que o backend do Supabase
responder. Cada lista recebe um token diferente.

O GreatPages pode enviar JSON ou formulário para:

```text
https://PROJECT_REF.supabase.co/functions/v1/greatpages-webhook?token=TOKEN
```

Campos aceitos incluem `name/nome/full_name`, `email/e-mail`,
`phone/telefone/celular/whatsapp`, UTMs e campos personalizados. O processamento:

1. valida token e lista ativa;
2. registra `webhook_events`;
3. deduplica por e-mail ou telefone;
4. cria/atualiza o contato e o vincula à lista;
5. atribui vendedor conforme configuração disponível;
6. cria oportunidade, atividade, jornada, tarefa e notificação interna;
7. atualiza contadores e retorna o status HTTP apropriado.

Use `x-idempotency-key` quando o provedor permitir. O botão **Testar Webhook**
envia `x-crm-test: true` e não cria um contato real.

## RLS e perfis

- Administrador: acesso completo e gestão de usuários/configurações.
- Gestor comercial: acesso ao conjunto comercial e equipe.
- Vendedor: contatos, oportunidades e tarefas atribuídas.

As policies estão na segunda migration. O webhook não depende de policies do
usuário final porque roda no backend com a service role.

## Publicação

O frontend pode ser publicado no Sites atual ou migrado para Vercel. Para Vercel,
adicione as mesmas variáveis nos ambientes Production/Preview e confirme que a
service role existe apenas no servidor. A URL do webhook continua sendo a Edge
Function do Supabase, portanto independe de o frontend estar público ou privado.

## Verificação obrigatória antes do uso real

- `npm test` sem erros;
- migrations aplicadas num projeto de homologação;
- primeiro administrador autenticando;
- RLS validada com administrador, gestor e vendedor;
- função publicada e teste retornando HTTP 200;
- POST real retornando HTTP 201 e criando contato, vínculo, oportunidade e log;
- token inválido retornando 401/404;
- repetição da mesma idempotency key sem duplicar dados;
- movimentação Kanban, tarefa e venda refletidas no dashboard.

Enquanto esses itens externos não forem executados, a integração deve aparecer
como **não configurada**, nunca como ativa.
