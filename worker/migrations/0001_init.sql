-- id generati dal client (crypto.randomUUID), foto = chiave R2 "foto/<uuid>" o null
create table diario (
  id text primary key,
  piatto text not null,
  data text not null,
  voto integer not null check (voto between 1 and 5),
  note text not null default '',
  sfida text,
  settimana text,
  foto text,
  creato text not null default (datetime('now'))
);

create table ricette (
  id text primary key,
  titolo text not null,
  ingredienti text not null default '',
  procedimento text not null default '',
  video text not null default '',
  foto text,
  creato text not null default (datetime('now'))
);

-- tetto giornaliero alle chiamate a pagamento (Chef)
create table ai_usage (
  giorno text primary key,
  n integer not null
);
