# Plan: cerrar US04 (Agenda de estudio) — CompañÍA

> Plan para ejecutar con Claude Code, por fases. Uli supervisa y aprueba cada checkpoint.
> Arranca la noche del 06/11/2026; lo que llegue se mergea a `main` como nueva base del próximo sprint.
> Fuera de alcance: US05 (autoevaluaciones), chat, documentos.

---

## Contexto (estado al 06/11)

- **Backend de agenda (`testing`, commit e2a0085):** existe en `/usuarios/{usuario_id}/agenda`:
  - `POST/GET/DELETE /eventos`: eventos puntuales, `tipo` = `ocupado` | `estudio`.
  - `POST /planes`: propone 3 opciones (Constante, Intensivo, Progresivo) y no guarda nada.
  - `POST /estudio`: guarda los bloques de la opción elegida como eventos `estudio`.
  - Lógica pura en `Backend/app/planificador/` (`huecos.py`, `reparto.py`, `planes.py`); acceso a la base en `services/agenda.py`.
- **Frontend:** en `testing`, `Frontend/app/mi-semana/page.jsx` está hardcodeado. La versión de Nacho (rama `FrontNacho`, commit 417095e) tiene la UI completa (modal de horarios, metas de examen, completar, reprogramar) pero llama a endpoints que **no existen** (`/api/disponibilidad`, `/api/metas-examen`, `/api/bloques/{id}`) y usa `http://localhost:8000` hardcodeado.
- **Lo que falta:** disponibilidad semanal recurrente, metas de examen, completado/reprogramar, bloques de 60–90 min, tests, SQL de `eventos` versionado, integración front ↔ back, "Esta noche" con datos reales.

## Decisiones tomadas (cambiarlas acá si hace falta)

1. **El backend define el contrato.** El front se adapta a `/usuarios/{id}/agenda/...`. No se crean rutas `/api/...`.
2. **Disponibilidad semanal real:** una tabla con compromisos que se repiten por día de la semana (ej. "Trabajo lun–vie 9 a 18"). Se expande a horarios ocupados al calcular planes.
3. **Bloques de 60 o 90 min** (el algoritmo trabaja en franjas de 30 min; 45 min no entra). Se ajusta el criterio de SCRUM-40 en Jira.
4. **Reprogramar = automático:** el backend mueve el bloque al primer hueco libre con la misma duración.
5. **El plan se arma desde una meta de examen:** la meta fija la materia, las unidades y el límite (`hasta` = día anterior al examen).

---

## Reglas para Claude Code

- **Rama:** trabajar en `feature/agenda`, creada desde `testing`. Cada fase que pasa su checkpoint se mergea a `testing`. Al cierre del día, `testing` → `main` (ver "Cierre del día"). `main` pasa a ser **la nueva base del equipo** para el próximo sprint, así que solo entra lo que funciona.
- **Una fase a medio hacer no entra a `testing`.** Si el día se corta en el medio de una fase, ese trabajo queda en `feature/agenda` y se anota qué falta.
- **Un commit por fase**, en español, con el ticket: `feat(agenda): disponibilidad semanal (SCRUM-87)`.
- **No tocar:** chat, documentos, materias (salvo leer), US05, `grupos/`.
- **Estilo del repo:** nombres en español; capas `schemas/` → `routers/` → `services/`; **toda la lógica de cálculo va en `planificador/` como funciones puras** (sin Supabase) para poder testearla.
- **SQL:** Claude Code escribe los scripts en `Backend/sql/`, pero **no los ejecuta**. Uli los corre en el SQL Editor de Supabase. Al llegar a ese punto, frenar y avisar.
- **Ojo:** el cliente mock de Supabase (`core/supabase_client.py`) no soporta `lt/gt/order`. La agenda necesita Supabase real; los tests son solo de `planificador/`.
- **Al terminar cada fase:** correr `cd Backend && python -m pytest` y `cd Frontend && npm run lint`, mostrar un resumen de lo hecho y **esperar el OK de Uli** antes de seguir.
- **En cada checkpoint, explicar en 3–5 líneas la decisión técnica principal** de la fase (Uli quiere entender el porqué, no solo ver el diff).

