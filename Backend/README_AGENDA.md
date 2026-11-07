# CompañIA – Guía de la API para Front

Todo lo que necesitan para consumir **documentos** (subir PDF, resumen, preguntas) y **agenda** (huecos libres y planes de estudio).
Los endpoints de `usuarios` y `materias` los armó otro compañero y no están acá.

Documentación interactiva (para probar a mano): `http://127.0.0.1:8000/docs`

---

## Reglas generales

- **Base URL (local):** `http://127.0.0.1:8000`
- **Todo va bajo el usuario:** `/usuarios/{usuario_id}/...`. Todavía no hay login: el `usuario_id` va en la URL.
  Si la materia/documento/evento no es de ese usuario, la API responde **404** (nunca devuelve datos de otro usuario).
- **Formato:** JSON, salvo la subida de PDF (que es `multipart/form-data`).
- **Errores:** casi siempre `{"detail": "mensaje en español"}` y se puede mostrar tal cual.
  Excepción: el **422** (datos mal formados) trae `detail` como una **lista** de objetos (`loc`, `msg`).
- **Fechas y horas:** las respuestas vienen siempre con zona Argentina, ej. `"2026-11-09T13:00:00-03:00"`.
  Al enviar, se puede mandar con zona (`...-03:00`) o sin zona (`"2026-11-09T13:00:00"`, se asume hora argentina).
- **CORS:** ya está habilitado en `main.py` para `localhost:3000`.

| Código | Significa |
|---|---|
| 200 / 201 / 202 / 204 | OK (202 = aceptado, se sigue procesando; 204 = sin contenido) |
| 400 | Pedido inválido (ej. no es un PDF, bloque en el pasado) |
| 404 | No existe (o no es de ese usuario) |
| 409 | Conflicto (ej. horario ocupado, documento no listo) |
| 413 | Archivo demasiado grande |
| 422 | Datos mal formados |

---

# 1. Documentos

Prefijo: `/usuarios/{usuario_id}/documentos`

## Flujo

1. `POST /` sube el PDF → responde enseguida con el `id` y estado `pending`.
2. El servidor lo procesa en segundo plano (tarda desde segundos hasta unos minutos según el tamaño).
3. El front hace **polling** a `GET /{documento_id}` cada 3–5 s hasta que `estado` sea `ready` o `error`.
4. Con `ready` ya hay `resumen` y se puede usar `POST /{documento_id}/preguntas`.

**Estados:** `pending` → `processing` → `ready` | `error`
(si es `error`, el motivo viene en el campo `error`).

## Subir un PDF — `POST /usuarios/{usuario_id}/documentos/`

`multipart/form-data` con:

| Campo | Tipo | Obligatorio |
|---|---|---|
| `archivo` | archivo PDF (máx. **25 MB**) | sí |
| `materia_id` | número | sí |
| `unidad_id` | número | no (tiene que ser una unidad de esa materia) |

```js
const form = new FormData();
form.append("archivo", file);            // File del <input type="file">
form.append("materia_id", materiaId);
// form.append("unidad_id", unidadId);   // opcional, no mandar el campo vacío

const res = await fetch(`${API}/usuarios/${usuarioId}/documentos/`, { method: "POST", body: form });
const { id, estado } = await res.json(); // 202 → { "id": "uuid...", "estado": "pending" }
```
> No setear el header `Content-Type` a mano: el navegador lo arma solo con `FormData`.

Errores: `400` no es un PDF · `413` supera 25 MB · `404` materia o unidad inexistente.

## Consultar un documento — `GET /{documento_id}`

```json
{
  "id": "6f1c...-uuid",
  "materia_id": 1,
  "unidad_id": null,
  "nombre_original": "02-Funciones.pdf",
  "tamano_bytes": 482133,
  "estado": "ready",
  "paginas": 7,
  "resumen": "# Guía de estudio\n\n...",
  "error": null,
  "created_at": "2026-11-06T01:10:00-03:00"
}
```
- `resumen` es **Markdown** (títulos, listas, etc.): renderizarlo con una librería de markdown. Es `null` hasta que está `ready`.
- `paginas` y `resumen` aparecen cuando termina el procesamiento.

