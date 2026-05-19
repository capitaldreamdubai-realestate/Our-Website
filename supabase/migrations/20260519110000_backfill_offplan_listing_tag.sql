-- Align existing Property Finder off-plan rows with the Offplan listing tag used by /offplan.
update public.properties
set tag = 'Offplan'
where lower(trim(tag)) in ('new', 'off-plan', 'off plan', 'offplan')
  and pf_project_status is not null
  and replace(replace(lower(pf_project_status), '_', ' '), '-', ' ') like '%off plan%';
