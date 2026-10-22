-- "Da sapere" della ricetta: sicurezza alimentare, ingredienti da ordinare
alter table ricette add column note text not null default '';