## Listar — `GET /?materia_id=1`

`materia_id` es opcional (sin él trae todos los del usuario). Devuelve una lista **sin** `resumen`:
`id, materia_id, unidad_id, nombre_original, estado, paginas, created_at`. Orden: más nuevos primero.

## Preguntar sobre un documento — `POST /{documento_id}/preguntas`

```json
// pedido
{ "pregunta": "¿Qué es una función?" }          // 1 a 2000 caracteres

// respuesta 200
{ "respuesta": "Una función agrupa código para reutilizarlo (p. 1).", "paginas": [1] }
```
- `paginas` son las páginas del PDF donde está la fuente (se pueden mostrar como "Ver página X").
- Si la pregunta no tiene que ver con el material: `{ "respuesta": "No encontré eso en el material.", "paginas": [] }`.
- `409` si el documento todavía no está `ready`.
- Es una llamada a IA: puede tardar unos segundos → mostrar un "cargando".

## Borrar — `DELETE /{documento_id}`

`204` sin cuerpo. Borra el PDF, sus datos y el índice de búsqueda.

---

# 2. Agenda y planes de estudio

Prefijo: `/usuarios/{usuario_id}/agenda`. Todas las horas que devuelve el backend vienen en **hora argentina con zona** (`2026-11-09T18:00:00-03:00`). Las que se mandan pueden ir con zona o sin zona (sin zona = hora argentina).

En el front, todas estas llamadas ya están en `Frontend/app/lib/agenda.js` (tiran un `Error` con el `detail` del backend).

## Conceptos

- **Eventos** (`/eventos`): cosas puntuales en la agenda. `tipo` es `"ocupado"` (clase, turno…, lo carga el usuario) o `"estudio"` (un bloque de un plan).
- **Disponibilidad** (`/disponibilidad`): compromisos que se repiten **todas las semanas** (ej. "Trabajo" lun a vie de 9 a 18).
- **Preferencias** (`/preferencias`): la franja del día en que la persona quiere estudiar (por defecto 8 a 22).
- **Metas de examen** (`/metas`): un parcial o final. Fija la materia, las unidades y la fecha; el plan de estudio termina el día anterior.

Al calcular planes o reprogramar, cuentan como ocupado: los eventos (los dos tipos), la disponibilidad semanal y, con **30 min de pausa** antes y después, los bloques de estudio ya agendados.

## Flujo para armar un plan de estudio

1. (Opcional) cargar compromisos fijos → `POST /disponibilidad`, y la franja → `PUT /preferencias`.
2. Crear la meta del examen → `POST /metas`.
3. Pedir planes → `POST /planes` con `meta_id` y `horas`. **No guarda nada**: solo propone 3 opciones.
4. Mostrar las 3 opciones y dejar que el usuario elija una.
5. Confirmar la elegida → `POST /estudio` con `meta_id` y los `bloques`. Ahí recién se guarda.
6. Mostrar la agenda → `GET /eventos` + `GET /disponibilidad` + `GET /metas` (progreso).
7. Día a día: `PATCH /eventos/{id}` para marcar "listo" y `POST /eventos/{id}/reprogramar` para pasarlo a otro día.

## Eventos

### Crear — `POST /eventos` (201)

```json
{ "titulo": "Clase", "inicio": "2026-11-09T08:00:00", "fin": "2026-11-09T13:00:00", "materia_id": null, "unidad_id": null }
```
`titulo` (1–200 caracteres), `inicio` y `fin` son obligatorios y `fin` > `inicio`. `materia_id`/`unidad_id` son opcionales (`unidad_id` requiere `materia_id`). Siempre crea `tipo: "ocupado"`.

### Ver la agenda — `GET /eventos?desde=2026-11-09&hasta=2026-11-15`

`desde` y `hasta` son fechas (`YYYY-MM-DD`), opcionales e inclusivas. Lista ordenada por fecha:

```json
[
  { "id": 2, "titulo": "Estudiar Análisis I – U1, U3", "inicio": "2026-11-09T18:00:00-03:00", "fin": "2026-11-09T19:30:00-03:00",
    "tipo": "estudio", "materia_id": 1, "unidad_id": null, "meta_id": 4, "completado": false }
]
```

