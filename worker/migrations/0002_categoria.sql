-- raggruppa il ricettario (Antipasti, Primi, …); vuota = "Altre"
alter table ricette add column categoria text not null default '';
-- autore e licenza delle foto prese da Openverse (Creative Commons); vuoto per le foto scattate da Fabio
alter table ricette add column foto_credito text not null default '';
