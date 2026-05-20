-- Combined: multi-tag column + Deals listing tag (safe to re-run).
alter table public.properties
  add column if not exists tags text[] not null default '{}'::text[];

comment on column public.properties.tags is
  'All listing tags from property_listing_tags; drives channel pages and card badges.';

update public.properties
set tags = array[trim(tag)]::text[]
where cardinality(tags) = 0
  and tag is not null
  and trim(tag) <> '';

update public.properties
set tags = tags || array['Offplan']::text[]
where pf_project_status is not null
  and replace(replace(lower(pf_project_status), '_', ' '), '-', ' ') like '%off plan%'
  and not ('Offplan' = any (tags));

update public.properties
set tag = coalesce(tags[1], tag, 'For sale')
where cardinality(tags) > 0;

insert into public.property_listing_tags (name, sort_order)
values ('Deals', 25)
on conflict (name) do nothing;