### Marcar como completado — `PATCH /eventos/{evento_id}`

Body `{ "completado": true }` (o `false` para desmarcar). Devuelve el evento. Solo bloques de estudio: con un evento `ocupado` da `400`. `404` si no existe.

### Reprogramar — `POST /eventos/{evento_id}/reprogramar`

Body opcional `{ "desde": "2026-11-10" }` (por defecto, **mañana**). Mueve el bloque al **primer hueco libre** con la misma duración, buscando hasta el **día anterior al examen** (si el bloque es de una meta) o en los próximos **7 días**. Respeta eventos, disponibilidad, la franja del usuario y la pausa de 30 min con otros bloques; nunca lo deja pisando su horario actual. Devuelve el evento movido.

Errores: `409` "No hay un hueco libre de X min antes del examen" · `400` no es de estudio, o ya está completado · `404`.

### Borrar — `DELETE /eventos/{evento_id}`

`204`. Sirve para cualquier tipo.

## Disponibilidad semanal

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/disponibilidad` | — | `[{id, titulo, dia_semana, hora_inicio, hora_fin}]` |
| POST | `/disponibilidad` | `{titulo, dias: [0..6], hora_inicio: "09:00", hora_fin: "18:00"}` | `201`, una fila por día |
| DELETE | `/disponibilidad/{id}` | — | `204` |

- `dia_semana`: **0 = lunes … 6 = domingo**. `dias: [0,1,2,3,4]` carga "días hábiles" en una sola llamada.
- Las horas vuelven como `"09:00:00"`. Para "hasta las 24" mandar `"23:59"`.
- `422` si hay días fuera de 0–6, días repetidos o `hora_fin` ≤ `hora_inicio`.

## Preferencias (franja para estudiar)

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/preferencias` | — | `{hora_inicio, hora_fin}` (si nunca se guardó: `8` y `22`) |
| PUT | `/preferencias` | `{hora_inicio: 14, hora_fin: 24}` | lo guardado |

Horas enteras: `hora_inicio` de 0 a 23, `hora_fin` de 1 a 24, y `hora_fin` > `hora_inicio` (no cruza la medianoche). La usan `/planes` (si no se manda otra franja) y `/reprogramar`.

## Metas de examen

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/metas` | — | lista ordenada por fecha (ver abajo) |
| POST | `/metas` | `{materia_id, fecha: "2026-11-14", hora?: "18:00", unidad_ids: [..]}` | `201`, la meta |
| PATCH | `/metas/{id}` | solo lo que cambia (`hora: null` la borra) | la meta |
| DELETE | `/metas/{id}` | — | `204` (borra también sus bloques de estudio) |

```json
{ "id": 4, "materia_id": 1, "materia": "Análisis I", "fecha": "2026-11-14", "hora": "18:00:00",
  "unidades": [ { "id": 11, "numero_unidad": 1, "nombre_tema": "Límites" }, { "id": 13, "numero_unidad": 3, "nombre_tema": "Integrales" } ],
  "bloques_total": 5, "bloques_completados": 1 }
