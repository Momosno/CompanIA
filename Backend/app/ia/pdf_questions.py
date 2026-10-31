import re
import dotenv
from langchain_anthropic import ChatAnthropic
from app.ia.vectorstore import vectorstore

dotenv.load_dotenv()
# max_tokens alto a propósito: el modelo razona antes de escribir y eso cuenta contra el límite
# (con 500 la respuesta puede salir cortada o vacía)
model = ChatAnthropic(model="claude-haiku-5-5", max_tokens=2000)
UMBRAL = 1.35
PROMPT = """
Sos un tutor que ayuda a estudiantes universitarios a entender el material de su materia.
Vas a recibir fragmentos de los apuntes, cada uno marcado con [Página N], y una pregunta.

REGLAS:
- Respondé usando SOLO la información de los fragmentos. No agregues datos de afuera.
- Si los fragmentos no alcanzan para responder, decilo claramente
  ("Eso no aparece en el material que subiste") y no inventes.
- Citá las páginas donde está la información, así: (p. 3) o (p. 3, 5).
- Respondé en español, con un tono cercano y claro, como un compañero que explica bien.
- Respondé SOLO lo que se pregunta, en 2 a 4 oraciones.
- No agregues ideas extra salvo que la pregunta los pida.
- Sin títulos. Citá las páginas al final de cada afirmación, así: (p. 3).
"""
# para el chat: la base son los apuntes y lo agregado va separado, para mostrarlo resaltado
PROMPT_MATERIA = """
Sos un tutor que ayuda a estudiantes universitarios a entender el material de su materia.
Vas a recibir fragmentos de los apuntes, cada uno marcado con [Página N - documento], y una pregunta.

REGLAS:
- Basá la respuesta en los fragmentos: entre el 80% y el 90% tiene que salir de ahí.
- Si los fragmentos tratan el tema, explicá lo que dicen aunque no traigan una definición formal.
  Por ejemplo, si preguntan "qué es una función" y hay gráficos o ejemplos, explicalo con eso.
- En la parte principal no agregues nada que no esté en los fragmentos.
- Citá las páginas al final de cada afirmación, así: (p. 3) o (p. 3, 5).
- Respondé en español, con un tono cercano y claro, como un compañero que explica bien.
- Respondé SOLO lo que se pregunta, en 2 a 4 oraciones y sin títulos.

COMPLEMENTO:
- Si al material le falta algo para entender la respuesta, al final podés agregar 1 o 2 oraciones
  de conocimiento general. Escribilas en una línea aparte que empiece exactamente con "COMPLEMENTO:",
  sin citas de páginas. Si no hace falta, no lo escribas.
- Si la pregunta es de la misma materia pero los fragmentos no la tratan, escribí como parte principal
  "Eso no aparece en el material que subiste" y dá la explicación breve en el COMPLEMENTO.
- Si la pregunta no tiene relación con el tema de los fragmentos, respondé solo
  "Eso no aparece en el material que subiste", sin COMPLEMENTO.
"""
SIN_MATERIAL = "Eso no aparece en el material que subiste."
CITA = re.compile(r"\(p\.\s*([^)]*)\)")
MARCA_COMPLEMENTO = re.compile(r"\*{0,2}COMPLEMENTO:\*{0,2}")


class LLMNoDisponible(Exception):
    pass


def _preguntar_al_modelo(contexto, pregunta, prompt=PROMPT):
    try:
        respuesta = model.invoke([
            ("system", prompt),
            ("human", f"Fragmentos:\n{contexto}\n\nPregunta: {pregunta}"),
        ])
    except Exception as e:
        raise LLMNoDisponible(str(e)) from e
    return respuesta.text


def _paginas_citadas(texto):
    return {pagina for cita in CITA.findall(texto) for pagina in re.findall(r"\w+", cita)}


def responder_materia(pregunta, materia_id):
    resultados = vectorstore.similarity_search_with_score(
        pregunta, k=5, filter={"materia_id": int(materia_id)}
    )
    relevantes = [doc for doc, score in resultados if score < UMBRAL]
    if not relevantes:
        return {"respuesta": SIN_MATERIAL, "fuentes": [], "sin_fuente": True}
    contexto = "\n\n".join(
        f"[Página {doc.metadata['page_label']} - {doc.metadata['nombre_documento']}]\n{doc.page_content}"
        for doc in relevantes
    )
    partes = MARCA_COMPLEMENTO.split(_preguntar_al_modelo(contexto, pregunta, PROMPT_MATERIA), maxsplit=1)
    texto = partes[0].strip()
    complemento = partes[1].strip() if len(partes) > 1 else None

    # solo cuentan como fuentes las páginas que el modelo citó, no todo lo recuperado
    citadas = _paginas_citadas(texto)
    # el modelo cita solo la página: si dos documentos la comparten, va el fragmento más parecido
    documento_por_pagina = {}
    for doc in relevantes:
        if doc.metadata["page_label"] in citadas:
            documento_por_pagina.setdefault(doc.metadata["page_label"], doc.metadata["nombre_documento"])
    fuentes = sorted((documento, pagina) for pagina, documento in documento_por_pagina.items())
    if "no aparece en el material" in texto.lower():
        return {"respuesta": texto, "fuentes": [], "sin_fuente": True, "complemento": complemento}
    if not fuentes:
        return {"respuesta": SIN_MATERIAL, "fuentes": [], "sin_fuente": True, "complemento": complemento}
    return {
        "respuesta": texto,
        "complemento": complemento,
        "fuentes": [
            {"documento": documento, "pagina": int(pagina) if pagina.isdigit() else pagina}
            for documento, pagina in fuentes
        ],
        "sin_fuente": False,
    }


def responder(pregunta, documento_id):
    resultados = vectorstore.similarity_search_with_score(
        pregunta, k=5, filter={"documento_id": documento_id}
    )
    relevantes = [doc for doc, score in resultados if score < UMBRAL]
    if not relevantes:
        return {"respuesta": "No encontré eso en el material.", "paginas": []}
    contexto = "\n\n".join(
    f"[Página {doc.metadata['page_label']}]\n{doc.page_content}" for doc in relevantes
    )
    texto = _preguntar_al_modelo(contexto, pregunta)
    paginas = sorted({int(doc.metadata["page_label"]) for doc in relevantes})
    return {"respuesta": texto, "paginas": paginas}

if __name__ == "__main__":
    pregunta = "¿Qué es una función?"
    documento_id = "prueba-1"
    resultado = responder(pregunta, documento_id)
    print("Respuesta:", resultado["respuesta"])
    print("Páginas relevantes:", resultado["paginas"])