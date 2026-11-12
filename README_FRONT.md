# CompañIA – Guía de la API para Front

Todo lo que necesitan para consumir **documentos** (subir PDF, resumen, preguntas), **agenda** (huecos libres y planes de estudio) y **cuestionarios** (preguntas de práctica generadas con IA).
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
- **CORS:** el backend tiene que habilitar el origen del front en `main.py`, si no el navegador bloquea las llamadas
  (ver "Pendiente de backend" al final).

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
| `archivo` | archivo PDF (máx. **20 MB**) | sí |
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

Errores: `400` no es un PDF · `413` supera 20 MB · `404` materia o unidad inexistente.

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

Prefijo: `/usuarios/{usuario_id}/agenda`

## Conceptos

La agenda es una lista de **eventos**. Cada evento tiene `tipo`:
- `"ocupado"`: algo que ocupa tiempo (clase, trabajo, turno). Lo carga el usuario.
- `"estudio"`: un bloque de estudio que el usuario eligió de un plan.

Los dos tipos cuentan como horario ocupado cuando se calculan planes nuevos. Sugerencia: un color distinto por `tipo`.

## Flujo para armar un plan de estudio

1. (Opcional) cargar lo que ocupa tiempo → `POST /eventos`.
2. Pedir planes → `POST /planes`. **No guarda nada**: solo propone 3 opciones.
3. Mostrar las 3 opciones y dejar que el usuario elija una.
4. Confirmar la elegida → `POST /estudio`. Ahí recién se guarda en la agenda.
5. Mostrar la agenda → `GET /eventos`.

## Crear un evento — `POST /eventos` (201)

```json
{
  "titulo": "Clase",
  "inicio": "2026-11-09T08:00:00",
  "fin": "2026-11-09T13:00:00",
  "materia_id": null,
  "unidad_id": null
}
```
`titulo` (1–200 caracteres), `inicio` y `fin` son obligatorios y `fin` > `inicio`. `materia_id`/`unidad_id` son opcionales (`unidad_id` requiere `materia_id`).
Devuelve el evento con su `id`.

## Ver la agenda — `GET /eventos?desde=2026-11-09&hasta=2026-11-15`

`desde` y `hasta` son fechas (`YYYY-MM-DD`), opcionales e inclusivas. Devuelve una lista ordenada por fecha:

```json
[
  { "id": 1, "titulo": "Clase", "inicio": "2026-11-09T08:00:00-03:00", "fin": "2026-11-09T13:00:00-03:00",
    "tipo": "ocupado", "materia_id": null, "unidad_id": null },
  { "id": 2, "titulo": "Estudiar Análisis Matemático 1", "inicio": "2026-11-09T13:00:00-03:00", "fin": "2026-11-09T16:00:00-03:00",
    "tipo": "estudio", "materia_id": 1, "unidad_id": null }
]
```

## Borrar un evento — `DELETE /eventos/{evento_id}`

`204`. Sirve para cualquier tipo. No hay endpoint para borrar "un plan entero": se borra bloque por bloque.

## Pedir planes — `POST /planes`

```json
{
  "materia_id": 1,
  "unidad_id": null,
  "horas": 6,
  "desde": "2026-11-09",
  "hasta": "2026-11-13",
  "hora_inicio": 8,
  "hora_fin": 22
}
```

| Campo | Detalle |
|---|---|
| `materia_id` | obligatorio |
| `unidad_id` | opcional |
| `horas` | obligatorio, mayor a 0 y hasta 100 (admite decimales: `1.5`) |
| `desde`, `hasta` | fechas `YYYY-MM-DD`; `hasta` ≥ `desde`; máximo 60 días de rango |
| `hora_inicio`, `hora_fin` | opcionales, por defecto 8 y 22 (franja del día en que se puede estudiar) |

Respuesta (200):

