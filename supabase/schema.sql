-- ============================================================================
-- Precious Metals Intelligence — Supabase schema
-- Run this in the Supabase SQL editor (or via the CLI / dashboard migration).
-- RLS is enabled on every table; users can only ever touch their own rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions / helpers
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  name                      text,
  email                     text,
  currency                  text not null default 'PKR',
  default_valuation_method  text not null default 'sell'
                            check (default_valuation_method in ('sell', 'buy', 'average')),
  default_chart_period      text not null default '30d'
                            check (default_chart_period in ('7d', '30d', '3m', '6m', '1y', 'all')),
  theme                     text not null default 'system'
                            check (theme in ('light', 'dark', 'system')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- market_rates
-- ---------------------------------------------------------------------------
create table if not exists public.market_rates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date               date not null,
  gold_buy_rate      numeric(14,2) check (gold_buy_rate is null or gold_buy_rate >= 0),
  gold_sell_rate     numeric(14,2) check (gold_sell_rate is null or gold_sell_rate >= 0),
  silver_buy_rate    numeric(14,2) check (silver_buy_rate is null or silver_buy_rate >= 0),
  silver_sell_rate   numeric(14,2) check (silver_sell_rate is null or silver_sell_rate >= 0),
  gold_unit          text not null default 'tola',
  silver_unit        text not null default 'tola',
  source             text,
  notes              text,
  -- future-ready, optional fields (live market integration later)
  usd_pkr            numeric(14,4),
  intl_gold_oz       numeric(14,2),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, date),
  constraint rates_need_at_least_one_rate check (
    coalesce(gold_buy_rate, gold_sell_rate, silver_buy_rate, silver_sell_rate) is not null
  )
);

create index if not exists market_rates_user_date_idx on public.market_rates (user_id, date);

drop trigger if exists market_rates_updated_at on public.market_rates;
create trigger market_rates_updated_at before update on public.market_rates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- investments — buying history. Selling later is handled in `transactions`
-- and never destroys these records.
-- ---------------------------------------------------------------------------
create table if not exists public.investments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_type      text not null check (asset_type in ('gold', 'silver')),
  investment_date date not null,
  quantity        numeric(18,6) not null check (quantity > 0),
  unit            text not null default 'tola',
  purchase_rate   numeric(14,2) not null check (purchase_rate > 0),
  total_amount    numeric(18,2) not null check (total_amount > 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists investments_user_date_idx on public.investments (user_id, investment_date);
create index if not exists investments_user_asset_idx on public.investments (user_id, asset_type);

drop trigger if exists investments_updated_at on public.investments;
create trigger investments_updated_at before update on public.investments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transactions — future-proof Buy / Sell ledger.
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  investment_id    uuid references public.investments(id) on delete set null,
  transaction_type text not null check (transaction_type in ('buy', 'sell')),
  asset_type       text not null check (asset_type in ('gold', 'silver')),
  quantity         numeric(18,6) not null check (quantity > 0),
  rate             numeric(14,2) not null check (rate > 0),
  total_amount     numeric(18,2) not null check (total_amount > 0),
  transaction_date date not null,
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists transactions_user_idx on public.transactions (user_id, transaction_date);
create index if not exists transactions_investment_idx on public.transactions (investment_id);

-- ---------------------------------------------------------------------------
-- market_notes — personal market journal
-- ---------------------------------------------------------------------------
create table if not exists public.market_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date           date not null,
  asset_type     text check (asset_type in ('gold', 'silver') or asset_type is null),
  note           text not null,
  rate_reference numeric(14,2),
  created_at     timestamptz not null default now()
);

create index if not exists market_notes_user_date_idx on public.market_notes (user_id, date desc);

-- ---------------------------------------------------------------------------
-- price_alerts
-- ---------------------------------------------------------------------------
create table if not exists public.price_alerts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_type     text not null check (asset_type in ('gold', 'silver')),
  condition      text not null
                 check (condition in ('above', 'below', 'increase_pct', 'decrease_pct')),
  target_price   numeric(14,2),
  target_pct     numeric(8,4),
  is_active      boolean not null default true,
  triggered_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists price_alerts_user_active_idx on public.price_alerts (user_id, is_active);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.market_rates  enable row level security;
alter table public.investments   enable row level security;
alter table public.transactions  enable row level security;
alter table public.market_notes  enable row level security;
alter table public.price_alerts  enable row level security;

do $$
declare t text;
begin
  -- ensure the authenticated role can read/write these tables
  foreach t in array array['profiles', 'market_rates', 'investments', 'transactions', 'market_notes', 'price_alerts']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['market_rates', 'investments', 'transactions', 'market_notes', 'price_alerts']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I
         for select to authenticated using (user_id = auth.uid())',
      t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I
         for insert to authenticated with check (user_id = auth.uid())',
      t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I
         for update to authenticated using (user_id = auth.uid())
         with check (user_id = auth.uid())',
      t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I
         for delete to authenticated using (user_id = auth.uid())',
      t || '_delete_own', t);
  end loop;

  -- profiles: id is the uid itself
  execute 'drop policy if exists profiles_select on public.profiles';
  execute 'create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid())';
  execute 'drop policy if exists profiles_insert on public.profiles';
  execute 'create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid())';
  execute 'drop policy if exists profiles_update on public.profiles';
  execute 'create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid())';
end $$;

-- ---------------------------------------------------------------------------
-- Onboarding helper: create a profile row for a newly signed-up user.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();