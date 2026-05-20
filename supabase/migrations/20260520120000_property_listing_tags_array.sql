-- Multiple listing tags per property (e.g. New + Offplan + For sale).
alter table public.properties
  add column if not exists tags text[] not null default '{}'::text[];

comment on column public.properties.tags is
  'All listing tags from property_listing_tags; drives channel pages and card badges.';

-- Backfill from legacy single tag column.
update public.properties
set tags = array[trim(tag)]::text[]
where cardinality(tags) = 0
  and tag is not null
  and trim(tag) <> '';

-- PF off-plan rows: ensure Offplan is in tags (not only pf_project_status).
update public.properties
set tags = tags || array['Offplan']::text[]
where pf_project_status is not null
  and replace(replace(lower(pf_project_status), '_', ' '), '-', ' ') like '%off plan%'
  and not ('Offplan' = any (tags));

-- Keep legacy tag column aligned (primary badge).
update public.properties
set tag = coalesce(tags[1], tag, 'For sale')
where cardinality(tags) > 0;