---

## Fase 0 — Preparación (≈30 min)

1. `git checkout testing && git pull && git checkout -b feature/agenda`
2. `git merge origin/FrontNacho` (verificado: merge limpio, solo cambia `mi-semana/page.jsx`).
3. **Pedirle a Uli el DDL actual de la tabla `eventos`** (Supabase → Table Editor → eventos → Definition) y de `materias` y `unidades` (para saber los tipos de los ids).
4. Crear `Backend/sql/agenda.sql` con `create table if not exists public.eventos (...)` que refleje la tabla real (para que la base se pueda recrear desde el repo).
5. Agregar `pytest` a `Backend/requirements.txt` y crear `Backend/tests/__init__.py`.

**Checkpoint:** la app levanta igual que antes; `pytest` corre (aunque sea con 0 tests).

## Fase 1 — Tests del algoritmo + bloques de 60/90 min (≈1,5 h) · SCRUM-43, SCRUM-40

1. **Primero tests del comportamiento actual** en `Backend/tests/test_planificador.py` (red de seguridad antes de cambiar nada):
   - `calcular_huecos`: día sin eventos → un hueco de 8 a 22; evento en el medio → dos huecos; evento que tapa todo → sin huecos; `ahora` a las 10:10 → el primer hueco arranca 10:30.
   - `armar_planes`: siempre devuelve 3 opciones; sin huecos → bloques vacíos y `completo=False`; pedir más horas de las que entran → `faltan_horas > 0`; examen al día siguiente (rango de 1 día) no rompe; ningún bloque cae sobre un evento ocupado.
2. **Cambiar el reparto** para que cumpla estas invariantes (y testearlas):
   - cada bloque dura **60 o 90 min**;
   - entre dos bloques del mismo día hay **al menos 30 min de pausa**;
   - **máximo 4 h** de estudio por día;
   - las horas pedidas se redondean hacia arriba a múltiplos de 30 min, con mínimo 1 h.
   - Sugerencia: trabajar por "corridas" de slots consecutivos y cortar cada corrida en tramos de 3 o 2 slots, dejando 1 slot de pausa entre tramos; descartar restos de 1 slot.
3. Actualizar `README_AGENDA.md` (sección planes: "máximo 3 h seguidas" → bloques de 60–90 min).

**Checkpoint:** todos los tests en verde. Uli prueba `POST /planes` desde `/docs` y verifica que los bloques sean de 60/90 min.

## Fase 2 — Disponibilidad semanal (≈2 h) · SCRUM-87

**SQL** (agregar a `Backend/sql/agenda.sql`):
```sql
create table if not exists public.disponibilidad (
    id bigint generated always as identity primary key,
    usuario_id bigint not null references public.usuarios (id) on delete cascade,
    titulo text not null,                     -- "Trabajo", "Cursada", ...
    dia_semana smallint not null check (dia_semana between 0 and 6),  -- 0 = lunes
    hora_inicio time not null,
    hora_fin time not null,
    check (hora_fin > hora_inicio)
);
```
(Ajustar el tipo de `usuario_id` al real que dio Uli en la fase 0.)

