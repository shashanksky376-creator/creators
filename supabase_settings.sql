
-- Run this in Supabase SQL Editor
create table public.course_settings (
  id integer primary key default 1,
  timer_active boolean default false,
  timer_end bigint default 0,
  seats_left integer default 15,
  base_seats integer default 15
);

insert into public.course_settings (id, timer_active, timer_end, seats_left, base_seats)
values (1, false, 0, 15, 15);

-- Allow public access so our frontend can read it
alter table public.course_settings enable row level security;

create policy "Public can read settings"
on public.course_settings for select
using (true);

create policy "Allow update settings"
on public.course_settings for update
using (true);
