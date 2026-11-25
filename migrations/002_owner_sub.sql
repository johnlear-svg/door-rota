alter table roles add column if not exists owner_sub text not null default '';
alter table weeks add column if not exists owner_sub text not null default '';

drop index if exists weeks_week_start_uidx;
create unique index if not exists weeks_owner_week_start_uidx on weeks (owner_sub, week_start);
create index if not exists roles_owner_idx on roles (owner_sub);
create index if not exists weeks_owner_idx on weeks (owner_sub);

-- Drop unowned legacy sample data (cascades slots/shifts), then shared seed roles.
delete from weeks where owner_sub = '';
delete from roles
where owner_sub = ''
  and id in ('role_manager', 'role_supervisor', 'role_door');
