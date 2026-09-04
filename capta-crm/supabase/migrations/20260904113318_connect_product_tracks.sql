alter table public.crm_product_tracks
  add column next_track_id uuid references public.crm_product_tracks(id) on delete set null;

alter table public.crm_product_tracks
  add constraint crm_product_tracks_not_self_connected
  check (next_track_id is null or next_track_id <> id);

create index crm_product_tracks_next_idx
  on public.crm_product_tracks(next_track_id)
  where next_track_id is not null;