**Contrato** (prefijo `/usuarios/{usuario_id}/agenda`):

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/disponibilidad` | — | `[{id, titulo, dia_semana, hora_inicio, hora_fin}]` |
| POST | `/disponibilidad` | `{titulo, dias: [0..6], hora_inicio: "09:00", hora_fin: "18:00"}` | 201, lista de filas creadas (una por día) |
| DELETE | `/disponibilidad/{id}` | — | 204 |

- `dias` permite que "días hábiles" del front sea `[0,1,2,3,4]` en una sola llamada.
- **Lógica pura nueva** en `planificador/disponibilidad.py`: `expandir_disponibilidad(filas, desde, hasta) -> list[(datetime, datetime)]`, con tests (rango que cruza un fin de semana, día sin compromisos).
- En `services/agenda.py`, `generar_planes` y `confirmar_estudio` suman la disponibilidad expandida a los horarios ocupados.

**Checkpoint:** Uli corre el SQL en Supabase, carga "Trabajo lun–vie 9 a 18" desde `/docs`, pide planes y verifica que ningún bloque caiga en ese horario.

## Fase 3 — Metas de examen (≈2 h) · SCRUM-88

**SQL:**
```sql
create table if not exists public.metas_examen (
    id bigint generated always as identity primary key,
    usuario_id bigint not null references public.usuarios (id) on delete cascade,
    materia_id bigint not null references public.materias (id) on delete cascade,
    fecha date not null,
    hora time,
    unidad_ids bigint[] not null default '{}',
    created_at timestamptz not null default now()
);
alter table public.eventos add column if not exists meta_id bigint references public.metas_examen (id) on delete cascade;
alter table public.eventos add column if not exists completado boolean not null default false;
```

**Contrato:**

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/metas` | — | `[{id, materia_id, materia, fecha, hora, unidades: [{id, numero_unidad, nombre_tema}], bloques_total, bloques_completados}]` ordenado por fecha |
| POST | `/metas` | `{materia_id, fecha, hora?, unidad_ids: [..] (mín. 1)}` | 201, la meta |
| PATCH | `/metas/{id}` | campos opcionales | la meta |
| DELETE | `/metas/{id}` | — | 204 (borra también sus bloques de estudio, por la FK en cascada) |

- Validar: `unidad_ids` pertenecen a la materia (si no, 422); `fecha` no está en el pasado (400).
- **Cambios en planes:** `PlanCreate` acepta `meta_id` opcional. Si viene: `materia_id` sale de la meta, `desde` = hoy por defecto, `hasta` = día anterior al examen por defecto. `EstudioCreate` acepta `meta_id` y lo guarda en cada evento. El título del bloque incluye las unidades ("Estudiar Análisis I – U1, U3").
- `GET /eventos` devuelve también `completado` y `meta_id`.

**Checkpoint:** desde `/docs`: crear meta → pedir planes con `meta_id` → confirmar una opción → `GET /metas` muestra `bloques_total` correcto.

## Fase 4 — Completar y reprogramar bloques (≈1,5 h) · SCRUM-92

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| PATCH | `/eventos/{id}` | `{completado: bool}` | evento actualizado (solo `tipo=estudio`, si no 400) |
| POST | `/eventos/{id}/reprogramar` | `{desde?: date}` | evento movido, o 409 `"No hay un hueco libre de X min antes del examen"` |

- **Lógica pura** en `planificador/`: `primer_hueco(huecos, duracion) -> (inicio, fin) | None`, con tests.
- Reprogramar busca desde mañana (o `desde`) hasta el día anterior al examen si el bloque tiene `meta_id`; si no, 7 días. Respeta eventos, disponibilidad y la franja de 8 a 22.

**Checkpoint:** marcar un bloque como completado sube `bloques_completados` en `/metas`; reprogramar mueve el bloque a un hueco real.

## Fase 5 — Conectar "Mi semana" a la API (≈3–4 h) · SCRUM-37, 38, 41, 42, 96

1. Crear `Frontend/app/lib/agenda.js` con funciones que usen `API_URL` y `getUsuarioActual()` de `lib/api.js`: `listarEventos(desde, hasta)`, `listarDisponibilidad`, `crearDisponibilidad`, `borrarDisponibilidad`, `listarMetas`, `crearMeta`, `editarMeta`, `borrarMeta`, `pedirPlanes`, `confirmarPlan`, `marcarCompletado`, `reprogramar`. Cada una tira un `Error` con el `detail` del backend.
2. En `mi-semana/page.jsx` (versión de Nacho), **reemplazar los estados mockeados por datos reales**:
   - La semana visible se carga con `listarEventos(lunes, domingo)` + `listarDisponibilidad()` (se pinta en cada día que corresponda) + `listarMetas()` (marca "Parcial" en el día).
   - Convertir las fechas ISO con `-03:00` a horas decimales para la grilla.
   - Modal "Cambiar mis horarios" → `crearDisponibilidad` / `borrarDisponibilidad`.
   - Modal de meta → `crearMeta` / `editarMeta` / `borrarMeta`; materias y unidades reales de `/usuarios/{id}/materias/`.
   - **Flujo nuevo "Armar plan"** en cada tarjeta de meta: input de horas totales → `pedirPlanes({meta_id, horas})` → mostrar las 3 opciones (nombre, descripción, horas, días; aviso si `completo=false` con `faltan_horas`) → `confirmarPlan` → recargar la semana. Si responde 409, mostrar el mensaje y volver a pedir planes.
   - Botones "Listo" → `marcarCompletado`; "Pasar a otro día" → `reprogramar` (sacar el selector manual de día/hora).
   - Barras de progreso de las metas con `bloques_completados / bloques_total`.
