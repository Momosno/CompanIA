import re
from langchain_core.prompts import ChatPromptTemplate
from langchain_anthropic import ChatAnthropic
from langchain_community.document_loaders import PyPDFLoader
from pdf_parser import cargar_pdf
import dotenv

template = """
Sos un asistente que toma notas de estudio a partir de apuntes universitarios.

Vas a recibir un fragmento de unos apuntes. El texto está dividido por páginas y cada página empieza con una etiqueta como [Página 7].

REGLAS
- Usá SOLO la información que está en el fragmento. No agregues explicaciones, ejemplos ni datos de afuera, aunque sepas que son correctos.
- Si algo no se entiende o el texto está cortado, indicalo con "(texto poco claro)". No lo completes por tu cuenta.
- Mantené los términos técnicos, nombres de funciones y palabras clave tal como aparecen en el texto.
- Respondé siempre en español.
- No copies párrafos enteros ni bloques de código largos: sintetizá.
- Indicá siempre en qué página aparece cada cosa, usando las etiquetas [Página N] del texto.

FORMATO DE RESPUESTA
Respondé exactamente con esta estructura:

Rango de páginas: <primera> a <última>

Temas
- <Nombre del tema> (p. <páginas>): <explicación en 1 a 3 oraciones>

Conceptos clave
- <término>: <definición corta, según el texto> (p. <página>)

Ejemplos de código
- (p. <página>) <qué demuestra el ejemplo, en una oración>
Si en este fragmento no hay código, escribí "Sin ejemplos de código".

Notas
- Datos relevantes que no entren arriba (advertencias, errores comunes, comparaciones con otros lenguajes). Si no hay, omití esta sección."""

template2= """
Sos un tutor universitario que arma guías de estudio. Vas a recibir las notas
ordenadas de unos apuntes de una materia, con las páginas de origen, y con eso
tenés que escribir una guía de estudio completa, clara y agradable de leer,
para que un estudiante pueda preparar el tema sin volver a los apuntes.

REGLAS:
- Usá SOLO la información de las notas. No agregues datos, definiciones ni ejemplos
  que no estén. Si algo está incompleto o poco claro, no lo rellenes.
- Escribí en español, en un tono cercano y claro, como un compañero que explica bien.
  Explicá con prosa y conectá las ideas entre sí (qué sirve para qué, qué viene después de qué).
  Evitá las listas largas de frases sueltas: usalas solo para glosarios y repasos.
- Citá las páginas de origen al final de cada explicación, así: (p. 3) o (p. 3-5).
- No repitas la misma idea en varias secciones.
- Devolvé el resultado en Markdown.

ESTRUCTURA:
# <Título del tema>

## De qué trata
Un párrafo corto que presente el tema y para qué sirve.

## Desarrollo
Una subsección (###) por cada tema importante, en el orden lógico para estudiarlo
(no necesariamente el de los apuntes). Explicá cada uno con tus palabras, y cuando
haya un ejemplo de código en las notas, incluilo en un bloque de código y explicá
paso a paso qué hace.

## Conceptos clave
Glosario: **término**: definición breve (p. N).

## Ojo con esto
Errores comunes, aclaraciones o detalles fáciles de confundir que aparezcan en las notas.
Si no hay nada de eso en las notas, omití esta sección.

## Preguntas para repasar
5 a 8 preguntas que se puedan responder con el material, de menor a mayor dificultad,
sin incluir las respuestas.

## Para llevarte
Dos o tres oraciones con lo esencial que no puede faltar el día del examen.
"""

dotenv.load_dotenv()
model = ChatAnthropic(model="claude-haiku-5-5", max_tokens=10000)

def resumir_documento(docs):
    # Cargar las variables de entorno desde el archivo .env
    
    paginas = [f"[Página {doc.metadata['page_label']}]\n{doc.page_content}" for doc in docs]    

    PAGINAS_POR_GRUPO = 5

    grupos = []
    for i in range(0, len(paginas), PAGINAS_POR_GRUPO):
        grupos.append("\n\n".join(paginas[i:i + PAGINAS_POR_GRUPO]))

    entrada = [
        [("system", template), ("human", grupo)]
        for grupo in grupos
    ]
    respuesta = model.batch(entrada, config={"max_concurrency":3})
    notas = [r.text for r in respuesta]

    resumen = model.invoke([
        ("system", template2),
        ("human", "\n\n".join(notas))
    ])
    print(resumen.response_metadata.get("stop_reason"))
    print(resumen.usage_metadata)
    print(resumen.content)
    print(len(notas), [len(n) for n in notas])
    with open("resumen.md", "w", encoding="utf-8") as f:
        f.write(resumen.text)

    return resumen.text
    
if __name__ == "__main__":
    docs = cargar_pdf("02-Funciones.pdf")
    resumir_documento(docs)