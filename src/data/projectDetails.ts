export interface ProjectDetail {
  problem: string;
  howItWorks: string[];
  whatIBuilt: string[];
  results: string;
  extraImages: string[];
  videoUrl?: string;
}

export const projectDetails: Record<string, { en: ProjectDetail; es: ProjectDetail }> = {
  stilo: {
    en: {
      problem:
        "Closet overabundance increases daily cognitive load and leads to chronic underutilization of personal inventory. People gravitate toward the same few outfits while most garments sit idle. Stilo was built to test whether an AI system could reduce the mental effort of choosing what to wear and improve wardrobe rotation.",
      howItWorks: [
        "You photograph a piece, or pick several photos from your gallery at once. Stilo removes the background, and the AI suggests a name, category, main color and tags for you to confirm.",
        "You describe the occasion, like a date or a work meeting, and Stilo searches your closet and proposes complete looks. You can ask for changes, 'more formal' or 'other shoes', without starting over.",
        "You can also drag pieces onto the canvas yourself, arrange them and save the outfit.",
        "If you opt in, Stilo analyzes a photo of your face to work out your seasonal color palette, and suggestions pick colors from it. The photo is deleted when the analysis ends."
      ],
      whatIBuilt: [
        "Designed the outfit pipeline. An LLM plans which garment categories the look needs, embedding search retrieves matching pieces from your closet, and a second pass composes the outfit or edits the one on the canvas under style and color rules.",
        "Built the Expo app: the closet and upload flow, the AI studio and the canvas where you drag, scale and rotate pieces.",
        "Moved the backend from a NestJS API, a FastAPI service and Postgres on Azure to one Cloudflare Worker with D1, R2 and Queues. A parity suite checked each operation against the old API before the cutover."
      ],
      results:
        "A controlled experiment with 10 participants compared manual and AI-assisted outfit creation on a standardized 25-item capsule wardrobe. The AI condition took 83.4% fewer UI interactions (p = 0.001), lowered cognitive load by 22.3% (NASA-TLX) and scored 86.75/100 on the System Usability Scale. The paper was accepted at MexIHC 2026 and will appear in Avances en Interacción Humano-Computadora.",
      extraImages: [],
    },
    es: {
      problem:
        "La sobreabundancia de prendas en el guardarropa incrementa la carga cognitiva diaria y provoca la subutilización crónica del inventario. Las personas gravitan hacia las mismas prendas mientras la mayoría queda sin usar. Stilo se construyó para evaluar si un sistema de IA puede reducir el esfuerzo mental de elegir qué ponerse y mejorar la rotación del guardarropa.",
      howItWorks: [
        "Fotografías una prenda o eliges varias fotos de tu galería a la vez. Stilo recorta el fondo y la IA sugiere nombre, categoría, color principal y etiquetas para que los confirmes.",
        "Describes la ocasión, como una cita o una reunión de trabajo, y Stilo busca en tu armario y te propone looks completos. Puedes pedir cambios, 'más formal' u 'otros zapatos', sin empezar de cero.",
        "También puedes arrastrar prendas al lienzo, acomodarlas y guardar el atuendo.",
        "Si quieres, Stilo analiza una foto de tu rostro para obtener tu paleta de colorimetría por estación, y las sugerencias eligen colores de ella. La foto se borra al terminar el análisis."
      ],
      whatIBuilt: [
        "Diseñé el pipeline de atuendos. Un LLM planea qué categorías de prendas necesita el look, una búsqueda por embeddings recupera prendas compatibles de tu armario y un segundo paso arma el atuendo o edita el del lienzo con reglas de estilo y color.",
        "Construí la app en Expo: el armario y la subida de prendas, el estudio con IA y el lienzo donde arrastras, escalas y rotas prendas.",
        "Migré el backend de una API en NestJS, un servicio en FastAPI y Postgres en Azure a un solo Cloudflare Worker con D1, R2 y Queues. Pruebas de paridad compararon cada operación contra la API anterior antes del cambio."
      ],
      results:
        "Un experimento controlado con 10 participantes comparó la creación de atuendos manual y asistida por IA con un guardarropa cápsula de 25 prendas. La condición con IA requirió 83.4% menos interacciones (p = 0.001), redujo la carga cognitiva en 22.3% (NASA-TLX) y obtuvo 86.75/100 en la escala SUS. El artículo fue aceptado en MexIHC 2026 y se publicará en Avances en Interacción Humano-Computadora.",
      extraImages: [],
    },
  },

  "nasa-explorer": {
    en: {
      problem:
        "NASA has published decades of space biology research, but it's scattered across databases, PDFs, and institutional repositories. Scientists spend hours searching through papers instead of asking questions and getting answers. Our team entered NASA Space Apps 2025 to solve this.",
      howItWorks: [
        "You type a question about space biology in plain English: 'How does microgravity affect bone density in mice?' or 'What experiments have studied plant growth on the ISS?'",
        "The backend searches a RAG corpus built from NASA Task Book, OSDR, and PubMed Central articles, verified scientific sources, not random web content.",
        "Google Gemini 2.5 Flash Lite synthesizes an answer with inline citations. Each response includes a list of referenced articles with titles, authors, years, and DOI links.",
        "An interactive D3.js knowledge graph in the sidebar shows how research topics connect, letting you explore related areas by clicking nodes.",
        "You can save articles to favorites, revisit past conversations, and explore pre-built prompt suggestions organized by topic."
      ],
      whatIBuilt: [
        "Built the NestJS backend: chat module with conversation persistence, user auth with JWT, favorites system, and the RAG orchestration layer connecting to Vertex AI and the Google Cloud RAG corpus.",
        "Developed the interactive knowledge graph with D3.js (force-directed layout, draggable nodes, hover highlighting), article favorites sidebar, and chat history integration on the React frontend.",
        "Wrote the entire Python data pipeline that scraped and ingested NASA publications from multiple sources into the RAG corpus."
      ],
      results:
        "Built in a weekend by a team of 6. Won 1st place in the local round of NASA Space Apps Challenge 2025 and was selected as a Global Nominee. The project was evaluated on technical implementation, scientific accuracy, and potential impact on NASA's open science mission.",
      extraImages: [],
    },
    es: {
      problem:
        "La NASA ha publicado d\u00e9cadas de investigaci\u00f3n en biolog\u00eda espacial, pero est\u00e1 dispersa en bases de datos, PDFs y repositorios institucionales. Los cient\u00edficos pasan horas buscando entre art\u00edculos en lugar de hacer preguntas y obtener respuestas. Nuestro equipo particip\u00f3 en NASA Space Apps 2025 para resolver esto.",
      howItWorks: [
        "Escribes una pregunta sobre biolog\u00eda espacial en lenguaje natural: '\u00bfC\u00f3mo afecta la microgravedad a la densidad \u00f3sea en ratones?' o '\u00bfQu\u00e9 experimentos han estudiado el crecimiento de plantas en la ISS?'",
        "El backend busca en un corpus RAG construido con art\u00edculos de NASA Task Book, OSDR y PubMed Central \u2014 fuentes cient\u00edficas verificadas, no contenido web aleatorio.",
        "Google Gemini 2.5 Flash Lite sintetiza una respuesta con citas. Cada respuesta incluye una lista de art\u00edculos referenciados con t\u00edtulos, autores, a\u00f1os y enlaces DOI.",
        "Un grafo de conocimiento interactivo con D3.js en la barra lateral muestra c\u00f3mo se conectan los temas de investigaci\u00f3n, permitiendo explorar \u00e1reas relacionadas al hacer clic en nodos.",
        "Puedes guardar art\u00edculos en favoritos, revisar conversaciones pasadas y explorar sugerencias de prompts organizadas por tema."
      ],
      whatIBuilt: [
        "Constru\u00ed el backend en NestJS: m\u00f3dulo de chat con persistencia de conversaciones, autenticaci\u00f3n JWT, sistema de favoritos y la capa de orquestaci\u00f3n RAG conectando Vertex AI con el corpus de Google Cloud.",
        "Desarroll\u00e9 el grafo de conocimiento interactivo con D3.js (layout force-directed, nodos arrastrables, resaltado al pasar el mouse), barra lateral de favoritos e integraci\u00f3n del historial de chat en el frontend React.",
        "Escrib\u00ed todo el pipeline de datos en Python que extrajo e index\u00f3 publicaciones de la NASA desde m\u00faltiples fuentes al corpus RAG."
      ],
      results:
        "Construido en un fin de semana por un equipo de 6. Gan\u00f3 1er lugar en la ronda local de NASA Space Apps Challenge 2025 y fue seleccionado como Nominado Global. El proyecto fue evaluado en implementaci\u00f3n t\u00e9cnica, precisi\u00f3n cient\u00edfica e impacto potencial en la misi\u00f3n de ciencia abierta de la NASA.",
      extraImages: [],
    },
  },

  awita: {
    en: {
      problem:
        "In Baja California, water isn't guaranteed. Many homes rely on water trucks that deliver on irregular schedules, and storage tanks are the buffer between having water and running dry. I wanted to build something that would tell you exactly how much water you have left and warn you before it runs out.",
      howItWorks: [
        "An Arduino with an ultrasonic sensor sits on top of your water tank, measuring the distance to the water surface every 60 seconds.",
        "Readings are sent to an AWS Lambda via API Gateway, which calculates the water level percentage and stores it in MySQL.",
        "A React dashboard shows your current water level as an animated gauge, with 24-hour, 7-day, and 30-day historical charts.",
        "Email alerts notify you when water drops below a configurable threshold or when the sensor stops reporting (disconnection)."
      ],
      whatIBuilt: [
        "Designed the full system architecture: Arduino firmware that registers itself on first boot, Lambda for sensor ingestion and notification dispatch, NestJS API behind API Gateway, and a React SPA with Clerk authentication.",
        "Built an LSTM prediction service on FastAPI, trained on historical usage with hyperparameters tuned by a genetic algorithm and cached in Redis. I measured it against the latency it added and switched it off. A simpler regression is what I would build in its place."
      ],
      results:
        "About 1,440 readings a day at under 100 ms per write. The system has been running on my family's tank in Ensenada since 2025, and my dad and my brother use it too.",
      extraImages: [],
    },
    es: {
      problem:
        "En Baja California, el agua no est\u00e1 garantizada. Muchos hogares dependen de pipas que llegan en horarios irregulares, y los tanques de almacenamiento son el \u00fanico amortiguador entre tener agua y quedarse seco. Quer\u00eda construir algo que te dijera exactamente cu\u00e1nta agua te queda y te avisara antes de que se acabe.",
      howItWorks: [
        "Un Arduino con un sensor ultrasónico se coloca sobre tu tanque de agua, midiendo la distancia a la superficie cada 60 segundos.",
        "Las lecturas se envían a una Lambda de AWS mediante API Gateway, que calcula el porcentaje de agua y lo almacena en MySQL.",
        "Un dashboard en React muestra tu nivel actual de agua como un medidor animado, con gr\u00e1ficos hist\u00f3ricos de 24 horas, 7 d\u00edas y 30 d\u00edas.",
        "Alertas por correo te notifican cuando el agua baja de un umbral configurable o cuando el sensor deja de reportar (desconexi\u00f3n)."
      ],
      whatIBuilt: [
        "Diseñé la arquitectura completa: firmware Arduino que se registra solo al primer arranque, Lambda para ingesta de sensores y envío de notificaciones, API NestJS detrás de API Gateway, y un SPA React con autenticación Clerk.",
        "Construí un servicio de predicciones LSTM sobre FastAPI, entrenado con datos históricos e hiperparámetros optimizados con algoritmo genético y cacheado en Redis. Lo evalué contra la latencia que agregaba y lo apagué. Una regresión más simple es lo que construiría en su lugar."
      ],
      results:
        "Alrededor de 1,440 lecturas diarias con menos de 100 ms por escritura. Lleva funcionando en el tanque de mi casa en Ensenada desde 2025, y mi papá y mi hermano también lo usan.",
      extraImages: [],
    },
  },
};

export function getProjectDetail(slug: string, locale: string): ProjectDetail | null {
  const project = projectDetails[slug];
  if (!project) return null;
  return project[locale as keyof typeof project] || project.en;
}
