# Documentación Técnica y Funcional del Frontend — CompañÍA

Este documento describe la arquitectura, las decisiones de diseño, la estructura de componentes y los contratos de datos del frontend de **CompañÍA (Asistente de Estudio Inteligente)**. Está pensado como guía técnica tanto para el equipo de desarrollo de frontend como para los desarrolladores de backend (FastAPI y Supabase), y como registro histórico de decisiones de arquitectura del proyecto.

(DOCUMENTACION HECHA CON GEMINI)
---

## 1. Arquitectura del Proyecto (Next.js App Router)

La aplicación utiliza **Next.js 14+** con arquitectura basada en la carpeta `app/`. La navegación y el renderizado se estructuran bajo un modelo híbrido: Server Components para el cascarón raíz y Client Components (`'use client'`) en las pantallas con reactividad e interactividad.

```text
app/
├── globals.css          # Variables CSS, paleta "Nocturnal Cream" y reset global
├── layout.js           # Server Component raíz (HTML, metadata global)
├── LayoutWrapper.js    # Client Component que controla la visibilidad condicional del Sidebar
├── Sidebar.js          # Barra lateral interactiva con detección de ruta activa
├── page.js             # Pantalla 1: Dashboard "Esta noche" (Ruta raíz: /)
├── preguntar/
│   └── page.js         # Pantalla 2: Chat RAG con apuntes (/preguntar)
├── mi-semana/
│   └── page.js         # Pantalla 3: Calendario semanal (/mi-semana)
├── practicar/
│   └── page.js         # Pantalla 4: Diagnóstico y corrección de tests (/practicar)
├── materias/
│   └── page.js         # Pantalla 5: Gestión de materias, unidades y apuntes (/materias)
└── usuarios/
    └── page.js         # Pantalla 6: Selector de perfil y bienvenida (/usuarios)

```

---

## 2. Sistema de Diseño: Paleta "Nocturnal Cream"

La interfaz utiliza variables CSS nativas centralizadas en `app/globals.css`. Todo el equipo debe utilizar estas variables para mantener coherencia cromática y visual:

| Variable CSS | Valor Hexadecimal | Uso en la Aplicación |
| --- | --- | --- |
| `--bg-page` | `#F5EFEB` | Fondo general de todas las pantallas |
| `--bg-card` | `#FAF5EE` | Fondo de tarjetas, bloques y contenedores |
| `--border-color` | `#E3D8C8` | Bordes estándar y líneas divisorias |
| `--text-primary` | `#2D261E` | Títulos principales, preguntas y texto fuerte |
| `--text-secondary` | `#7D7163` | Subtítulos, horas, fechas y descripciones |
| `--accent-purple` | `#5A4BD1` | Botones principales, enlaces activos y acentos |

### Badges de Estado y Alertas

* **Completado / Éxito (`✓`):** Fondo `#E0ECD9`, borde `#C4D8B8`, texto `#275E10` (utilizado en bloques terminados, respuestas correctas y apuntes listos).
* **Alerta / Examen próximo:** Fondo `#F5E6CC`, borde `#E5C992`, texto `#9E6C00` (utilizado en avisos de parciales).
* **Error / Escaneo inválido (`✕`):** Fondo `#FDE8E8`, borde `#F8B4B4`, texto `#9B1C1C` (utilizado en respuestas incorrectas y fallas de OCR).
* **Bloque de Estudio Activo:** Fondo `#DFD7FA`, borde `#C5B8F0`, texto `#4334A6`.
* **Bloque de Trabajo / Cursada:** Fondo `#EAE2D5`, borde `#DCD0C0`, texto `#7D7163`.

---

## 3. Navegación Global y Lógica de Layout

### `app/layout.js`

Actúa como punto de entrada de la aplicación. Es un Server Component estricto para optimizar SEO y metadatos:

* Carga `globals.css`.
* Configura el `title` y la `description`.
* Envuelve a todos los hijos en `<LayoutWrapper>`.

### `app/LayoutWrapper.js`

Client Component responsable de determinar si el usuario debe ver la barra lateral:

