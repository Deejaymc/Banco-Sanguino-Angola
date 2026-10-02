create type public.app_role as enum ('admin','hospital','donor');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  phone text,
  blood_type text check (blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  birth_date date,
  city text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profile update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profile insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, blood_type)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'blood_type',''));
  insert into public.user_roles (user_id, role) values (new.id, 'donor');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- first admin bootstrap
create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
  return true;
end; $$;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where role='admin') $$;

create or replace function public.set_user_role(_user_id uuid, _role app_role, _grant boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  if _grant then
    insert into public.user_roles (user_id, role) values (_user_id, _role) on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = _role;
  end if;
end; $$;

create table public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  phone text,
  hours text,
  created_at timestamptz not null default now()
);
grant select on public.centers to anon, authenticated;
grant insert, update, delete on public.centers to authenticated;
grant all on public.centers to service_role;
alter table public.centers enable row level security;
create policy "centers public read" on public.centers for select to anon, authenticated using (true);
create policy "centers admin write" on public.centers for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null,
  center_id uuid not null references public.centers(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'agendado' check (status in ('agendado','concluido','cancelado')),
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "appt read" on public.appointments for select to authenticated
  using (donor_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "appt insert" on public.appointments for insert to authenticated
  with check (donor_id = auth.uid() and status = 'agendado');
create policy "appt update" on public.appointments for update to authenticated
  using (donor_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.inventory (
  blood_type text primary key check (blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units integer not null default 0 check (units >= 0),
  min_units integer not null default 20,
  updated_at timestamptz not null default now()
);
grant select on public.inventory to anon, authenticated;
grant update on public.inventory to authenticated;
grant all on public.inventory to service_role;
alter table public.inventory enable row level security;
create policy "inv read" on public.inventory for select to anon, authenticated using (true);
create policy "inv admin update" on public.inventory for update to authenticated
  using (public.has_role(auth.uid(),'admin'));

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null,
  center_id uuid references public.centers(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  blood_type text not null check (blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  volume_ml integer not null default 450,
  donated_at timestamptz not null default now()
);
grant select on public.donations to authenticated;
grant all on public.donations to service_role;
alter table public.donations enable row level security;
create policy "don read" on public.donations for select to authenticated
  using (donor_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.complete_appointment(_appointment_id uuid, _volume integer default 450)
returns void language plpgsql security definer set search_path = public as $$
declare a record; bt text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  select * into a from public.appointments where id = _appointment_id;
  if a is null or a.status <> 'agendado' then raise exception 'Agendamento inválido'; end if;
  select blood_type into bt from public.profiles where id = a.donor_id;
  if bt is null then raise exception 'Doador sem tipo sanguíneo registado'; end if;
  update public.appointments set status = 'concluido' where id = a.id;
  insert into public.donations (donor_id, center_id, appointment_id, blood_type, volume_ml)
    values (a.donor_id, a.center_id, a.id, bt, _volume);
  update public.inventory set units = units + 1, updated_at = now() where blood_type = bt;
end; $$;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  blood_type text check (blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  urgency text not null default 'normal' check (urgency in ('normal','alta','critica')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.campaigns to anon, authenticated;
grant insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "camp read" on public.campaigns for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "camp admin" on public.campaigns for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.hospital_requests (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null,
  hospital_name text not null,
  blood_type text not null check (blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units integer not null check (units > 0),
  urgency text not null default 'normal' check (urgency in ('normal','alta','critica')),
  status text not null default 'pendente' check (status in ('pendente','atendido','recusado')),
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert on public.hospital_requests to authenticated;
grant all on public.hospital_requests to service_role;
alter table public.hospital_requests enable row level security;
create policy "req read" on public.hospital_requests for select to authenticated
  using (hospital_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "req insert" on public.hospital_requests for insert to authenticated
  with check (hospital_id = auth.uid() and status = 'pendente' and public.has_role(auth.uid(),'hospital'));

create or replace function public.resolve_request(_request_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r record; stock int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  select * into r from public.hospital_requests where id = _request_id;
  if r is null or r.status <> 'pendente' then raise exception 'Pedido inválido'; end if;
  if _approve then
    select units into stock from public.inventory where blood_type = r.blood_type;
    if stock < r.units then raise exception 'Estoque insuficiente de %', r.blood_type; end if;
    update public.inventory set units = units - r.units, updated_at = now() where blood_type = r.blood_type;
    update public.hospital_requests set status = 'atendido' where id = r.id;
  else
    update public.hospital_requests set status = 'recusado' where id = r.id;
  end if;
end; $$;

insert into public.inventory (blood_type, units, min_units) values
 ('A+',42,25),('A-',9,12),('B+',28,15),('B-',5,8),('AB+',14,8),('AB-',3,5),('O+',61,30),('O-',7,20);

insert into public.centers (name, address, city, phone, hours) values
 ('Centro Nacional de Sangue','Rua Major Kanhangulo, 120','Luanda','+244 222 000 001','Seg–Sex 08h–17h'),
 ('Posto de Colheita Talatona','Via S8, Talatona','Luanda','+244 222 000 002','Seg–Sáb 08h–14h'),
 ('Hospital Central — Unidade de Colheita','Av. 4 de Fevereiro, 45','Benguela','+244 272 000 003','Seg–Sex 07h30–15h'),
 ('Posto Móvel Huambo','Largo da Independência','Huambo','+244 241 000 004','Ter e Qui 09h–13h');

insert into public.campaigns (title, description, blood_type, urgency) values
 ('Urgente: precisamos de O-','O estoque de O- está abaixo do mínimo. Doadores O- são universais e podem salvar qualquer pessoa.','O-','critica'),
 ('Semana do Doador','Durante esta semana, todos os postos funcionam em horário alargado.',null,'normal');