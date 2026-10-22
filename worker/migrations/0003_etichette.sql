-- etichette della ricetta separate da virgola, es. "fit,vegetariana" ('' = nessuna)
alter table ricette add column etichette text not null default '';
