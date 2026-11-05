import dotenv
from langchain_anthropic import ChatAnthropic
from Backend.app.ia.vectorstore import vectorstore

dotenv.load_dotenv()
model = ChatAnthropic(model="claude-haiku-5-5", max_tokens=500)
UMBRAL = 1
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
    respuesta = model.invoke([
        ("system", PROMPT),
        ("human", f"Fragmentos:\n{contexto}\n\nPregunta: {pregunta}"),
    ])
    paginas = sorted({int(doc.metadata["page_label"]) for doc in relevantes})
    return {"respuesta": respuesta.text, "paginas": paginas}

if __name__ == "__main__":
    pregunta = "¿Qué es una función?"
    documento_id = "prueba-1"
    resultado = responder(pregunta, documento_id)
    print("Respuesta:", resultado["respuesta"])
    print("Páginas relevantes:", resultado["paginas"])