```json
{
  "materia_id": 1,
  "materia": "Análisis Matemático 1",
  "unidad": null,
  "horas_solicitadas": 6,
  "desde": "2026-11-09",
  "hasta": "2026-11-13",
  "opciones": [
    {
      "nombre": "Constante",
      "descripcion": "Las mismas horas todos los días disponibles. Ritmo parejo y tranquilo.",
      "bloques": [
        { "inicio": "2026-11-09T13:00:00-03:00", "fin": "2026-11-09T14:30:00-03:00" },
        { "inicio": "2026-11-10T08:00:00-03:00", "fin": "2026-11-10T09:30:00-03:00" }
      ],
      "horas_planificadas": 6,
      "dias_de_estudio": 5,
      "completo": true,
      "faltan_horas": 0
    }
  ]
}
```

- `opciones` trae **siempre 3 planes**, en este orden: **Constante**, **Intensivo** (termina antes), **Progresivo** (va subiendo las horas hacia el final).
- Los `bloques` ya esquivan todo lo que hay en la agenda y no ofrecen horarios que ya pasaron.
- Máximo 4 h de estudio por día y 3 h seguidas (después hay descanso).
- Si no entran todas las horas: `completo: false` y `faltan_horas` dice cuántas quedaron afuera → conviene avisarle al usuario ("con tu agenda solo entran X h, ampliá el rango").
- Si no hay ningún hueco, `bloques` viene vacío.
- Errores: `404` materia/unidad inexistente · `400` el rango ya pasó · `422` datos inválidos.

## Confirmar el plan elegido — `POST /estudio` (201)

Se manda **solo** `materia_id` (y `unidad_id` si se usó) más los `bloques` de la opción elegida. **No** mandar `nombre`, `descripcion`, etc. (da 422).

```json
{
  "materia_id": 1,
  "bloques": [
    { "inicio": "2026-11-09T13:00:00-03:00", "fin": "2026-11-09T16:00:00-03:00" },
    { "inicio": "2026-11-10T08:00:00-03:00", "fin": "2026-11-10T10:00:00-03:00" }
  ]
}
```

Devuelve la lista de eventos creados (`tipo: "estudio"`, título "Estudiar <materia>"), con el mismo formato que `GET /eventos`.

```js
// opcion = una de las que vinieron en planes.opciones
await fetch(`${API}/usuarios/${usuarioId}/agenda/estudio`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ materia_id: planes.materia_id, bloques: opcion.bloques }),
});
```

Errores:
- `409`: algún bloque se pisa con la agenda (pasa si algo cambió desde que se generaron los planes). Mostrar el `detail` y volver a pedir `/planes`.
- `400`: hay bloques que ya pasaron.
- `422`: bloques que se pisan entre sí, lista vacía (mínimo 1, máximo 200) o datos inválidos.
- `404`: materia/unidad inexistente.

---

# 3. Cuestionarios

Prefijo: `/usuarios/{usuario_id}/cuestionarios`

Genera preguntas de opción múltiple (siempre 4 opciones; puede haber **1, 2 o 3 correctas**) a partir de los documentos de una materia: de **todos**, de **uno** o de **varios** a elección.
**No guarda nada**: cada llamada arma un cuestionario nuevo (si se repite el pedido, salen preguntas distintas).
Solo se usan documentos en estado `ready`.

## Generar un cuestionario — `POST /usuarios/{usuario_id}/cuestionarios/`

```json
{
  "materia_id": 1,
  "documento_ids": null,
  "cantidad": 10,
  "dificultad": "mixta",
  "respuestas_multiples": true
}
```

| Campo | Detalle |
|---|---|
| `materia_id` | obligatorio |
| `documento_ids` | opcional, **lista** de ids de documentos. Con 1 id sale de ese documento, con varios sale de esos documentos. Si no se manda (o va `null`), sale de **todos los documentos listos de la materia**. No puede ir vacía |
| `cantidad` | obligatorio, de 1 a 30. El front decide el largo (sugerencia: corto 5, mediano 10, extenso 20) |
| `dificultad` | opcional, por defecto `"mixta"`. Valores: `"facil"`, `"media"`, `"dificil"`, `"mixta"` |

