-- APEX / BoxOffice Platform production Supabase foundation
-- Run in Supabase SQL Editor after enabling Auth.
-- Frontend must use only the publishable/anon key. Never expose service-role keys.

create extension if not exists pgcrypto;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'owner' and status = 'active'); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active'); $$;

create or replace function public.is_client()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'client' and status = 'active'); $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','client')),
  name text not null,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  admin_id uuid references public.profiles(id) on delete set null,
  credit_score integer not null default 1000 check (credit_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_admin_id_idx on public.profiles(admin_id);
create index if not exists profiles_role_status_idx on public.profiles(role,status);

create table if not exists public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code char(5) not null unique check (code ~ '^[0-9]{5}$'),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  used_by uuid unique references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists invitation_codes_admin_idx on public.invitation_codes(admin_id);
create index if not exists invitation_codes_active_idx on public.invitation_codes(code,expires_at) where used_by is null;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(admin_id,client_id)
);
create index if not exists conversations_admin_idx on public.conversations(admin_id);
create index if not exists conversations_client_idx on public.conversations(client_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 10000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 8388608),
  created_at timestamptz not null default now()
);

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  rank integer not null unique check (rank > 0),
  title text not null,
  genre text not null,
  year integer not null default 2026,
  worldwide_gross bigint not null default 0 check (worldwide_gross >= 0),
  is_featured boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id,created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- Keep profile timestamps current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists movies_updated_at on public.movies;
create trigger movies_updated_at before update on public.movies for each row execute function public.set_updated_at();

-- Profile bootstrap for a newly-created Auth user. Role is intentionally not accepted from the client.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,role,name,email)
  values (new.id,'client',coalesce(new.raw_user_meta_data->>'name',split_part(coalesce(new.email,''),'@',1),'User'),new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS: deny by default, then grant only role-scoped access.
alter table public.profiles enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.movies enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy profiles_owner_all on public.profiles for all using (public.is_owner()) with check (public.is_owner());
create policy profiles_admin_read_clients on public.profiles for select using (public.is_admin() and (id = auth.uid() or (role='client' and admin_id=auth.uid())));
create policy profiles_client_self on public.profiles for select using (public.is_client() and id=auth.uid());

-- Invitation codes: admins can only see/manage their own codes; owner has full access.
create policy invitations_owner_all on public.invitation_codes for all using (public.is_owner()) with check (public.is_owner());
create policy invitations_admin_select on public.invitation_codes for select using (public.is_admin() and admin_id=auth.uid());
create policy invitations_admin_insert on public.invitation_codes for insert with check (public.is_admin() and admin_id=auth.uid());
create policy invitations_admin_update on public.invitation_codes for update using (public.is_admin() and admin_id=auth.uid()) with check (public.is_admin() and admin_id=auth.uid());

-- Conversations/messages: only owner, assigned admin, or participating client.
create policy conversations_owner_all on public.conversations for all using (public.is_owner()) with check (public.is_owner());
create policy conversations_admin_read on public.conversations for select using (public.is_admin() and admin_id=auth.uid());
create policy conversations_admin_insert on public.conversations for insert with check (public.is_admin() and admin_id=auth.uid());
create policy conversations_client_read on public.conversations for select using (public.is_client() and client_id=auth.uid());

create policy messages_owner_all on public.messages for all using (public.is_owner()) with check (public.is_owner());
create policy messages_participant_read on public.messages for select using (
  exists(select 1 from public.conversations c where c.id=conversation_id and (c.admin_id=auth.uid() or c.client_id=auth.uid()))
);
create policy messages_participant_insert on public.messages for insert with check (
  sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.admin_id=auth.uid() or c.client_id=auth.uid()))
);

create policy attachments_owner_all on public.message_attachments for all using (public.is_owner()) with check (public.is_owner());
create policy attachments_participant_read on public.message_attachments for select using (
  exists(select 1 from public.messages m join public.conversations c on c.id=m.conversation_id where m.id=message_id and (c.admin_id=auth.uid() or c.client_id=auth.uid()))
);
create policy attachments_participant_insert on public.message_attachments for insert with check (
  exists(select 1 from public.messages m join public.conversations c on c.id=m.conversation_id where m.id=message_id and m.sender_id=auth.uid() and (c.admin_id=auth.uid() or c.client_id=auth.uid()))
);

-- Movies are public read-only data; owner can manage.
create policy movies_public_read on public.movies for select using (true);
create policy movies_owner_all on public.movies for all using (public.is_owner()) with check (public.is_owner());

