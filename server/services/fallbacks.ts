/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Heuristics and Fallback direct templates for robust offline stadium volunteer co-pilot operations

export function getRecommendFallback(gate: any, gates: any[]) {
  const otherGates = gates.filter((g: any) => g.id !== gate.id);
  const bestGate = otherGates.reduce((prev: any, curr: any) => (prev.density < curr.density ? prev : curr), { name: 'Gate E', density: 19 });

  return {
    whatsHappening: `${gate.name} is experiencing an active crowd surge, with current density rising rapidly to ${gate.density}% capacity.`,
    risk: `If unaddressed, this surge will exceed design capacity limits, creating dangerous turnstile queue pressure and crushing hazards within ~5 minutes.`,
    action: `Initiate immediate crowd diversion. Redirect arriving supporters away from ${gate.name} and guide them to ${bestGate.name}, which is currently under-utilized at only ${bestGate.density}% capacity.`,
    scriptEnglish: `Attention supporters approaching ${gate.name}: to get you inside the stadium much quicker and avoid queues, please head to ${bestGate.name} right now. It is completely clear with no line. Follow the staff's instructions. Thank you for your help!`,
    scriptSpanish: `Atención a todos los aficionados cerca de la ${gate.name}: para ingresar al estadio mucho más rápido, por favor diríjanse a la ${bestGate.name} en este momento. Está totalmente despejada y sin fila. Siga las instrucciones del personal. ¡Gracias por su colaboración!`,
    scriptFrench: `Attention à tous les supporters approchant de la ${gate.name} : afin d'entrer plus rapidement dans le stade et d'éviter les files d'attente, veuillez vous diriger vers la ${bestGate.name} dès maintenant. Elle est totalement fluide et libre d'accès. Suivez les instructions du personnel. Merci !`,
    isLocalFallback: true
  };
}

export function getRecommendUltimateFallback(gate: any, gates: any[]) {
  const otherGates = gates.filter((g: any) => g.id !== gate.id);
  const bestGate = otherGates.reduce((prev: any, curr: any) => (prev.density < curr.density ? prev : curr), { name: 'Gate E', density: 19 });
  return {
    whatsHappening: `${gate.name} is experiencing heavy load. Density is currently at ${gate.density}%.`,
    risk: `Increased wait times and localized pressure at the turnstiles expected if left unmanaged.`,
    action: `Gently direct new arrivals toward ${bestGate.name} which has low congestion (${bestGate.density}% density).`,
    scriptEnglish: `Hi everyone! To get you inside much quicker, please head towards ${bestGate.name} where there are no queues right now. Thank you for your support!`,
    scriptSpanish: `¡Hola a todos! Para ingresar mucho más rápido, por favor diríjanse hacia la ${bestGate.name} donde no hay filas en este momento. ¡Muchas gracias por su apoyo!`,
    scriptFrench: `Bonjour à tous ! Pour entrer beaucoup plus rapidement, veuillez vous diriger vers la ${bestGate.name} où il n'y a pas d'attente actuellement. Merci pour votre aide !`,
    isLocalFallback: true
  };
}

export function getBroadcastScriptFallback(gateName: string) {
  return {
    scriptEnglish: `Hi everyone! To get you inside much faster and avoid the crowd here at ${gateName || "this gate"}, we are routing everyone to the adjacent gate. It is fully open and there is no queue! Just a quick walk around the side. Thank you for your help, we appreciate you!`,
    scriptSpanish: `¡Hola a todos! Para que puedan ingresar mucho más rápido y evitar la fila aquí en la ${gateName || "esta puerta"}, estamos dirigiendo a todos a la puerta de al lado. ¡Está totalmente despejada y sin esperas! Solo toma un momento rodear la esquina. ¡Muchas gracias por su paciencia y apoyo!`,
    scriptFrench: `Bonjour à tous ! Afin de vous faire entrer beaucoup plus vite et d'éviter l'attente ici à la ${gateName || "cette porte"}, nous vous redirigeons vers la porte juste à côté. Elle est entièrement fluide et sans file d'attente ! C'est à deux pas d'ici. Merci infiniment de votre collaboration !`,
    isLocalFallback: true
  };
}

