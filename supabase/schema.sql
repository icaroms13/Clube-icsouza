-- Clube de Recomendações IC Souza — Schema do banco de dados (v2)
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > cole > Run
-- Se você já rodou a v1 antes, rode DROP TABLE IF EXISTS referrals CASCADE; antes de tudo,
-- ou use um projeto Supabase novo — os dados de teste antigos não são compatíveis com o v2.

-- CPFs autorizados a criar login (Ícaro cola a lista aqui pelo painel admin)
create table if not exists authorized_cpfs (
  cpf text primary key,
  created_at timestamptz default now()
);

-- Clientes que já criaram senha e estão usando o app
create table if not exists clients (
  cpf text primary key references authorized_cpfs(cpf) on delete cascade,
  password_hash text not null,
  email text,
  points integer not null default 0,
  active boolean not null default true,
  blocked_until timestamptz,       -- bloqueio temporário (3 meses) quando um estorno zera o saldo
  last_referral_at timestamptz,
  last_inactivity_email_at timestamptz,
  created_at timestamptz default now()
);

-- Recomendações cadastradas pelos clientes
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  referrer_cpf text not null references clients(cpf) on delete cascade,
  name text not null,
  phone text not null,
  age text,
  city text,
  profession text,
  relationship text,
  has_children boolean,
  married boolean,
  description text,
  confirmed_contact_notice boolean not null default false,
  status text not null default 'aguardando'
    check (status in ('aguardando','agendada','realizada','naorealizada','contando','cliente','cancelada')),
  meeting_date date,
  meeting_time time,
  became_client_at timestamptz,   -- quando o admin marcou "virou cliente" (início da contagem de 90 dias)
  bonus_credited_at timestamptz,  -- quando os +100 foram creditados (fim da contagem)
  client_cancelled_at timestamptz, -- quando o admin marcou que essa pessoa cancelou a apólice dela
  promoted_cpf text,              -- se a pessoa recomendada virou cliente com acesso próprio ao portal
  created_at timestamptz default now()
);

-- Catálogo de itens resgatáveis (Ícaro edita pelo painel admin, com foto)
create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points integer not null,
  image_url text,
  created_at timestamptz default now()
);

-- Solicitações de resgate
create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  client_cpf text not null references clients(cpf) on delete cascade,
  item_id uuid references catalog_items(id) on delete set null,
  item_name text not null,
  points integer not null,
  status text not null default 'novo' check (status in ('novo','andamento','entregue')),
  created_at timestamptz default now()
);

-- Texto das regras do clube (editável pelo admin, mostrado no pop-up ao logar)
create table if not exists app_settings (
  key text primary key,
  value text
);

insert into app_settings (key, value) values
  ('rules_text',
  '1. Recomende alguém que você conhece e confia, preenchendo os dados que ajudam o Ícaro a se preparar para a conversa.

2. Antes de enviar, avise essa pessoa que o Ícaro Souza vai entrar em contato com ela.

3. Quando o Ícaro conseguir se reunir com a pessoa recomendada, você ganha 10 pontos — é assim que você vai saber que a conversa aconteceu.

4. Se essa pessoa virar cliente da IC Souza, você ganha mais 100 pontos. Esse bônus é confirmado automaticamente 90 dias depois que ela vira cliente, e você acompanha essa contagem aqui no portal.

5. Se essa pessoa cancelar a apólice dela em até 3 meses depois de virar cliente, os 100 pontos do bônus são removidos do seu saldo (os 10 pontos da reunião continuam garantidos, isso nunca é removido). Se a remoção dos 100 pontos zerar seu saldo porque você já tinha usado em algum brinde, seu acesso à plataforma fica suspenso por 3 meses.

6. Seus pontos valem por 1 ano a partir da data em que são creditados.

7. Se sua apólice for cancelada, o acesso ao clube é encerrado e o saldo de pontos é perdido automaticamente.')
on conflict (key) do nothing;

-- Automações de e-mail: ligadas/desligadas pelo admin na aba Comunicação
create table if not exists email_automations (
  key text primary key,
  label text not null,
  subject text not null,
  enabled boolean not null default true
);
insert into email_automations (key, label, subject) values
  ('onReferral',        'Cliente cadastrou uma recomendação',        'Recebemos sua recomendação! 🎉'),
  ('onScheduled',       'Pessoa recomendada agendou reunião',        'Sua recomendação agendou uma conversa com o Ícaro'),
  ('onBecameClient',    'Pessoa recomendada virou cliente',          'Sua recomendação virou cliente da IC Souza! 🎯'),
  ('onPointsAdded',     'Pontos adicionados ao saldo',                'Você ganhou pontos no Clube de Recomendações'),
  ('onNewCatalogItem',  'Novo brinde no catálogo',                    'Novidade no catálogo de resgate 🎁'),
  ('onInactive',        'Cliente sem recomendar há 1 mês',            'Sentimos sua falta no Clube de Recomendações')
on conflict (key) do nothing;

-- Histórico de e-mails disparados (automáticos e manuais)
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  type text not null check (type in ('auto','manual')),
  created_at timestamptz default now()
);

-- Seed: CPF do Ícaro e CPF de demonstração já autorizados
insert into authorized_cpfs (cpf) values ('23216878864'), ('00000000000')
on conflict (cpf) do nothing;

-- Índices úteis
create index if not exists idx_recommendations_referrer on recommendations(referrer_cpf);
create index if not exists idx_recommendations_status on recommendations(status);
create index if not exists idx_redemptions_status on redemptions(status);
create index if not exists idx_clients_active on clients(active);

-- Row Level Security: todo acesso passa pelo servidor (Server Actions com service role),
-- então bloqueamos acesso direto do navegador por padrão.
alter table authorized_cpfs enable row level security;
alter table clients enable row level security;
alter table recommendations enable row level security;
alter table catalog_items enable row level security;
alter table redemptions enable row level security;
alter table app_settings enable row level security;
alter table email_automations enable row level security;
alter table email_log enable row level security;

-- Nenhuma policy de select/insert pública é criada de propósito:
-- só a service role key (usada nas Server Actions, nunca no navegador) tem acesso.

-- Bucket de Storage para as fotos dos brindes.
-- O Supabase não deixa criar buckets por SQL puro de forma consistente entre projetos,
-- então crie pelo painel: Storage > New bucket > nome "brindes" > marque "Public bucket".
-- (o passo a passo completo está no README.md)

-- ============================================================================
-- MIGRAÇÃO: já rodou esta schema antes e só quer aplicar as novidades?
-- Rode só o bloco abaixo (é seguro rodar de novo, ele não duplica nada).
-- ============================================================================
alter table clients add column if not exists blocked_until timestamptz;
alter table recommendations add column if not exists client_cancelled_at timestamptz;

alter table recommendations drop constraint if exists recommendations_status_check;
alter table recommendations add constraint recommendations_status_check
  check (status in ('aguardando','agendada','realizada','naorealizada','contando','cliente','cancelada'));

alter table recommendations add column if not exists description text;
