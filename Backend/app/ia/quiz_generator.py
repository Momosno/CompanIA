import json
import random
import re

import dotenv
from langchain_anthropic import ChatAnthropic

dotenv.load_dotenv()
model = ChatAnthropic(model="claude-haiku-5-5", max_tokens=16000)

MAX_CARACTERES = 150_000  # tope de material que se le pasa a Claude
ORDEN = {"facil": 0, "media": 1, "dificil": 2}

PROMPT = """
Sos un profesor universitario que arma cuestionarios de opción múltiple para que un estudiante practique.
Vas a recibir el material de estudio (guías de estudio de uno o más documentos) y cuántas preguntas armar de cada dificultad.

DIFICULTADES
- facil: recordar una definición, un término o un dato puntual del material.
- media: entender y relacionar ideas, o aplicar un concepto a un caso simple.
- dificil: analizar un caso nuevo, predecir qué hace un código, comparar conceptos parecidos o detectar un error. Los distractores tienen que ser muy plausibles.

REGLAS
- Usá SOLO el material recibido. No inventes datos de afuera.
- Cada pregunta tiene EXACTAMENTE 4 opciones en total, entre "correctas" e "incorrectas". Puede haber 1, 2 o 3 correctas (nunca 0 ni 4).
- Cuántas preguntas llevan una sola correcta y cuántas varias se indica en el pedido: respetalo.
- Las preguntas con más de una correcta se redactan en plural ("¿Cuáles de las siguientes afirmaciones son correctas?") para que se note que hay que marcar varias.
- No pongas las opciones en ningún orden especial: el sistema las mezcla después.
- Las incorrectas tienen que ser creíbles (errores típicos de estudiantes), de largo parecido a las correctas. Prohibido "todas las anteriores" y "ninguna de las anteriores".
- Cada pregunta se entiende sola: no escribas "según el texto", "según la guía" ni "en el material".
- No repitas temas. Si hay varios documentos, repartí las preguntas entre todos.
- "explicacion": 1 o 2 oraciones que dicen por qué las correctas son correctas.
- "fuente": el nombre del documento del que sale la pregunta, tal cual aparece en el encabezado.
- Escribí todo en español.

FORMATO: respondé SOLO con un JSON válido, sin texto antes ni después y sin bloques de código:
{"preguntas": [{"dificultad": "facil", "pregunta": "...", "correctas": ["texto correcto"], "incorrectas": ["texto 1", "texto 2", "texto 3"], "explicacion": "...", "fuente": "..."}]}
"""

def generar_cuestionario(documentos, cantidad, dificultad, multiples=True):
    # documentos: lista de {"nombre_original": ..., "resumen": ...}; dificultad: facil, media, dificil o mixta
    # multiples: si es True, la mitad de las preguntas tienen varias correctas; si es False, todas tienen una sola
    if dificultad == "mixta":
        faciles = round(cantidad * 0.3)
        dificiles = round(cantidad * 0.3)
        reparto = {"facil": faciles, "media": cantidad - faciles - dificiles, "dificil": dificiles}
    else:
        reparto = {dificultad: cantidad}
    pedido = "\n".join(f"- {nivel}: {n}" for nivel, n in reparto.items() if n > 0)

    # balance: con respuestas múltiples activadas, la mitad (como mucho) tienen varias correctas
    con_varias = cantidad // 2 if multiples else 0
    max_con_varias = (cantidad + 1) // 2 if multiples else 0
    if multiples:
        pedido += f"\n\nCorrectas: {cantidad - con_varias} preguntas con UNA sola correcta y {con_varias} con 2 o 3 correctas."
    else:
        pedido += "\n\nCorrectas: TODAS las preguntas con UNA sola correcta (1 correcta y 3 incorrectas)."

    por_documento = MAX_CARACTERES // len(documentos)
    material = "\n\n".join(
        f"=== DOCUMENTO: {d['nombre_original']} ===\n{d['resumen'][:por_documento]}" for d in documentos
    )
    nombres = {d["nombre_original"] for d in documentos}

    mejor = []
    for _ in range(2):  # si Claude devuelve algo roto, se reintenta una vez
        try:
            texto = model.invoke([
                ("system", PROMPT),
                ("human", f"Material:\n{material}\n\nArmá {cantidad} preguntas, repartidas así:\n{pedido}"),
            ]).text
            crudas = json.loads(re.search(r"\{.*\}", texto, re.S).group())["preguntas"]
        except Exception:
            continue

        validas = []
        varias = 0
        for p in crudas:
            try:
                correctas = [str(o).strip() for o in p["correctas"]]
                opciones = correctas + [str(o).strip() for o in p["incorrectas"]]
                if not 1 <= len(correctas) <= 3 or len(opciones) != 4 or len(set(opciones)) != 4 or "" in opciones:
                    continue
                if len(correctas) > 1:
                    if varias >= max_con_varias:
                        continue  # no hay lugar para más preguntas de varias correctas (mantiene el balance)
                    varias += 1
                random.shuffle(opciones)
                nivel = p.get("dificultad") if p.get("dificultad") in ORDEN else "media"
                validas.append({
                    "pregunta": str(p["pregunta"]).strip(),
                    "dificultad": nivel,
                    "opciones": opciones,
                    "correctas": sorted(opciones.index(c) for c in correctas),
                    "respuestas_correctas": [opciones[i] for i in sorted(opciones.index(c) for c in correctas)],
                    "multiple": len(correctas) > 1,
                    "explicacion": str(p.get("explicacion", "")).strip(),
                    "fuente": p.get("fuente") if p.get("fuente") in nombres else None,
                })
            except Exception:
                continue
        if len(validas) > len(mejor):
            mejor = validas
        if len(mejor) >= cantidad:
            break

    if not mejor:
        raise ValueError("Claude no devolvió preguntas válidas")
    mejor = mejor[:cantidad]
    return sorted(mejor, key=lambda p: ORDEN[p["dificultad"]])  # de fácil a difícil
