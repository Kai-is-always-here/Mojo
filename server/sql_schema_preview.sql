-- Supabase/PostgreSQL production schema preview for the next migration phase.
-- The current v1.1 local demo still uses server/data/db.json so it runs without credentials.
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('owner','admin','client')),
  name text not null,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  admin_id uuid references profiles(id) on delete set null,
  invite_code char(5) unique,
  credit_score integer not null default 1000,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete cascade,
  client_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(admin_id, client_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_admin_id on profiles(admin_id);
create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at);
create index if not exists idx_attachments_message_id on message_attachments(message_id);


create table if not exists movies (
  id uuid primary key default gen_random_uuid(),
  rank integer not null unique,
  title text not null,
  genre text not null,
  year integer not null default 2026,
  worldwide_gross bigint not null,
  is_featured boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2026 snapshot: top 50 worldwide releases used by the client UI.
insert into movies (rank,title,genre,year,worldwide_gross) values

  (1,'Spider-Man: Brand New Day','Action / Superhero',2026,1665088528),
  (2,'The Odyssey','Epic / Adventure',2026,1104804890),
  (3,'Toy Story 5','Animation / Family',2026,1093981614),
  (4,'Michael','Music / Biography',2026,1016068388),
  (5,'The Super Mario Galaxy Movie','Animation / Adventure',2026,1012214826),
  (6,'The Devil Wears Prada 2','Comedy / Drama',2026,691379651),
  (7,'Project Hail Mary','Sci-Fi / Adventure',2026,683937213),
  (8,'Pegasus 3','Comedy / Adventure',2026,656459523),
  (9,'Obsession','Thriller / Drama',2026,488059500),
  (10,'Minions & Monsters','Animation / Comedy',2026,473539045),
  (11,'Backrooms','Horror / Mystery',2026,395180370),
  (12,'Hoppers','Animation / Family',2026,389685783),
  (13,'Star Wars: The Mandalorian and Grogu','Sci-Fi / Adventure',2026,345168060),
  (14,'Dear You','Drama / Romance',2026,289669784),
  (15,'Moana','Animation / Adventure',2026,280441267),
  (16,'Kung Fu Soccer','Comedy / Sports',2026,278900000),
  (17,'Wuthering Heights','Romance / Drama',2026,241701072),
  (18,'Disclosure Day','Sci-Fi / Drama',2026,240689748),
  (19,'Scary Movie','Comedy / Horror',2026,231467451),
  (20,'Blades of the Guardians','Action / Fantasy',2026,215363913),
  (21,'Scream 7','Horror / Thriller',2026,207999405),
  (22,'Scare Out','Horror',2026,200371064),
  (23,'GOAT','Animation / Sports',2026,195100710),
  (24,'Dhurandhar: The Revenge','Action / Thriller',2026,152900759),
  (25,'Boonie Bears: The Hidden Protector','Animation / Family',2026,139300000),
  (26,'The Drama','Drama',2026,132392921),
  (27,'The Sheep Detectives','Family / Comedy',2026,131880924),
  (28,'Mortal Kombat II','Action / Fantasy',2026,129470110),
  (29,'Supergirl','Action / Superhero',2026,126118944),
  (30,'The King’s Warden','Action / Drama',2026,117888835),
  (31,'Masters of the Universe','Fantasy / Action',2026,113775940),
  (32,'All Wishes Come True!','Fantasy / Comedy',2026,109500000),
  (33,'Send Help','Thriller / Horror',2026,94041481),
  (34,'Lee Cronin’s The Mummy','Horror / Adventure',2026,90552113),
  (35,'Reminders of Him','Drama / Romance',2026,89087873),
  (36,'Detective Conan: Fallen Angel of the Highway','Animation / Mystery',2026,84301939),
  (37,'Vanishing Point','Drama / Thriller',2026,81200457),
  (38,'Hamlet','Drama',2026,78751812),
  (39,'Crime 101','Crime / Thriller',2026,72900246),
  (40,'Evil Dead Burn','Horror',2026,61626028),
  (41,'28 Years Later: The Bone Temple','Horror / Thriller',2026,58527279),
  (42,'Mercy','Action / Thriller',2026,54709856),
  (43,'Shelter','Thriller / Drama',2026,54599862),
  (44,'Marsupilami','Adventure / Comedy',2026,51851594),
  (45,'Iron Lung','Horror / Sci-Fi',2026,50036487),
  (46,'Colony','Sci-Fi / Thriller',2026,48391834),
  (47,'Return to Silent Hill','Horror / Mystery',2026,47533175),
  (48,'Cold War 1994','Drama / History',2026,46907049),
  (49,'Young Washington','Biography / Drama',2026,46872734),
  (50,'Greenland 2: Migration','Action / Disaster',2026,45191228)
on conflict (rank) do update set title=excluded.title, genre=excluded.genre, year=excluded.year, worldwide_gross=excluded.worldwide_gross, is_featured=true;
