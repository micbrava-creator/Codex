create table public.crm_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  category text not null default 'course' check (category in ('training', 'certification', 'formation', 'course', 'mentoring', 'other')),
  description text not null default '' check (char_length(description) <= 4000),
  price_cents bigint not null default 0 check (price_cents >= 0),
  pipeline_id uuid references public.crm_pipelines(id) on delete set null,
  color text not null default '#5B5BD6',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_product_tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_product_track_items (
  track_id uuid not null references public.crm_product_tracks(id) on delete cascade,
  product_id uuid not null references public.crm_products(id) on delete cascade,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (track_id, product_id),
  unique (track_id, position)
);

alter table public.crm_contacts
  add column product_id uuid references public.crm_products(id) on delete set null;

create table public.crm_contact_purchases (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  product_id uuid not null references public.crm_products(id) on delete restrict,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  purchased_at timestamptz not null default now(),
  notes text not null default '' check (char_length(notes) <= 2000),
  source text not null default 'manual' check (source in ('manual', 'opportunity')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, product_id)
);

create index crm_products_pipeline_idx on public.crm_products(pipeline_id) where pipeline_id is not null;
create index crm_products_active_name_idx on public.crm_products(active, name);
create index crm_track_items_product_idx on public.crm_product_track_items(product_id);
create index crm_contacts_product_idx on public.crm_contacts(product_id) where product_id is not null;
create index crm_purchases_contact_date_idx on public.crm_contact_purchases(contact_id, purchased_at desc);
create index crm_purchases_product_idx on public.crm_contact_purchases(product_id);

create trigger crm_products_updated_at before update on public.crm_products
for each row execute function public.crm_set_updated_at();
create trigger crm_product_tracks_updated_at before update on public.crm_product_tracks
for each row execute function public.crm_set_updated_at();
create trigger crm_purchases_updated_at before update on public.crm_contact_purchases
for each row execute function public.crm_set_updated_at();

alter table public.crm_products enable row level security;
alter table public.crm_product_tracks enable row level security;
alter table public.crm_product_track_items enable row level security;
alter table public.crm_contact_purchases enable row level security;

create policy crm_products_select on public.crm_products for select to authenticated
using (capta_private.is_crm_active());
create policy crm_products_insert on public.crm_products for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_products_update on public.crm_products for update to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_products_delete on public.crm_products for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_tracks_select on public.crm_product_tracks for select to authenticated
using (capta_private.is_crm_active());
create policy crm_tracks_insert on public.crm_product_tracks for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_tracks_update on public.crm_product_tracks for update to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_tracks_delete on public.crm_product_tracks for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_track_items_select on public.crm_product_track_items for select to authenticated
using (capta_private.is_crm_active());
create policy crm_track_items_insert on public.crm_product_track_items for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_track_items_update on public.crm_product_track_items for update to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_track_items_delete on public.crm_product_track_items for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_purchases_select on public.crm_contact_purchases for select to authenticated
using (exists (
  select 1 from public.crm_contacts c
  where c.id = contact_id and (
    capta_private.current_crm_role() in ('manager', 'admin')
    or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
  )
));
create policy crm_purchases_insert on public.crm_contact_purchases for insert to authenticated
with check (exists (
  select 1 from public.crm_contacts c
  where c.id = contact_id and (
    capta_private.current_crm_role() in ('manager', 'admin')
    or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
  )
));
create policy crm_purchases_update on public.crm_contact_purchases for update to authenticated
using (exists (
  select 1 from public.crm_contacts c
  where c.id = contact_id and (
    capta_private.current_crm_role() in ('manager', 'admin')
    or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
  )
))
with check (exists (
  select 1 from public.crm_contacts c
  where c.id = contact_id and (
    capta_private.current_crm_role() in ('manager', 'admin')
    or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
  )
));
create policy crm_purchases_delete on public.crm_contact_purchases for delete to authenticated
using (exists (
  select 1 from public.crm_contacts c
  where c.id = contact_id and (
    capta_private.current_crm_role() in ('manager', 'admin')
    or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
  )
));

grant select, insert, update, delete on public.crm_products, public.crm_product_tracks,
  public.crm_product_track_items, public.crm_contact_purchases to authenticated;
revoke all on public.crm_products, public.crm_product_tracks,
  public.crm_product_track_items, public.crm_contact_purchases from anon;
