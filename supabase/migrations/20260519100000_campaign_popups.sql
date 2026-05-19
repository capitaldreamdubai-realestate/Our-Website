-- Campaign popups for marketing: admin CRUD, public read active only, lead capture via form_submissions

create table if not exists public.campaign_popups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  internal_name text not null,
  title text not null,
  description text,
  image_url text not null,
  active boolean not null default false,
  trigger_type text not null default 'delay'
    check (trigger_type in ('immediate', 'delay', 'scroll')),
  trigger_delay_seconds integer
    check (trigger_delay_seconds is null or trigger_delay_seconds >= 0),
  trigger_scroll_percent integer
    check (
      trigger_scroll_percent is null
      or (trigger_scroll_percent >= 0 and trigger_scroll_percent <= 100)
    ),
  target_paths text[] not null default '{}'::text[],
  show_once_per_session boolean not null default true,
  submit_button_label text,
  sort_order integer not null default 0
);

create index if not exists campaign_popups_active_sort_idx
  on public.campaign_popups (active, sort_order, created_at desc);

drop trigger if exists campaign_popups_updated_at on public.campaign_popups;
create trigger campaign_popups_updated_at
  before update on public.campaign_popups
  for each row execute function public.set_updated_at();

alter table public.campaign_popups enable row level security;

create policy "campaign_popups_select_active_anon"
  on public.campaign_popups for select to anon
  using (active = true);

create policy "campaign_popups_all_auth"
  on public.campaign_popups for all to authenticated
  using (true) with check (true);

-- Extend form_submissions for campaign popup leads
alter table public.form_submissions
  drop constraint if exists form_submissions_source_check;

alter table public.form_submissions
  add constraint form_submissions_source_check
  check (source in ('property_enquiry', 'campaign_popup'));

alter table public.form_submissions
  add column if not exists popup_id uuid references public.campaign_popups (id) on delete set null;

create index if not exists form_submissions_popup_id_idx
  on public.form_submissions (popup_id)
  where popup_id is not null;