3. Eliminar todas las llamadas a `/api/...` y a `http://localhost:8000` hardcodeado.
4. Si no hay usuario seleccionado, redirigir como en las demás páginas.
5. Estados de carga y error visibles (mismo estilo que el chat).

**Checkpoint:** recorrido completo en el navegador (ver Fase 7) sin errores en la consola.

## Fase 6 — "Esta noche" con datos reales (≈1 h)

- `Frontend/app/page.jsx`: los bloques de hoy salen de `listarEventos(hoy, hoy)` (solo `tipo=estudio`, ordenados) y el "Listo" usa `marcarCompletado`.
- La alerta de parcial usa la próxima meta de `listarMetas()` con su progreso real.

## Fase 7 — QA y cierre (≈1 h) · SCRUM-71 (parcial)

**Recorrido manual de punta a punta:**
1. Crear/seleccionar usuario → materia con 3 unidades.
2. Cargar disponibilidad "Trabajo lun–vie 9 a 18" y "Cursada mar y jue 18 a 22".
3. Crear meta: parcial dentro de 5 días, unidades 1 y 3.
4. Armar plan de 6 h → comparar las 3 opciones → elegir Progresivo.
5. Verificar en Mi semana: ningún bloque cae sobre trabajo/cursada; todos duran 60 o 90 min.
6. Marcar un bloque como listo → sube el progreso de la meta y de "Esta noche".
7. Reprogramar otro bloque → se mueve a un hueco libre.
8. Borrar la meta → desaparecen sus bloques.

**Además:** actualizar `Backend/README_AGENDA.md` con los endpoints nuevos (y corregir el límite de PDF: el código dice 25 MB, no 20), abrir el PR `feature/agenda` → `testing` con el checklist de criterios de US04.

---

## Cierre del día: `testing` → `main` (nueva base del equipo)

1. **Antes de tocar `main`, marcar dónde estaba:** `git tag sprint-5-cierre origin/main && git push origin sprint-5-cierre` (sirve para mostrarle a la docente qué se sumó en el sprint y para volver atrás si hace falta).
2. **Prueba de humo en `testing`** (10 min): levantar back y front de cero, seleccionar usuario, crear materia con unidades, subir un PDF, hacer una pregunta en el chat y abrir Mi semana. Nada de lo que ya funcionaba puede romperse.
3. `pytest` en verde y `npm run lint` sin errores.
4. PR `testing` → `main` con descripción: fases completas, fases que quedaron afuera, **scripts SQL que hay que correr** (si la base de Supabase es compartida, ya los corrió Uli; aclararlo igual).
5. Mensaje al equipo: "La nueva base es `main` (commit X). Creen sus ramas desde ahí. Lo de la agenda que falta está en `feature/agenda` / en Jira."

> Si solo se llega a la Fase 0, igual sirve mergearla: el front de Nacho entra a `main` sin romper nada (si el backend no responde, guarda en memoria y atrapa el error).

## Si el día no alcanza: orden de corte

| Prioridad | Fase | Por qué |
|---|---|---|
| 1 | F0, F3 (metas), F5 básico (semana real + metas + armar plan) | Es el flujo mínimo que demuestra la US04 |
| 2 | F4 (completado) + F2 (disponibilidad) | Criterios de aceptación explícitos |
| 3 | F1 (tests + 60/90 min) | Calidad y criterio del algoritmo |
| 4 | F6, reprogramar automático, F7 completo | Terminación |

Si F2 no llega: cargar trabajo y cursada como eventos `ocupado` puntuales (ya funciona) y dejar SCRUM-87 abierta.
