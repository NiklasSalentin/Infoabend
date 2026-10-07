-- Infoabend Baufinanz Düren – Datenbankschema
-- Einmalig im Supabase-Dashboard unter "SQL Editor" ausführen.

create extension if not exists citext;

-- Einstellungen (genau eine Zeile, id = 1) – änderbar über /admin
create table if not exists settings (
  id               int primary key default 1 check (id = 1),
  total_seats      int  not null default 120 check (total_seats >= 0),
  max_per_person   int  not null default 2   check (max_per_person >= 1),
  registration_open boolean not null default true,
  updated_at       timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

-- Anmeldungen und Warteliste in einer Tabelle (status unterscheidet)
create table if not exists registrations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  status          text not null check (status in ('confirmed', 'waitlist', 'cancelled')),
  name            text not null,
  email           citext not null,
  phone           text not null,
  seats           int  not null check (seats >= 1),
  companions      text[] not null default '{}',
  street          text,
  zip             text,
  city            text,
  address_consent boolean not null default false,
  privacy_consent boolean not null check (privacy_consent),
  questions       text,
  ticket_code     text not null unique default upper(substr(md5(random()::text), 1, 8))
);

-- Pro E-Mail-Adresse genau eine aktive Anmeldung (bestätigt ODER Warteliste)
create unique index if not exists registrations_email_active
  on registrations (email) where status <> 'cancelled';

alter table settings      enable row level security;
alter table registrations enable row level security;
-- Keine Policies: Zugriff ausschließlich serverseitig über den Service-Role-Key.

-- Öffentlicher Status: Plätze gesamt / belegt / frei
create or replace function seat_status()
returns table (total_seats int, booked int, free int, max_per_person int,
               registration_open boolean, attendees int)
language sql stable as $$
  select s.total_seats,
         coalesce(b.booked, 0)::int,
         greatest(s.total_seats - coalesce(b.booked, 0), 0)::int,
         s.max_per_person,
         s.registration_open,
         coalesce(b.cnt, 0)::int
  from settings s
  left join (select sum(seats) booked, count(*) cnt
             from registrations where status = 'confirmed') b on true
  where s.id = 1;
$$;

-- Atomare Buchung. Sperrt die Settings-Zeile, damit gleichzeitige Anfragen
-- nacheinander abgearbeitet werden und nie überbucht wird.
-- Ergebnis: status = 'confirmed' | 'waitlist' | 'duplicate' | 'closed' | 'too_many'
create or replace function book_seats(
  p_name text, p_email text, p_phone text, p_seats int, p_companions text[],
  p_street text, p_zip text, p_city text, p_address_consent boolean,
  p_questions text, p_waitlist_ok boolean
) returns table (status text, ticket_code text, free int)
language plpgsql as $$
#variable_conflict use_column
declare
  s settings;
  v_booked int;
  v_free int;
  v_status text;
  v_code text;
begin
  select * into s from settings where id = 1 for update;

  if not s.registration_open then
    return query select 'closed'::text, null::text, 0; return;
  end if;
  if p_seats < 1 or p_seats > s.max_per_person then
    return query select 'too_many'::text, null::text, 0; return;
  end if;
  if exists (select 1 from registrations r
             where r.email = p_email::citext and r.status <> 'cancelled') then
    return query select 'duplicate'::text, null::text, 0; return;
  end if;

  select coalesce(sum(seats), 0) into v_booked
    from registrations where registrations.status = 'confirmed';
  v_free := s.total_seats - v_booked;

  if v_free >= p_seats then
    v_status := 'confirmed';
  elsif p_waitlist_ok then
    v_status := 'waitlist';
  else
    return query select 'full'::text, null::text, greatest(v_free, 0); return;
  end if;

  insert into registrations (status, name, email, phone, seats, companions,
                             street, zip, city, address_consent, privacy_consent, questions)
  values (v_status, p_name, p_email, p_phone, p_seats, coalesce(p_companions, '{}'),
          p_street, p_zip, p_city, p_address_consent, true, p_questions)
  returning registrations.ticket_code into v_code;

  return query select v_status, v_code,
    greatest(v_free - case when v_status = 'confirmed' then p_seats else 0 end, 0);
end;
$$;

-- Wartelisten-Eintrag nachrücken lassen (nur wenn genug Plätze frei sind)
create or replace function promote_registration(p_id uuid)
returns text language plpgsql as $$
declare
  s settings;
  r registrations;
  v_booked int;
begin
  select * into s from settings where id = 1 for update;
  select * into r from registrations where id = p_id;
  if r.id is null or r.status <> 'waitlist' then return 'invalid'; end if;
  select coalesce(sum(seats), 0) into v_booked from registrations where status = 'confirmed';
  if s.total_seats - v_booked < r.seats then return 'full'; end if;
  update registrations set status = 'confirmed' where id = p_id;
  return 'confirmed';
end;
$$;
