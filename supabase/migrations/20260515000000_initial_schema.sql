create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create type public.household_role as enum ('owner', 'member');

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.tracked_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  height_cm numeric(5,2) not null check (height_cm between 80 and 250),
  birth_year int check (birth_year between 1900 and extract(year from now())::int),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  tracked_person_id uuid not null references public.tracked_people(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,2) not null check (weight_kg between 20 and 300),
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tracked_person_id, measured_on)
);

create table public.weight_goals (
  id uuid primary key default gen_random_uuid(),
  tracked_person_id uuid not null references public.tracked_people(id) on delete cascade,
  start_weight_kg numeric(5,2) not null check (start_weight_kg between 20 and 300),
  target_weight_kg numeric(5,2) not null check (target_weight_kg between 20 and 300),
  target_on date,
  created_at timestamptz not null default now(),
  unique (tracked_person_id)
);

create index household_members_user_id_idx on public.household_members(user_id);
create index tracked_people_household_id_idx on public.tracked_people(household_id);
create index weight_entries_person_date_idx on public.weight_entries(tracked_person_id, measured_on desc);
create index weight_goals_person_idx on public.weight_goals(tracked_person_id);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.tracked_people enable row level security;
alter table public.weight_entries enable row level security;
alter table public.weight_goals enable row level security;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  );
$$;

create policy "Users can read their own profile"
on public.profiles for select
using (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can insert their own profile"
on public.profiles for insert
with check (id = auth.uid());

create policy "Household members can read households"
on public.households for select
using (public.is_household_member(id));

create policy "Authenticated users can create households"
on public.households for insert
with check (created_by = auth.uid());

create policy "Owners can update households"
on public.households for update
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

create policy "Members can read household membership"
on public.household_members for select
using (public.is_household_member(household_id));

create policy "Owners can manage household membership"
on public.household_members for all
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy "Members can read tracked people"
on public.tracked_people for select
using (public.is_household_member(household_id));

create policy "Members can create tracked people"
on public.tracked_people for insert
with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
);

create policy "Owners can update tracked people"
on public.tracked_people for update
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy "Members can read weight entries"
on public.weight_entries for select
using (
  exists (
    select 1
    from public.tracked_people tp
    where tp.id = tracked_person_id
      and public.is_household_member(tp.household_id)
  )
);

create policy "Members can create weight entries"
on public.weight_entries for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.tracked_people tp
    where tp.id = tracked_person_id
      and public.is_household_member(tp.household_id)
  )
);

create policy "Creators and owners can update weight entries"
on public.weight_entries for update
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.tracked_people tp
    where tp.id = tracked_person_id
      and public.is_household_owner(tp.household_id)
  )
)
with check (created_by = auth.uid());

create policy "Members can read goals"
on public.weight_goals for select
using (
  exists (
    select 1
    from public.tracked_people tp
    where tp.id = tracked_person_id
      and public.is_household_member(tp.household_id)
  )
);

create policy "Owners can manage goals"
on public.weight_goals for all
using (
  exists (
    select 1
    from public.tracked_people tp
    where tp.id = tracked_person_id
      and public.is_household_owner(tp.household_id)
  )
)
with check (
  exists (
    select 1
    from public.tracked_people tp
    where tp.id = tracked_person_id
      and public.is_household_owner(tp.household_id)
  )
);

create or replace function public.create_household_with_owner(
  household_name text,
  owner_name text,
  owner_height_cm numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
begin
  insert into public.households (name, created_by)
  values (household_name, auth.uid())
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  insert into public.tracked_people (household_id, profile_id, name, height_cm, created_by)
  values (new_household_id, auth.uid(), owner_name, owner_height_cm, auth.uid());

  return new_household_id;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