* **Regla de negocio:** Cuando el usuario navega a cualquier ruta que comience con `/usuarios` (`pathname.startsWith('/usuarios')`), la aplicación entra en modo *Splash/Bienvenida*. En este caso, **no se renderiza el Sidebar** ni los márgenes laterales, ofreciendo una pantalla limpia y centrada.


* Para todas las demás rutas (`/`, `/preguntar`, `/mi-semana`, `/practicar`, `/materias`), inyecta el contenedor `.layout-wrapper` compuesto por `<Sidebar/>` y el contenedor `.content-area`.

### `app/Sidebar.js`

Barra lateral declarativa que utiliza el hook `usePathname()` de `next/navigation`:

* Compara la URL actual con `item.href` para aplicar automáticamente la clase `.active` (resaltado en violeta con fondo `#DFD7FA`).
* Contiene el pie de página con el perfil activo (`Jimmy`) y un enlace directo a `/usuarios` con el texto *"Cambiar de usuario"*.

---

## 4. Detalle de Pantallas y Contratos de Datos (Frontend ⇄ Backend)

Cada vista fue construida sin textos fijos en el JSX, basándose en arrays y objetos dentro de `useState`. Esto permite que el equipo de backend reemplace las constantes mock por llamadas HTTP (`fetch` o `axios`) directas contra FastAPI o clientes de Supabase.

```
+-------------------------------------------------------------+
|                      Cliente (Next.js)                      |
|                                                             |
|  [ useState() Mock ]  --->  Reemplazar por  --->  fetch()   |
+-------------------------------------------------------------+
                               |
                               v (HTTP / REST)
+-------------------------------------------------------------+
|                     Backend (FastAPI)                       |
|                                                             |
|   GET  /api/dashboard        --> Estado del día y materias  |
|   POST /api/chat             --> Consulta RAG e IA          |
|   GET  /api/calendario       --> Cronograma semanal         |
|   GET  /api/tests/{id}       --> Diagnóstico y preguntas    |
|   GET  /api/materias         --> Árbol Materia-Unidad-PDF   |
|   POST /api/apuntes/upload   --> Carga de documentos        |
+-------------------------------------------------------------+
                               |
                               v (SQL / Auth / Storage)
+-------------------------------------------------------------+
|                    Base de Datos (Supabase)                 |
+-------------------------------------------------------------+

```

---

### Pantalla 1: Selector de Usuario ("¿Quién estudia hoy?")

* **Ruta:** `/usuarios`

* **Objetivo:** Puerta de entrada al sistema (US01). Permite elegir qué estudiante está utilizando la computadora antes de cargar los datos de materias o calendario.



#### Estructura y Comportamiento Visual

* Cabecera con isotipo "CompañIA".


* Título centrado con subtítulo explicativo.


* Fila de 4 tarjetas:
1. **Jimmy:** Destacado con badge *"La última vez"* en lila suave.


2. **Sofía:** Con materias activas asignadas.


3. **Martín:** Con placeholder en cursiva *"Todavía no cargó materias"*.


4. **Crear un usuario nuevo:** Tarjeta con borde dashed para alta de perfiles.





#### Contrato de Datos Esperado (`GET /api/usuarios`)

```json
[
  {
    "id": 1,
    "nombre": "Jimmy",
    "materias": "Análisis Matemático I, Física I",
    "inicial": "J",
    "color": "#5A4BD1",
    "bgInicial": "#DFD7FA",
    "esUltimaVez": true
  },
  {
    "id": 2,
    "nombre": "Sofía",
    "materias": "Álgebra Lineal, Química General",
    "inicial": "S",
    "color": "#0D7A5F",
    "bgInicial": "#D0F2E7",
    "esUltimaVez": false
  },
  {
    "id": 3,
    "nombre": "Martín",
    "materias": "Todavía no cargó materias",
    "inicial": "M",
    "color": "#B45309",
    "bgInicial": "#FDE68A",
    "esUltimaVez": false
  }
]

```

---

### Pantalla 2: "Esta noche" (Dashboard Principal)

* **Ruta:** `/`

* **Objetivo:** Panel de control de la sesión de estudio actual. Informa cuántas horas tocan hoy, advierte sobre exámenes inmediatos y lista la secuencia de bloques.



