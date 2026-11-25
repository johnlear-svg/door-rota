create table if not exists roles (
  id text primary key,
  name text not null,
  rate_gbp numeric(10,2) not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists weeks (
  id text primary key,
  week_start date not null,
  label text not null default '',
  notes text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists weeks_week_start_uidx on weeks (week_start);

create table if not exists week_days (
  id text primary key,
  week_id text not null references weeks(id) on delete cascade,
  day_index int not null check (day_index between 0 and 6),
  event_name text not null default '',
  unique (week_id, day_index)
);

create table if not exists staff_slots (
  id text primary key,
  week_id text not null references weeks(id) on delete cascade,
  role_id text not null references roles(id),
  person_name text not null default '',
  rate_gbp numeric(10,2) not null,
  sort_order int not null default 0
);

create index if not exists staff_slots_week_idx on staff_slots (week_id);

create table if not exists shifts (
  id text primary key,
  slot_id text not null references staff_slots(id) on delete cascade,
  day_index int not null check (day_index between 0 and 6),
  start_time text,
  end_time text,
  unique (slot_id, day_index)
);

create index if not exists shifts_slot_idx on shifts (slot_id);

insert into roles (id, name, rate_gbp, sort_order)
values
  ('role_manager', 'Security Manager', 25.00, 1),
  ('role_supervisor', 'Supervisor', 22.00, 2),
  ('role_door', 'Door Staff', 20.00, 3)
on conflict (id) do nothing;
