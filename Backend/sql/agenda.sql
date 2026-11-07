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