export function getTranslateFallback(phrase: string) {
  const lower = phrase.toLowerCase().trim();
  let fallbackResult = {
    originalLanguage: "Spanish",
    translatedText: phrase,
    urgencyTag: "Casual",
    classificationReason: "Supporter asking for standard directions or general help.",
    suggestedResponse: "Hola, ¿cómo puedo ayudarte hoy?",
    suggestedResponseEnglish: "Hello, how can I help you today?",
    detectedTone: "Calm & Conversational"
  };

  if (lower.includes("corazón") || lower.includes("corazon") || lower.includes("padre") || lower.includes("dolor") || lower.includes("medico") || lower.includes("enfermo") || lower.includes("ayuda") || lower.includes("sangre") || lower.includes("urgente")) {
    fallbackResult = {
      originalLanguage: "Spanish",
      translatedText: lower.includes("padre") || lower.includes("corazón") || lower.includes("corazon")
        ? "Help please! My father is feeling very sick with his heart near Gate C." 
        : "I need medical help / I feel sick.",
      urgencyTag: "Medical",
      classificationReason: "Explicit mention of cardiac emergency symptoms or urgent medical distress.",
      suggestedResponse: "Por favor, quédese aquí tranquilo. Estoy llamando a nuestro equipo médico de inmediato para que lo asistan. Todo va a estar bien.",
      suggestedResponseEnglish: "Please, stay here and remain calm. I am calling our medical response team right now to assist you. Everything is going to be okay.",
      detectedTone: "Panic-stricken & Distressed"
    };
  } else if (lower.includes("silla") || lower.includes("ruedas") || lower.includes("discapacidad") || lower.includes("rampa") || lower.includes("ascensor")) {
    fallbackResult = {
      originalLanguage: "Spanish",
      translatedText: "Where is the wheelchair ramp / elevator?",
      urgencyTag: "Accessibility",
      classificationReason: "Inquiry regarding wheelchair access or accessibility services.",
      suggestedResponse: "Contamos con una rampa de acceso y un ascensor a la vuelta de esta esquina, a la derecha. Un voluntario lo puede acompañar si gusta.",
      suggestedResponseEnglish: "We have an accessibility ramp and elevator just around this corner, to the right. A volunteer can accompany you if you'd like.",
      detectedTone: "Concerned & Seeking Assistance"
    };
  } else if (lower.includes("toilet") || lower.includes("toilettes") || lower.includes("toilette") || lower.includes("perdido") || lower.includes("puerta") || lower.includes("boleto") || lower.includes("baño") || lower.includes("agua")) {
    const isToiletFrench = lower.includes("toilettes") || lower.includes("toilette");
    fallbackResult = {
      originalLanguage: isToiletFrench ? "French" : "Spanish",
      translatedText: isToiletFrench 
        ? "Hello, excuse me, where are the closest restrooms please?" 
        : "I am lost / where is the restroom or water?",
      urgencyTag: "Casual",
      classificationReason: "Spectator requesting restrooms location and general directions.",
      suggestedResponse: isToiletFrench 
        ? "Les toilettes les plus proches sont situées juste à côté de la Porte D, à environ trente mètres d'ici." 
        : "Los baños y dispensadores de agua están derecho por este pasillo a unos 50 metros.",
      suggestedResponseEnglish: isToiletFrench 
        ? "The nearest restrooms are located right next to Gate D, about thirty meters from here." 
        : "The restrooms and water stations are straight down this hallway about 50 meters.",
      detectedTone: "Calm & Conversational"
    };
  } else if (lower.includes("hilfe") || lower.includes("tochter") || lower.includes("luft") || lower.includes("sanit") || lower.includes("arzt")) {
    fallbackResult = {
      originalLanguage: "German",
      translatedText: "Help! My daughter has run out of air and urgently needs a paramedic!",
      urgencyTag: "Medical",
      classificationReason: "Urgent German request regarding breathing difficulty and emergency medical team support.",
      suggestedResponse: "Bitte bleiben Sie ganz ruhig hier bei mir. Ich habe soeben den Sanitätsdienst alarmiert, sie sind sofort auf dem Weg zu uns. Wir helfen Ihnen!",
      suggestedResponseEnglish: "Please remain calm here with me. I have just alerted the medical service, they are on their way to us immediately. We will help you!",
      detectedTone: "Panic-stricken & Distressed"
    };
  } else if (lower.includes("車椅子") || lower.includes("エレベーター") || lower.includes("えれべーたー") || lower.includes("くるまいす")) {
    fallbackResult = {
      originalLanguage: "Japanese",
      translatedText: "Excuse me, where is the elevator for wheelchair users?",
      urgencyTag: "Accessibility",
      classificationReason: "Accessibility request for wheelchair lift/elevator access in Japanese.",
      suggestedResponse: "車椅子用のエレベーターは、この角を右に曲がってすぐのところにございます。よろしければ、スタッフがご案内いたします。",
      suggestedResponseEnglish: "The elevator for wheelchair users is located just around this corner on the right. If you'd like, a staff member can guide you there.",
      detectedTone: "Concerned & Seeking Assistance"
    };
  } else if (lower.includes("mal") || lower.includes("secours") || lower.includes("hopital") || lower.includes("medecin")) {
    fallbackResult = {
      originalLanguage: "French",
      translatedText: "I am unwell / need first aid.",
      urgencyTag: "Medical",
      classificationReason: "Explicit mention of feeling unwell or needing a doctor in French.",
      suggestedResponse: "S'il vous plaît, restez ici. J'appelle notre équipe médicale d'urgence immédiatement pour vous aider. Tout va bien se passer.",
      suggestedResponseEnglish: "Please, stay here. I am calling our emergency medical team immediately to help you. Everything will be fine.",
      detectedTone: "Concerned & Seeking Assistance"
    };
  } else if (lower.includes("fauteuil") || lower.includes("rampe") || lower.includes("ascenseur")) {
    fallbackResult = {
      originalLanguage: "French",
      translatedText: "Where is the wheelchair lift or elevator?",
      urgencyTag: "Accessibility",
      classificationReason: "Accessibility search for elevator or ramps in French.",
      suggestedResponse: "Nous avons une rampe d'accès et un ascenseur juste au coin à droite. Un bénévole peut vous accompagner si vous le souhaitez.",
      suggestedResponseEnglish: "We have an access ramp and elevator just around the corner on the right. A volunteer can accompany you if you wish.",
      detectedTone: "Concerned & Seeking Assistance"
    };
  } else {
    fallbackResult = {
      originalLanguage: "Auto-Detected",
      translatedText: phrase,
      urgencyTag: "Casual",
      classificationReason: "General spectator inquiry.",
      suggestedResponse: `We understand your inquiry: "${phrase}". Let us find a team leader or nearby signage to assist you immediately.`,
      suggestedResponseEnglish: "We understand your inquiry. Let us find a team leader or nearby signage to assist you immediately.",
      detectedTone: "Calm & Conversational"
    };
  }

  return fallbackResult;
}

export function getParseFileFallback() {
  return [
    { id: "gate-b", name: "Gate B (Custom Spike)", density: 91, trend: "up", history: [70, 75, 80, 86, 91] },
    { id: "gate-c", name: "Gate C (Nominal)", density: 45, trend: "down", history: [60, 56, 52, 48, 45] },
    { id: "gate-d", name: "Gate D (Heavy)", density: 82, trend: "up", history: [68, 71, 74, 78, 82] },
    { id: "gate-e", name: "Gate E (Empty)", density: 14, trend: "stable", history: [15, 14, 15, 13, 14] }
  ];
}