create policy notifications_owner_all on public.notifications for all using (public.is_owner()) with check (public.is_owner());
create policy notifications_self_read on public.notifications for select using (recipient_id=auth.uid());
create policy notifications_self_update on public.notifications for update using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());

create policy audit_owner_read on public.audit_logs for select using (public.is_owner());
create policy audit_owner_insert on public.audit_logs for insert with check (public.is_owner() or actor_id=auth.uid());

-- Private attachment bucket. Files should be accessed through signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('message-attachments','message-attachments',false,8388608,array[
 'image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/zip'
])
on conflict (id) do update set public=false,file_size_limit=8388608;

-- Storage object paths should begin with the sender's Auth UUID. This keeps uploads scoped to the authenticated user.
create policy attachment_storage_read on storage.objects for select using (
  bucket_id='message-attachments' and (
    public.is_owner() or owner_id::uuid=auth.uid() or exists(
      select 1 from public.message_attachments a
      join public.messages m on m.id=a.message_id
      join public.conversations c on c.id=m.conversation_id
      where a.storage_path=name and (c.admin_id=auth.uid() or c.client_id=auth.uid())
    )
  )
);
create policy attachment_storage_insert on storage.objects for insert with check (
  bucket_id='message-attachments' and owner_id::uuid=auth.uid()
);
create policy attachment_storage_delete on storage.objects for delete using (
  bucket_id='message-attachments' and (public.is_owner() or owner_id::uuid=auth.uid())
);

-- Realtime publication for chat/notifications.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- Server-side durable state bridge used by the included Express API.
-- RLS is enabled with no client policies; only the server's service-role key can read/write it.
create table if not exists public.platform_state (
  id smallint primary key check (id = 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.platform_state enable row level security;
revoke all on table public.platform_state from anon, authenticated;

-- Client referral + order commission domain (0.7%).
alter table public.profiles add column if not exists invite_code char(5);
alter table public.profiles add column if not exists invited_by_client_id uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists commission_balance numeric(20,2) not null default 0 check (commission_balance >= 0);
alter table public.profiles add column if not exists commission_total numeric(20,2) not null default 0 check (commission_total >= 0);
create unique index if not exists profiles_invite_code_unique_idx on public.profiles(invite_code) where invite_code is not null;
create index if not exists profiles_invited_by_client_idx on public.profiles(invited_by_client_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  title text not null default 'Order',
  amount numeric(20,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  commission_rate numeric(8,6) not null default 0.007 check (commission_rate = 0.007),
  commission_amount numeric(20,2) not null default 0 check (commission_amount >= 0),
  commission_credited boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists orders_client_created_idx on public.orders(client_id,created_at desc);
create index if not exists orders_admin_created_idx on public.orders(admin_id,created_at desc);
create unique index if not exists orders_commission_once_idx on public.orders(id) where commission_credited = true;

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete restrict,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  rate numeric(8,6) not null default 0.007 check (rate = 0.007),
  amount numeric(20,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists commissions_client_created_idx on public.commissions(client_id,created_at desc);
create index if not exists commissions_admin_created_idx on public.commissions(admin_id,created_at desc);

alter table public.orders enable row level security;
alter table public.commissions enable row level security;

create policy orders_owner_all on public.orders for all using (public.is_owner()) with check (public.is_owner());
create policy orders_admin_select on public.orders for select using (public.is_admin() and admin_id=auth.uid());
create policy orders_admin_update on public.orders for update using (public.is_admin() and admin_id=auth.uid()) with check (public.is_admin() and admin_id=auth.uid());
create policy orders_client_select on public.orders for select using (public.is_client() and client_id=auth.uid());
create policy orders_client_insert on public.orders for insert with check (
  public.is_client() and client_id=auth.uid() and admin_id=(select admin_id from public.profiles where id=auth.uid())
);

create policy commissions_owner_all on public.commissions for all using (public.is_owner()) with check (public.is_owner());
create policy commissions_admin_select on public.commissions for select using (public.is_admin() and admin_id=auth.uid());
create policy commissions_client_select on public.commissions for select using (public.is_client() and client_id=auth.uid());

-- Generates a secure reusable five-digit client code. Collision safety is enforced by the unique index.
create or replace function public.generate_client_invite_code()
returns char(5) language plpgsql security definer set search_path = public
as $$
declare candidate char(5); raw bytea; n bigint;
begin
  loop
    raw := gen_random_bytes(4);
    n := (get_byte(raw,0)::bigint << 24) | (get_byte(raw,1)::bigint << 16) | (get_byte(raw,2)::bigint << 8) | get_byte(raw,3)::bigint;
    candidate := (10000 + mod(n, 90000))::text;
    if not exists (select 1 from public.profiles where invite_code=candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;