#### Estructura y Comportamiento Visual

* Encabezado con fecha dinámica y total de horas de estudio calculadas.


* Alerta de parcial con badge de fecha (`Vie 23`), contador de bloques completados (`5 de 8`) y accesos directos a `/practicar` y `/preguntar`.


* Lista de bloques nocturnos procesados con `.map()`:


* Bloques de estudio: Muestran materia, detalle y botones interactivos (`Listo` / `Pasar a otro día`). Al presionar `Listo`, el estado cambia a `Completado ✓` con fondo verde.


* Bloques de pausa/libre: Se renderizan en cajas simplificadas con borde punteado.




* Resumen de *"Tus materias"* con tarjetas enlazadas a `/materias`.



#### Contrato de Datos Esperado (`GET /api/dashboard`)

```json
{
  "fechaHoy": "Jueves 22 de octubre",
  "horasEstudio": "dos horas",
  "alertaParcial": {
    "fechaBadge": "Vie 23",
    "materia": "Análisis Matemático I",
    "unidades": "unidades 1 a 3",
    "bloquesHechos": 5,
    "bloquesTotales": 8,
    "ejemploPregunta": "¿cuándo una función no es derivable?"
  },
  "bloquesHoy": [
    {
      "id": 1,
      "hora": "18:00",
      "tipo": "estudio",
      "materia": "Análisis Matemático I",
      "detalle": "Derivadas, unidad 3. Una hora.",
      "completado": false
    },
    {
      "id": 2,
      "hora": "19:00",
      "tipo": "pausa",
      "texto": "Pausa de media hora."
    },
    {
      "id": 3,
      "hora": "19:30",
      "tipo": "estudio",
      "materia": "Física I",
      "detalle": "Cinemática, unidad 2. Una hora.",
      "completado": false
    },
    {
      "id": 4,
      "hora": "20:30",
      "tipo": "libre",
      "texto": "Libre. Mañana arrancás a las 9 en el trabajo."
    }
  ],
  "materias": [
    { "id": 1, "nombre": "Análisis Matemático I", "detalle": "4 unidades, 6 apuntes", "tieneApuntes": true },
    { "id": 2, "nombre": "Física I", "detalle": "3 unidades, 3 apuntes", "tieneApuntes": true },
    { "id": 3, "nombre": "Introducción a la Programación", "detalle": "Todavia no cargaste apuntes", "tieneApuntes": false }
  ]
}

```

---

### Pantalla 3: "Preguntar" (Chat RAG con Apuntes)

* **Ruta:** `/preguntar`

* **Objetivo:** Interfaz de consulta directa contra los documentos subidos. Implementa el flujo RAG (Retrieval-Augmented Generation), mostrando citas específicas por apunte y advirtiendo cuando un contenido no figura en el material.



#### Estructura y Comportamiento Visual

* Selector superior de materia activa y contador de cuota restante de preguntas diarias.


* Botón *"Empezar de nuevo"* que reinicia la memoria del chat en pantalla.


* Hilo de conversación generado dinámicamente:
* Mensajes del usuario (`Vos`).


* Respuestas del asistente: Renderizan un bloque de badges grises para cada una de las fuentes citadas (`Unidad X, página Y`).


* Respuestas sin fuentes: Muestran el indicador *"Sin fuente en tus apuntes"* junto a un botón de acción para subir el programa analítico.




* Formulario inferior interactivo: `textarea` controlado con envío mediante `Enter` o botón *"Preguntar"*, insertando el mensaje en el hilo y descontando el contador.



#### Contrato de Datos Esperado (`POST /api/chat`)

**Payload enviado por el Frontend:**

```json
{
  "usuarioId": 1,
  "materia": "Análisis Matemático I",
  "pregunta": "¿Cuál es la diferencia entre continuidad y derivabilidad?"
}

```

**Respuesta enviada por FastAPI (Pipeline RAG):**

```json
{
  "id": 102,
  "remitente": "assistant",
  "texto": "Una función es continua en un punto si el límite existe y coincide con el valor de la función. Es derivable si, además, existe el límite del cociente incremental...",
  "fuentes": [
    "1 Apunte de cátedra, unidad 3, página 41",
    "2 Apunte de cátedra, unidad 3, página 43"
  ],
  "sinFuente": false,
  "preguntasRestantes": 21
}

```

