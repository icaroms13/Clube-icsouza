# Clube de Recomendações — IC Souza

Versão de produção completa: banco de dados real (Supabase), fotos dos brindes em
armazenamento real (Supabase Storage), e-mails automáticos (Resend), código no
GitHub e site publicado na Vercel.

## O que tem nesta versão

- Login por CPF com senha criptografada e sessão que persiste (30 dias).
- Recomendação com todos os campos (idade, profissão, cidade, relação, filhos,
  casado) e aviso obrigatório de que o Ícaro vai entrar em contato.
- Fluxo de reunião: agendar (data/hora) → marcar realizada (+10 pts) ou não
  realizada → marcar que virou cliente → contagem automática de 90 dias → +100
  pts creditados sozinhos, sem você precisar voltar lá.
- Catálogo de resgate com foto de verdade, editável pelo admin (adicionar,
  editar, remover, trocar foto).
- Resgates com status Novo → Em andamento → Entregue.
- Painel de Comunicação: liga/desliga cada um dos 6 e-mails automáticos, dispara
  campanhas manuais, e mostra o histórico de tudo que foi enviado.
- E-mails automáticos via Resend para o cliente (recomendação registrada, reunião
  agendada, virou cliente, pontos creditados, novo brinde, lembrete de
  inatividade) e para você (nova recomendação, novo resgate solicitado).
- Estorno automático: se uma pessoa que virou cliente cancelar a apólice em até
  3 meses, os 100 pontos do bônus por "virar cliente" são removidos do
  indicador (os 10 pontos da reunião nunca são removidos). Se isso zerar o
  saldo dele, o acesso fica suspenso por 3 meses — tudo automático, avisando
  o cliente por e-mail.
- Resumo semanal por e-mail pra você: toda segunda-feira, se alguém que foi
  recomendado virou cliente na última semana, você recebe um e-mail com a lista.

---

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um novo projeto.
2. No menu lateral, vá em **SQL Editor** → **New query**, cole todo o conteúdo
   de `supabase/schema.sql` e clique em **Run**.
   **Já rodou uma versão anterior deste schema?** Role até o final do arquivo
   e rode só o bloco "MIGRAÇÃO" — ele adiciona as colunas novas sem apagar nada.
3. Crie o bucket de fotos dos brindes: vá em **Storage** → **New bucket** →
   nome exatamente `brindes` → marque **Public bucket** → **Create bucket**.
   (é nele que as fotos que você subir pelo painel admin ficam guardadas)
4. Em **Project Settings → API**, guarde três valores: **Project URL**, **anon
   public key** e **service_role key** (clique em "Reveal").

### 2. Criar conta na Resend e configurar o domínio de e-mail

Você já criou a conta — falta só isso:

1. No painel da Resend, vá em **Domains** → **Add Domain**.
2. Digite um domínio ou subdomínio seu, por exemplo `avisos.icsouza.com.br`
   (usar um subdomínio dedicado a e-mails é uma boa prática — não precisa ser
   o domínio principal do site).
3. A Resend vai te dar 3-4 registros DNS (tipo TXT, MX e CNAME) para colar no
   painel do seu provedor de domínio (Registro.br, GoDaddy, Cloudflare, etc.).
   Isso é o que prova que você é dono do domínio e habilita o envio.
4. Depois de colar os registros, volta na Resend e clica em **Verify DNS**.
   Pode levar de alguns minutos a algumas horas para propagar.
5. Em **API Keys** → **Create API Key**, copie a chave (começa com `re_`).
   **Não precisa me enviar essa chave** — ela vai direto para as variáveis de
   ambiente da Vercel no passo 4, e só o servidor do seu site a utiliza.

