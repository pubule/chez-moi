-- valori per porzione (stime): null = non indicati
alter table ricette add column porzioni integer;
alter table ricette add column kcal integer;
alter table ricette add column proteine integer;
alter table ricette add column carboidrati integer;
alter table ricette add column grassi integer;