---

### Pantalla 4: "Mi semana" (Cronograma y Planificación)

* **Ruta:** `/mi-semana`

* **Objetivo:** Vista semanal de planificación que combina cursada, trabajo y bloques de estudio asignados.



#### Estructura y Comportamiento Visual

* **Grilla Horaria (Columna Izquierda):**
* Eje vertical con marcas horarias desde las 08:00 hasta las 20:00.


* 7 columnas diarias (Lunes a Domingo).


* Detección visual del día actual (`Hoy, jue 22`) con fondo destacado.


* Badge superior de `PARCIAL` en días con examen programado.


* **Cálculo dinámico de altura y posición:** Los eventos se posicionan mediante las propiedades `start` y `end`. El componente calcula:

$$\text{duracion} = \text{end} - \text{start}$$


$$\text{topPos} = (\text{start} - 8) \times 44\text{px}$$


$$\text{height} = (\text{duracion} \times 44\text{px}) - 4\text{px}$$



Esto permite que turnos de trabajo largos de 4 horas o repasos de 1.5 horas se dibujen proporcionalmente sin configurar la altura a mano.




* **Panel Lateral (Columna Derecha):**
* Tarjeta de foco del bloque actual con botones simétricos (`Listo` y `Pasar a otro día`).


* Enlace contextual *"Preguntar sobre derivadas"* que redirige a `/preguntar`.


* Lista de exámenes con cálculo automático de progreso porcentual:

$$\text{porcentaje} = \left(\frac{\text{bloques hechos}}{\text{bloques totales}}\right) \times 100$$



La barra de progreso se llena en tiempo real con el color asignado a cada materia.





#### Contrato de Datos Esperado (`GET /api/calendario?semana=2026-10-19`)

```json
{
  "rangoSemana": "Del 19 al 25 de octubre",
  "dias": [
    { "id": 0, "nombre": "Lun 19", "hoy": false, "parcial": false },
    { "id": 3, "nombre": "Hoy, jue 22", "hoy": true, "parcial": false },
    { "id": 4, "nombre": "Vie 23", "hoy": false, "parcial": true }
  ],
  "eventos": [
    { "diaId": 0, "start": 9, "end": 18, "title": "Trabajo", "type": "work" },
    { "diaId": 0, "start": 18, "end": 20, "title": "Cursada", "type": "work" },
    { "diaId": 3, "start": 18, "end": 19, "title": "Análisis U3", "type": "study" }
  ],
  "bloqueActivo": {
    "horarioTexto": "Hoy, de 18 a 19",
    "materia": "Análisis Matemático I",
    "detalle": "Derivadas, unidad 3",
    "temaPregunta": "derivadas",
    "completado": false
  },
  "examenes": [
    {
      "id": 1,
      "titulo": "Parcial de Análisis I, viernes 23",
      "hechos": 5,
      "total": 8,
      "color": "#5A4BD1"
    },
    {
      "id": 2,
      "titulo": "Parcial de Física I, viernes 30",
      "hechos": 1,
      "total": 7,
      "color": "#3B82F6"
    }
  ]
}

```

---

### Pantalla 5: "Practicar" (Diagnóstico y Corrección de Tests)

* **Ruta:** `/practicar`

* **Objetivo:** Corrección de exámenes de práctica generados por IA. Permite al estudiante revisar debilidades conceptuales antes de rendir.



#### Estructura y Comportamiento Visual

* Cabecera con título de la evaluación, puntaje global (`7/10`) y frase de diagnóstico.


* Caja *"Repasá esto"*: Lista los 3 temas prioritarios detectados con botones para agendar o preguntar directamente al chat.


* Acordeón de preguntas evaluadas:
* Preguntas correctas (ej. 3 y 5): Muestran badge verde con tilde (`✓`) y no despliegan corrección.


* Preguntas incorrectas (ej. 4 y 7): Muestran cruz roja (`✕`) o botón *"Ver corrección"*.