**Não tem domínio ainda?** Dá pra comprar um `.com.br` no
[registro.br](https://registro.br) por cerca de R$40/ano — leva uns 10 minutos
e no mesmo dia já dá pra seguir os passos acima. Se preferir não usar seu
domínio principal, um domínio bem simples e barato só para os e-mails (tipo
`icsouzaclube.com.br`) também funciona perfeitamente.

### 3. Subir o código no GitHub

Crie um repositório (pode ser privado) e suba todos os arquivos desta pasta.
Não suba o `.env` — ele nem existe ainda, as variáveis vão direto na Vercel.

### 4. Publicar na Vercel

1. Em [vercel.com](https://vercel.com), **Add New → Project**, escolha o
   repositório.
2. Antes de clicar em Deploy, abra **Environment Variables** e adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key do Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key do Supabase |
   | `ADMIN_PASSWORD` | a senha que você quer usar no `/admin` |
   | `SESSION_SECRET` | uma string aleatória longa (pode gerar em [1password.com/password-generator](https://1password.com/password-generator) ou similar) |
   | `RESEND_API_KEY` | a chave que começa com `re_`, da Resend |
   | `EMAIL_FROM` | ex: `Clube de Recomendações IC Souza <clube@avisos.icsouza.com.br>` — precisa ser do domínio verificado no passo 2 |
   | `ADMIN_NOTIFY_EMAIL` | `icaromsouza13@gmail.com` |
   | `CRON_SECRET` | outra string aleatória longa |

3. Clique em **Deploy**. Em 1-2 minutos o site está no ar.
4. As rotinas automáticas já estão configuradas em `vercel.json` e rodam sozinhas:
   contagem dos 90 dias + lembrete de inatividade todo dia às 9h (UTC), e o
   resumo semanal de quem virou cliente toda segunda-feira às 9h (UTC). Não
   precisa fazer nada a mais.

### 5. Testar

- Link normal → login do cliente. Toque em "primeiro acesso" pra criar conta
  com CPF, senha e e-mail.
- `SEU-LINK/admin` → painel do Ícaro.
- `SEU-LINK/demo` → entra automaticamente como cliente de teste.
- No admin, aba **Config**: cole os CPFs autorizados. Aba **Catálogo**: cadastre
  os brindes de verdade com fotos. Aba **Comunicação**: confira se os 6
  e-mails automáticos estão ativados do jeito que você quer.

### 6. Domínio próprio para o site (opcional, separado do domínio de e-mail)

Em **Settings → Domains** do projeto na Vercel, adicione algo como
`clube.icsouza.com.br`. Isso é o link que os clientes acessam — diferente do
domínio/subdomínio que você configurou na Resend só para enviar e-mail.

---

## Rodando localmente (opcional)

```bash
npm install
cp .env.example .env.local   # preencha com os valores acima
npm run dev
```

## Pendências que ainda dependem de você

- Cadastrar os brindes reais no catálogo (aba Catálogo do admin).
- Revisar o texto das regras (aba Config do admin — já vem com um texto
  pronto, em linguagem simples, mas pode ajustar como quiser).
- Verificar o domínio na Resend (passo 2 acima) — sem isso, os e-mails não saem.

## Estrutura do projeto

```
app/
  page.tsx                    → login / primeiro acesso do cliente
  cliente/                     → dashboard do cliente
  admin/
    AdminPanel.tsx              → shell com as abas
    tabs/                       → Recomendações, Clientes, Resgates, Catálogo, Comunicação, Config
  demo/                         → acesso de demonstração
  api/cron/daily/               → rotina automática diária (90 dias + inatividade)
  api/cron/weekly/              → resumo semanal de quem virou cliente
  actions/                      → toda a lógica de banco de dados (server actions)
lib/
  supabase-admin.ts             → conexão com o Supabase
  session.ts                    → login/sessão via cookie seguro
  levels.ts                     → regras de pontos e níveis
  resend.ts                     → envio de e-mail via Resend
  automations.ts                → os 6 gatilhos de e-mail + notificações ao admin
  points.ts                     → credita pontos e dispara o e-mail correspondente
  cron-jobs.ts                  → rotinas internas chamadas pelo cron (não expostas como action)
components/                     → peças de UI reutilizáveis
supabase/schema.sql             → script para criar todas as tabelas e o bucket de fotos
vercel.json                     → agenda a rotina automática diária
```
