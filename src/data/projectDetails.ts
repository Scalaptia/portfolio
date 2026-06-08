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
        "When you create your account, you fill out a style profile questionnaire and take a photo of your face. The app analyzes your facial colorimetry to find the color palettes that suit you best.",
        "You upload photos of your clothes or browse items from partner stores. The app removes backgrounds and extracts dominant colors and tags from each piece.",
        "You can assemble outfits manually on the interactive canvas, or describe the occasion in plain language and let the RAG pipeline generate coordinated outfits that respect your color palette and style preferences.",
        "You can iterate, 'make it more formal' or 'swap the jacket', and the system regenerates without starting over."
      ],
      whatIBuilt: [
        "Designed the three-phase RAG pipeline: a planning step where Gemini breaks prompts into clothing categories, a vector similarity search via pgvector to retrieve matching items from the wardrobe, and a composition step that assembles coherent outfits factoring in the user's color palette and style preferences.",
        "Built the React Native mobile app with an interactive canvas for manually arranging outfits, drag, scale, rotate, plus the wardrobe and recommendation flows.",
        "Provisioned all cloud infrastructure on Azure using Terraform."
      ],
      results:
        "A controlled experiment with 10 participants compared manual vs. AI-assisted outfit creation using a standardized 25-item capsule wardrobe. The AI condition reduced UI interactions by 83.4% (p = 0.001), lowered cognitive load by 22.3% (NASA-TLX), and scored 86.75/100 on the System Usability Scale.",
      extraImages: [],
    },
    es: {
      problem:
        "La sobreabundancia de prendas en el guardarropa incrementa la carga cognitiva diaria y provoca la subutilización crónica del inventario. Las personas gravitan hacia las mismas prendas mientras la mayoría queda sin usar. Stilo se construyó para evaluar si un sistema de IA puede reducir el esfuerzo mental de elegir qué ponerse y mejorar la rotación del guardarropa.",
      howItWorks: [
        "Al crear tu cuenta, llenas un cuestionario de perfil de estilo y tomas una foto de tu rostro. La app analiza tu colorimetría facial para encontrar las paletas de colores que más te favorecen.",
        "Subes fotos de tus prendas o exploras artículos de tiendas aliadas. La app elimina los fondos y extrae los colores dominantes y etiquetas de cada pieza.",
        "Puedes armar atuendos manualmente en el lienzo interactivo, o describir la ocasión en lenguaje natural y dejar que el pipeline RAG genere conjuntos coordinados que respetan tu paleta de color y preferencias de estilo.",
        "Puedes iterar, 'hazlo más formal' o 'cambia la chamarra', y el sistema regenera sin empezar de cero."
      ],
      whatIBuilt: [
        "Diseñé el pipeline RAG de tres fases: un paso de planeación donde Gemini desglosa los prompts en categorías de ropa, una búsqueda por similitud vectorial con pgvector para recuperar las prendas compatibles del armario, y un paso de composición que arma conjuntos coherentes considerando la paleta de color y preferencias del usuario.",
        "Construí la app móvil con React Native y un lienzo interactivo para armar atuendos manualmente, arrastrar, escalar, rotar, más los flujos de guardarropa y recomendaciones.",
        "Provisioné toda la infraestructura cloud en Azure usando Terraform."
      ],
      results:
        "Un experimento controlado con 10 participantes comparó la creación de atuendos manual vs. asistida por IA con un guardarropa cápsula de 25 prendas. La condición con IA redujo las interacciones en un 83.4% (p = 0.001), disminuyó la carga cognitiva en 22.3% (NASA-TLX) y obtuvo 86.75/100 en la escala SUS.",
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
        "A separate LSTM model (Python/TensorFlow) analyzes usage patterns and predicts how many hours until your tank is empty, with confidence scores.",
        "Email alerts notify you when water drops below a configurable threshold or when the sensor stops reporting (disconnection)."
      ],
      whatIBuilt: [
        "Designed the full system architecture: Arduino firmware that registers itself on first boot, Lambda for sensor ingestion and notification dispatch, NestJS API behind API Gateway, and a React SPA with Clerk authentication.",
        "Built the ML prediction service: an LSTM neural network trained on historical usage data with hyperparameters optimized via genetic algorithm. Predictions are cached in Redis and served through a FastAPI endpoint."
      ],
      results:
        "The system handles 1,000+ daily sensor readings at < 200 ms latency. The prediction model achieves strong accuracy for 24-hour forecasts.",
      extraImages: [],
    },
    es: {
      problem:
        "En Baja California, el agua no est\u00e1 garantizada. Muchos hogares dependen de pipas que llegan en horarios irregulares, y los tanques de almacenamiento son el \u00fanico amortiguador entre tener agua y quedarse seco. Quer\u00eda construir algo que te dijera exactamente cu\u00e1nta agua te queda y te avisara antes de que se acabe.",
      howItWorks: [
        "Un Arduino con un sensor ultrasónico se coloca sobre tu tanque de agua, midiendo la distancia a la superficie cada 60 segundos.",
        "Las lecturas se envían a una Lambda de AWS mediante API Gateway, que calcula el porcentaje de agua y lo almacena en MySQL.",
        "Un dashboard en React muestra tu nivel actual de agua como un medidor animado, con gr\u00e1ficos hist\u00f3ricos de 24 horas, 7 d\u00edas y 30 d\u00edas.",
        "Un modelo LSTM (Python/TensorFlow) analiza patrones de uso y predice cu\u00e1ntas horas faltan para que el tanque se vac\u00ede, con puntajes de confianza.",
        "Alertas por correo te notifican cuando el agua baja de un umbral configurable o cuando el sensor deja de reportar (desconexi\u00f3n)."
      ],
      whatIBuilt: [
        "Diseñé la arquitectura completa: firmware Arduino que se registra solo al primer arranque, Lambda para ingesta de sensores y envío de notificaciones, API NestJS detrás de API Gateway, y un SPA React con autenticación Clerk.",
        "Constru\u00ed el servicio de predicciones: una red neuronal LSTM entrenada con datos hist\u00f3ricos de uso e hiperpar\u00e1metros optimizados con algoritmo gen\u00e9tico. Las predicciones se cachean en Redis y se sirven mediante un endpoint de FastAPI."
      ],
      results:
        "El sistema procesa m\u00e1s de 1,000 lecturas diarias con latencia < 200 ms. El modelo de predicci\u00f3n logra buena precisi\u00f3n en pron\u00f3sticos de 24 horas.",
      extraImages: [],
    },
  },
};

export function getProjectDetail(slug: string, locale: string): ProjectDetail | null {
  const project = projectDetails[slug];
  if (!project) return null;
  return project[locale as keyof typeof project] || project.en;
}