* Comportamiento interactivo: La función `toggleExpandir(numero)` permite abrir o cerrar la tarjeta de explicación pedagógica y su cita al apunte correspondiente en cualquier momento.





#### Contrato de Datos Esperado (`GET /api/tests/{test_id}`)

```json
{
  "id": "test_an1_01",
  "titulo": "Test de práctica de Análisis Matemático I, unidades 1 a 3",
  "mensajeAlerta": "Tenés tres respuestas para revisar antes del viernes.",
  "puntaje": "7/10",
  "temasRepaso": [
    { "id": 1, "titulo": "Continuidad y derivabilidad, unidad 3" },
    { "id": 2, "titulo": "Regla de la cadena, unidad 3" },
    { "id": 3, "titulo": "Límites laterales, unidad 2" }
  ],
  "preguntas": [
    {
      "numero": 3,
      "enunciado": "¿Cuál es el dominio de f(x) = √(x - 2)?",
      "esCorrecta": true,
      "expandida": false
    },
    {
      "numero": 4,
      "enunciado": "Si f es continua en x=a, entonces f es derivable en x=a. ¿Verdadero o falso?",
      "esCorrecta": false,
      "expandida": true,
      "mensajeError": "Respondiste Verdadero. Es falso.",
      "fuente": "Lo explica el apunte de la unidad 3, página 41",
      "explicacion": "La continuidad hace falta para ser derivable, pero no alcanza. Por ejemplo, |x| es continua en 0 y no es derivable en ese punto."
    }
  ]
}

```

---

### Pantalla 6: "Materias y apuntes" (Gestión Académica e Ingesta de PDFs)

* **Ruta:** `/materias`

* **Objetivo:** Carga, organización y administración de materias, unidades temáticas y apuntes en PDF para alimentar el sistema RAG (US09 y US10).



#### Estructura y Comportamiento Visual

* **Selector Superior de Materias:** Pestañas horizontales que conmutan el estado `selectedMateriaId`. Al cambiar de pestaña, las unidades y los conteos se actualizan al instante sin recargar la página.


* **Cabecera de Materia:**
* Título destacado con resaltador lila suave (`#DFD7FA`).


* Botón *"Editar materia"* y botón rojo suave *"Eliminar materia"*.




* **Columna de Unidades y Apuntes:**
* Tarjetas por unidad temática que listan sus archivos PDF.


* Si la unidad no tiene apuntes (ej. Unidad 4: Integrales), se habilita el botón en rojo *"Eliminar unidad"*.


* Estados de procesamiento de archivos:
1. `listo`: Badge verde *"Listo para preguntar ✓"*.


2. `procesando`: Badge amarillo *"Procesando texto..."*.


3. `error`: Badge rojo *"Error de escaneo ✕"* (con fila destacada en rosa suave).






* **Columna Derecha (Subida y Advertencias):**
* Formulario de subida con selector de unidad destino y zona de arrastre (Dropzone).


* Leyenda de validación: *"Tiene que ser un PDF con texto, no escaneado, de hasta 25 MB."*

* **Tarjeta de Alerta de Error:** Detecta automáticamente en los datos si existe algún apunte con `estado === 'error'` y muestra una caja roja destacada con el archivo afectado, la materia, la unidad y la explicación del error de escaneo.





#### Contrato de Datos Esperado (`GET /api/materias`)

```json
[
  {
    "id": 1,
    "nombre": "Análisis Matemático I",
    "unidades": [
      {
        "id": 101,
        "numero": 1,
        "nombre": "Números reales y funciones",
        "apuntes": [
          { "id": 1, "nombre": "Teoría de Funciones y Dominio.pdf", "paginas": 18, "estado": "listo" },
          { "id": 2, "nombre": "Práctica 1 - Resueltos.pdf", "paginas": 12, "estado": "listo" }
        ]
      },
      {
        "id": 104,
        "numero": 4,
        "nombre": "Integrales",
        "apuntes": []
      }
    ]
  },
  {
    "id": 2,
    "nombre": "Física I",
    "unidades": [
      {
        "id": 202,
        "numero": 2,
        "nombre": "Dinámica y Leyes de Newton",
        "apuntes": [
          {
            "id": 10,
            "nombre": "Apuntes escaneados de la clase 4.pdf",
            "paginas": 10,
            "estado": "error",
            "errorDetalle": "Parece una foto o escaneo sin texto seleccionable"
          }
        ]
      }
    ]
  }
]

```

