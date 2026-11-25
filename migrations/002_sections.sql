-- Security vs Medical sectioning for contractor-scoped rotas.
alter table roles add column if not exists section text not null default 'security';
alter table weeks add column if not exists section text not null default 'security';

update roles set section = 'security'
where id in ('role_manager', 'role_supervisor', 'role_door');

insert into roles (id, name, rate_gbp, sort_order, section)
values
  ('role_medic', 'Medic', 35.00, 10, 'medical'),
  ('role_welfare', 'Welfare', 25.00, 11, 'medical')
on conflict (id) do nothing;

update roles set section = 'medical', name = 'Medic', rate_gbp = 35.00, sort_order = 10
where id = 'role_medic';
update roles set section = 'medical', name = 'Welfare', rate_gbp = 25.00, sort_order = 11
where id = 'role_welfare';

drop index if exists weeks_week_start_uidx;
create unique index if not exists weeks_week_start_section_uidx
  on weeks (week_start, section);
