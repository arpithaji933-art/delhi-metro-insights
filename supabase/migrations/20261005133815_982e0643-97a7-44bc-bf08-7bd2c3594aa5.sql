create type public.app_role as enum ('admin','viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  line text not null,
  zone text not null,
  is_interchange boolean not null default false,
  opened_year int not null default 2005,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.stations to authenticated;
grant all on public.stations to service_role;
alter table public.stations enable row level security;
create policy "stations read" on public.stations for select to authenticated using (true);
create policy "stations admin write" on public.stations for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.ridership_daily (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  day date not null,
  entries int not null default 0,
  exits int not null default 0,
  unique (station_id, day)
);
grant select, insert, update, delete on public.ridership_daily to authenticated;
grant all on public.ridership_daily to service_role;
alter table public.ridership_daily enable row level security;
create policy "ridership read" on public.ridership_daily for select to authenticated using (true);
create policy "ridership admin write" on public.ridership_daily for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.ridership_hourly (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  hour int not null,
  avg_entries int not null default 0,
  unique (station_id, hour)
);
grant select, insert, update, delete on public.ridership_hourly to authenticated;
grant all on public.ridership_hourly to service_role;
alter table public.ridership_hourly enable row level security;
create policy "hourly read" on public.ridership_hourly for select to authenticated using (true);
create policy "hourly admin write" on public.ridership_hourly for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.stations (name, line, zone, is_interchange, opened_year) values
('Rajiv Chowk','Blue','Central',true,2005),
('Kashmere Gate','Red','North',true,2002),
('New Delhi','Yellow','Central',true,2005),
('Chandni Chowk','Yellow','North',false,2005),
('Hauz Khas','Yellow','South',true,2010),
('Central Secretariat','Yellow','Central',true,2005),
('Huda City Centre','Yellow','Gurugram',false,2010),
('Saket','Yellow','South',false,2010),
('Dwarka Sector 21','Blue','West',true,2010),
('Noida City Centre','Blue','Noida',false,2009),
('Botanical Garden','Blue','Noida',true,2009),
('Mandi House','Blue','Central',true,2006),
('Yamuna Bank','Blue','East',true,2009),
('Rajouri Garden','Blue','West',true,2005),
('Welcome','Red','East',true,2002),
('Dilshad Garden','Red','East',false,2008),
('Inderlok','Red','West',true,2003),
('Lajpat Nagar','Violet','South',true,2010),
('Kalkaji Mandir','Violet','South',true,2010),
('Janakpuri West','Magenta','West',true,2017),
('Netaji Subhash Place','Pink','North',true,2018),
('Mayur Vihar Phase-1','Pink','East',true,2018),
('Aerocity','Airport Express','South',false,2011),
('Laxmi Nagar','Blue','East',false,2009);

-- 90 days of daily sample ridership: base volume by station importance, weekday/weekend pattern, mild noise
insert into public.ridership_daily (station_id, day, entries, exits)
select s.id, d::date,
  (b.base * (case when extract(dow from d) in (0,6) then 0.68 else 1.0 end) * (0.9 + random()*0.2))::int,
  (b.base * (case when extract(dow from d) in (0,6) then 0.68 else 1.0 end) * (0.88 + random()*0.24))::int
from public.stations s
join (values
 ('Rajiv Chowk',95000),('Kashmere Gate',78000),('New Delhi',72000),('Chandni Chowk',60000),('Hauz Khas',52000),
 ('Central Secretariat',55000),('Huda City Centre',58000),('Saket',34000),('Dwarka Sector 21',30000),('Noida City Centre',42000),
 ('Botanical Garden',38000),('Mandi House',36000),('Yamuna Bank',28000),('Rajouri Garden',44000),('Welcome',33000),
 ('Dilshad Garden',26000),('Inderlok',31000),('Lajpat Nagar',40000),('Kalkaji Mandir',29000),('Janakpuri West',35000),
 ('Netaji Subhash Place',37000),('Mayur Vihar Phase-1',32000),('Aerocity',15000),('Laxmi Nagar',39000)
) as b(name, base) on b.name = s.name
cross join generate_series(current_date - 89, current_date, interval '1 day') d;

-- hourly profile 5am-11pm with morning and evening peaks
insert into public.ridership_hourly (station_id, hour, avg_entries)
select s.id, h,
  ((select avg(entries) from public.ridership_daily r where r.station_id = s.id)
   * (0.6*exp(-power(h-9,2)/3.0) + 0.55*exp(-power(h-18.5,2)/3.5) + 0.12) / 7.2)::int
from public.stations s cross join generate_series(5,23) h;