```

- `unidad_ids`: mínimo 1, tienen que ser de la materia (si no, `422`).
- `fecha` en el pasado: `400`. `404` si la materia o la meta no existen.
- `bloques_total` / `bloques_completados` se calculan en el momento a partir de los eventos: sirven directo para la barra de progreso.

## Pedir planes — `POST /planes`

Con una meta (lo normal):
```json
{ "meta_id": 4, "horas": 6 }
```
o con una materia suelta:
```json
{ "materia_id": 1, "unidad_id": null, "horas": 6, "desde": "2026-11-09", "hasta": "2026-11-13" }
```

| Campo | Detalle |
|---|---|
| `meta_id` | la materia, las unidades y el rango salen de la meta: por defecto de **hoy al día anterior al examen**. No se puede mandar junto con `materia_id`/`unidad_id` (`422`) |
| `materia_id`, `unidad_id` | sin meta: `materia_id` obligatorio, `unidad_id` opcional |
| `horas` | obligatorio, mayor a 0 y hasta 100 (admite decimales: `1.5`) |
| `desde`, `hasta` | sin meta: obligatorios. Con meta: opcionales, para achicar el rango. Máximo 60 días |
| `hora_inicio`, `hora_fin` | opcionales: si no van, se usa la franja de `/preferencias` |

Respuesta (200):

```json
{
  "meta_id": 4, "materia_id": 1, "materia": "Análisis I", "unidad": null,
  "unidades": [ { "id": 11, "numero_unidad": 1, "nombre_tema": "Límites" } ],
  "horas_solicitadas": 6, "desde": "2026-11-09", "hasta": "2026-11-13",
  "opciones": [
    {
      "nombre": "Constante",
      "descripcion": "Las mismas horas todos los días disponibles. Ritmo parejo y tranquilo.",
      "bloques": [
        { "inicio": "2026-11-09T18:00:00-03:00", "fin": "2026-11-09T19:30:00-03:00" },
        { "inicio": "2026-11-10T08:00:00-03:00", "fin": "2026-11-10T09:30:00-03:00" }
      ],
      "horas_planificadas": 6, "dias_de_estudio": 5, "completo": true, "faltan_horas": 0
    }
  ]
}
```

- `opciones` trae **siempre 3 planes**, en este orden: **Constante**, **Intensivo** (termina antes), **Progresivo** (va subiendo las horas hacia el final).
- Los `bloques` ya esquivan todo lo ocupado (ver "Conceptos") y no ofrecen horarios que ya pasaron.
- Los bloques duran **60 o 90 min**. Solo aparecen bloques de **30 min** cuando la agenda está apretada (para aprovechar un bache) o para completar un resto (ej. se piden 30 min). Hay **al menos 30 min de pausa** entre dos bloques del mismo día, y **máximo 4 h** de estudio por día.
- Las `horas` pedidas se redondean hacia arriba a múltiplos de 30 min (mínimo 30 min).
- Si no entran todas las horas: `completo: false` y `faltan_horas` dice cuántas quedaron afuera → conviene avisarle al usuario.
- Si no hay ningún hueco, `bloques` viene vacío.
- Errores: `404` meta/materia/unidad inexistente · `400` el rango ya pasó o no quedan días antes del examen · `422` datos inválidos.

## Confirmar el plan elegido — `POST /estudio` (201)

Se manda `meta_id` (o `materia_id` + `unidad_id` si el plan fue sin meta) más los `bloques` de la opción elegida. **No** mandar `nombre`, `descripcion`, etc. (da 422).

```json
{
  "meta_id": 4,
  "bloques": [
    { "inicio": "2026-11-09T18:00:00-03:00", "fin": "2026-11-09T19:30:00-03:00" },
    { "inicio": "2026-11-10T08:00:00-03:00", "fin": "2026-11-10T09:30:00-03:00" }
  ]
}
```

Devuelve los eventos creados (`tipo: "estudio"`), con el formato de `GET /eventos`. El título lleva las unidades: "Estudiar Análisis I – U1, U3" (con una sola unidad, el nombre del tema).

Errores:
- `409`: algún bloque se pisa con la agenda o con un compromiso fijo (pasa si algo cambió desde que se generaron los planes). Mostrar el `detail` y volver a pedir `/planes`.
- `400`: hay bloques que ya pasaron, o (con meta) caen el día del examen o después.
- `422`: bloques que se pisan entre sí, lista vacía (mínimo 1, máximo 200) o datos inválidos.
- `404`: meta/materia/unidad inexistente.

## Base de datos

Las tablas de la agenda están en `Backend/sql/agenda.sql` (`eventos`, `disponibilidad`, `metas_examen`, `preferencias_agenda`). El script es idempotente: se puede correr entero en el SQL Editor de Supabase.

## Tests

La lógica de cálculo vive en `app/planificador/` como funciones puras (sin Supabase) y tiene tests: `cd Backend && python -m pytest`.

---

# Pendiente de backend (para tener en cuenta)

- **Sin autenticación:** hoy cualquiera que conozca un `usuario_id` puede ver y modificar sus datos. Hay que resolverlo antes de publicar.
