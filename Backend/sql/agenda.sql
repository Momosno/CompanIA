-- Agenda de estudio (US04)
-- Refleja las tablas reales de Supabase para poder recrear la base desde el repo.
-- Es idempotente: se puede correr de nuevo sin romper nada.

-- Eventos de la agenda: horarios ocupados y bloques de estudio
create table if not exists public.eventos (
    id bigint generated always as identity primary key,
    usuario_id bigint not null references public.usuarios (id) on delete cascade,
    titulo text not null,
    inicio timestamptz not null,
    fin timestamptz not null,
    tipo text not null default 'ocupado' check (tipo in ('ocupado', 'estudio')),
    materia_id bigint references public.materias (id) on delete cascade,
    unidad_id bigint references public.unidades (id) on delete set null,
    created_at timestamptz not null default now(),
    check (fin > inicio)
);

create index if not exists eventos_usuario_id_inicio_idx
    on public.eventos (usuario_id, inicio);

-- ---------- Fase 2: disponibilidad semanal (SCRUM-87) ----------
-- Compromisos que se repiten todas las semanas (ej. "Trabajo" lun a vie de 9 a 18).
-- Se guarda una fila por día; al calcular planes se expanden a horarios ocupados.
create table if not exists public.disponibilidad (
    id bigint generated always as identity primary key,
    usuario_id bigint not null references public.usuarios (id) on delete cascade,
    titulo text not null,                                             -- "Trabajo", "Cursada", ...
    dia_semana smallint not null check (dia_semana between 0 and 6),  -- 0 = lunes ... 6 = domingo
    hora_inicio time not null,
    hora_fin time not null,
    created_at timestamptz not null default now(),
    check (hora_fin > hora_inicio)
);

create index if not exists disponibilidad_usuario_id_idx
    on public.disponibilidad (usuario_id);

alter table public.disponibilidad enable row level security;

-- Solo el backend accede a esta tabla (usa la key secreta = service_role)
grant select, insert, delete on public.disponibilidad to service_role;

-- ---------- Fase 3: metas de examen (SCRUM-88) ----------
-- Un parcial / final: fija la materia, las unidades que entran y la fecha (el plan termina el día anterior).
create table if not exists public.metas_examen (
    id bigint generated always as identity primary key,
    usuario_id bigint not null references public.usuarios (id) on delete cascade,
    materia_id bigint not null references public.materias (id) on delete cascade,
    fecha date not null,
    hora time,
    unidad_ids bigint[] not null default '{}',   -- ids de public.unidades de esa materia
    created_at timestamptz not null default now()
);

create index if not exists metas_examen_usuario_id_fecha_idx
    on public.metas_examen (usuario_id, fecha);

alter table public.metas_examen enable row level security;

-- Solo el backend accede a esta tabla (usa la key secreta = service_role)
grant select, insert, update, delete on public.metas_examen to service_role;

-- Los bloques de estudio saben de qué meta son (y se borran con ella) y si ya se hicieron
alter table public.eventos
    add column if not exists meta_id bigint references public.metas_examen (id) on delete cascade;
alter table public.eventos
    add column if not exists completado boolean not null default false;

create index if not exists eventos_meta_id_idx
    on public.eventos (meta_id);