| `respuestas_multiples` | opcional, por defecto `true`. Con `true` **la mitad de las preguntas** (redondeando para abajo) tienen varias correctas y el resto una sola (10 preguntas = 5 y 5; 1 pregunta = una sola). Con `false` **todas** tienen una sola correcta |

Con `"mixta"` el reparto es aproximadamente 30 % fáciles, 40 % medias y 30 % difíciles (10 preguntas = 3 / 4 / 3).

Respuesta (200):

```json
{
  "materia_id": 1,
  "materia": "Programación",
  "documentos": [
    { "id": "6f1c...-uuid", "nombre": "Funciones.pdf" },
    { "id": "a2b9...-uuid", "nombre": "Recursion.pdf" }
  ],
  "dificultad": "mixta",
  "respuestas_multiples": true,
  "cantidad_solicitada": 10,
  "cantidad": 10,
  "preguntas": [
    {
      "numero": 1,
      "pregunta": "¿Qué palabra clave se usa para devolver un valor desde una función?",
      "dificultad": "facil",
      "opciones": ["yield", "return", "break", "pass"],
      "correctas": [1],
      "respuestas_correctas": ["return"],
      "multiple": false,
      "explicacion": "return termina la función y devuelve el valor al que la llamó.",
      "fuente": "Funciones.pdf"
    }
  ]
}
```

- Con `respuestas_multiples: true`, algunas preguntas tienen **más de una opción correcta** (2 o 3, nunca 0 ni 4). Nunca son todas múltiples: el servidor mantiene el balance. Con `false`, todas tienen exactamente una.
  - `correctas` es la lista de **posiciones** (0 a 3, en orden) de las opciones correctas dentro de `opciones`.
  - `respuestas_correctas` es la lista con el **texto** de esas opciones.
  - `multiple` es `true` cuando hay más de una correcta: en ese caso mostrar **checkboxes** (marcar varias) y, si es `false`, **radio buttons** (una sola). El enunciado de las preguntas múltiples viene redactado en plural ("¿Cuáles de las siguientes...?").
  - Las opciones ya vienen mezcladas.
- `documentos` lista los documentos de los que salieron las preguntas (útil para mostrar "Cuestionario de: ...").
- La corrección la hace el front: la respuesta es correcta solo si el conjunto de opciones marcadas es **exactamente** igual a `correctas` (ni una de menos ni una de más). `explicacion` se puede mostrar después de responder.
- Las preguntas vienen ordenadas de más fáciles a más difíciles. Se puede mostrar `dificultad` como etiqueta.
- `fuente` es el documento del que sale la pregunta (puede ser `null`).
- `cantidad` puede ser **menor** que `cantidad_solicitada` si la IA no logró armar todas: mostrar las que haya.
- **Tarda**: es una llamada a IA, normalmente entre 5 y 30 segundos según la cantidad. Mostrar un "generando cuestionario...".

Errores:
- `404` materia inexistente, o algún id de `documento_ids` que no existe en esa materia.
- `409` algún documento elegido todavía no está listo (el mensaje dice cuál), o la materia no tiene ningún documento listo.
- `502` falló la IA: mostrar el mensaje y dejar reintentar.
- `422` datos inválidos (cantidad fuera de 1–30, dificultad inexistente, etc.).

```js
const res = await fetch(`${API}/usuarios/${usuarioId}/cuestionarios/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ materia_id: 1, cantidad: 10, dificultad: "mixta" }),
});
const cuestionario = await res.json();
// + documento_ids: [id1, id2] para usar solo algunos documentos
// corregir: marcadas = [1, 3] (posiciones elegidas)
// const acierta = JSON.stringify([...marcadas].sort()) === JSON.stringify(pregunta.correctas);
```

---

# Pendiente de backend (para tener en cuenta)

- **CORS:** si el front corre en otro puerto/dominio (Next.js en `localhost:3000`), hay que agregar en `app/main.py`:
  ```python
  from fastapi.middleware.cors import CORSMiddleware

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:3000"],
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- **Sin autenticación:** hoy cualquiera que conozca un `usuario_id` puede ver y modificar sus datos. Hay que resolverlo antes de publicar.