---

## 5. Guía de Integración para el Equipo de Backend

Para conectar las pantallas con las APIs reales en FastAPI y Supabase, deben seguir estas pautas:

1. **Reemplazo de estados iniciales:**
En cada archivo `page.js`, busquen las declaraciones `useState([...])` que contienen los datos mockeados. Deben envolver la llamada al backend dentro de un hook `useEffect`:
```jsx
useEffect(() => {
  async function cargarDatos() {
    const res = await fetch('http://localhost:8000/api/dashboard');
    const data = await res.json();
    setDashboardData(data);
  }
  cargarDatos();
}, []);

```


2. **Carga de Archivos (`/materias`):**
La zona de arrastre y el botón *"Subir apunte"* deben enviar un `FormData` con el archivo binario y el identificador de unidad hacia el endpoint de ingestión:
```javascript
const formData = new FormData();
formData.append('file', archivoPdf);
formData.append('unidad_id', unidadDestino);
await fetch('http://localhost:8000/api/apuntes/upload', {
  method: 'POST',
  body: formData,
});

```


3. **Mapeo de Endpoints Recomendados:**

| Método | Endpoint | Pantalla Frontend | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/usuarios` | `/usuarios` | Lista de perfiles de usuario disponibles

 |
| `GET` | `/api/dashboard` | `/` | Información del día, alertas y materias

 |
| `POST` | `/api/chat` | `/preguntar` | Envío de duda y recuperación RAG de citas

 |
| `GET` | `/api/calendario` | `/mi-semana` | Eventos de la semana y cálculo de barras

 |
| `GET` | `/api/tests/{id}` | `/practicar` | Preguntas generadas y corrección

 |
| `GET` | `/api/materias` | `/materias` | Estructura jerárquica Materia ➔ Unidad ➔ PDFs

 |
| `POST` | `/api/materias` | `/materias` | Alta de nueva materia |
| `DELETE` | `/api/unidades/{id}` | `/materias` | Borrado de unidad (solo si no tiene PDFs)

 |

---

## 6. Registro de Decisiones de Arquitectura (ADR)

* **ADR-01: Mantener "Esta noche" en la ruta raíz (`/`)**
* *Contexto:* Surgió la duda de si mover esta pantalla a una carpeta `/esta-noche`.
* *Decisión:* Se mantuvo en `app/page.js`. Es el Dashboard principal del estudiante al ingresar a su sesión. Crear una subcarpeta obligaría a tener redirecciones redundantes o daría error 404 en la raíz limpia.




* **ADR-02: Posicionamiento temporal mediante `start` y `end` en el calendario**
* *Contexto:* Inicialmente los eventos utilizaban una duración fija (`duration: 2`).
* *Decisión:* Se migró a pares `start` y `end` numéricos (ej. `start: 9, end: 18`). Permite calcular dinámicamente la duración en tiempo real (`end - start`), replica fielmente los modelos estándar de calendarios y bases de datos, y evita inconsistencias si el usuario modifica los horarios.




* **ADR-03: Desacoplamiento condicional del Sidebar en vistas de autenticación**
* *Contexto:* En la pantalla `/usuarios`, la presencia de la barra lateral mostraba datos de materias o calendario antes de saber qué usuario estaba activo.


* *Decisión:* Se creó el componente `LayoutWrapper` que evalúa `pathname.startsWith('/usuarios')`. Si la condición se cumple, oculta por completo el Sidebar y remueve los márgenes para entregar una vista de bienvenida limpia.




* **ADR-04: Estados explícitos de documentos en la interfaz**
* *Contexto:* El pipeline RAG procesa los archivos PDF de forma asíncrona.
* *Decisión:* Se implementaron 3 estados visuales en el frontend (`listo`, `procesando`, `error`). Esto permite notificar visualmente al estudiante si un archivo fue rechazado por ser un escaneo sin texto OCR antes de intentar hacer preguntas en el chat.