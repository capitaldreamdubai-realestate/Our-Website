-- UAE property developers lookup + optional FK on listings.

create table if not exists public.property_developers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description_html text,
  logo_url text,
  website_url text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists property_developers_updated_at on public.property_developers;
create trigger property_developers_updated_at
  before update on public.property_developers
  for each row execute function public.set_updated_at();

alter table public.property_developers enable row level security;

create policy "property_developers_select_public"
  on public.property_developers for select to anon
  using (published = true);

create policy "property_developers_all_auth"
  on public.property_developers for all to authenticated
  using (true) with check (true);

alter table public.properties
  add column if not exists developer_id uuid references public.property_developers (id) on delete set null;

create index if not exists properties_developer_id_idx on public.properties (developer_id);

comment on table public.property_developers is
  'UAE developer brands for listing assignment and public developer directory.';
comment on column public.properties.developer_id is
  'Optional FK to property_developers; public developer pages only show developers with published listings.';

insert into public.property_developers (slug, name, sort_order, published)
values
  ('emaar', 'Emaar Properties', 1, true),
  ('damac', 'DAMAC Properties', 2, true),
  ('nakheel', 'Nakheel', 3, true),
  ('meraas', 'Meraas', 4, true),
  ('sobha-realty', 'Sobha Realty', 5, true),
  ('dubai-properties', 'Dubai Properties', 6, true),
  ('omniyat', 'Omniyat', 7, true),
  ('binghatti', 'Binghatti Developers', 8, true),
  ('ellington', 'Ellington Properties', 9, true),
  ('select-group', 'Select Group', 10, true),
  ('aldar', 'Aldar Properties', 11, true),
  ('azizi', 'Azizi Developments', 12, true),
  ('danube', 'Danube Properties', 13, true),
  ('tiger-properties', 'Tiger Properties', 14, true),
  ('samana', 'Samana Developers', 15, true),
  ('imtiaz', 'Imtiaz Developments', 16, true),
  ('object-1', 'Object 1', 17, true),
  ('arada', 'Arada', 18, true),
  ('majid-al-futtaim', 'Majid Al Futtaim Properties', 19, true),
  ('reportage', 'Reportage Properties', 20, true),
  ('bloom-holding', 'Bloom Holding', 21, true),
  ('eagle-hills', 'Eagle Hills', 22, true),
  ('rak-properties', 'RAK Properties', 23, true),
  ('nshama', 'Nshama', 24, true),
  ('wasl', 'Wasl Properties', 25, true),
  ('union-properties', 'Union Properties', 26, true),
  ('meydan', 'Meydan Group', 27, true),
  ('deyaar', 'Deyaar Development', 28, true),
  ('mag', 'MAG Property Development', 29, true),
  ('dar-global', 'Dar Global', 30, true),
  ('imkan', 'Imkan', 31, true),
  ('taraf', 'Taraf Holding', 32, true),
  ('aqua', 'Aqua Properties', 33, true),
  ('prescott', 'Prescott Real Estate', 34, true),
  ('ginco', 'Ginco Properties', 35, true),
  ('seven-tides', 'Seven Tides', 36, true),
  ('diamond-developers', 'Diamond Developers', 37, true),
  ('liv', 'LIV Developers', 38, true),
  ('signature-developers', 'Signature Developers', 39, true),
  ('prestige-one', 'Prestige One Developments', 40, true),
  ('swiss-property', 'Swiss Property UAE', 41, true),
  ('peace-homes', 'Peace Homes Development', 42, true),
  ('q-properties', 'Q Properties', 43, true),
  ('hmb-homes', 'HMB Homes', 44, true),
  ('townx', 'TownX Development', 45, true),
  ('alef', 'Alef Group', 46, true),
  ('al-barari', 'Al Barari Development', 47, true),
  ('acube', 'Acube Developments', 48, true),
  ('leos', 'Leos Development', 49, true),
  ('centurion', 'Centurion Developers', 50, true)
on conflict (slug) do nothing;
