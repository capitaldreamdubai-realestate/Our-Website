-- Deals channel page (/deals) — assign via admin listing tags (multi-tag supported).
insert into public.property_listing_tags (name, sort_order)
values ('Deals', 25)
on conflict (name) do nothing;
