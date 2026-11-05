-- Preguntas hechas por cada usuario en cada día (límite diario del chat)
create table if not exists public.uso_diario (
    usuario_id bigint not null references public.usuarios (id) on delete cascade,
    fecha date not null,
    cantidad integer not null default 0,
    primary key (usuario_id, fecha)
);

alter table public.uso_diario enable row level security;

-- Solo el backend accede a esta tabla
grant select, insert, update on public.uso_diario to service_role;
