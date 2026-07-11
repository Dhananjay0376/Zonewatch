/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Rule-based fallback generators for Zonewatch API routes.
 * These provide high-quality, deterministic responses when the Gemini AI
 * service is unavailable due to rate-limiting, network issues, or quota
 * exhaustion. Fallbacks ensure 100% operational uptime for stadium volunteers.
 */

import type { Gate, ParsedGate } from '../types';

/**
 * Returns the gate with the lowest crowd density from a list.
 * Used to identify the best redirection target during a surge.
 */
function findLeastCrowdedGate(gates: Gate[], excludeId: string): Gate {
  const others = gates.filter((g) => g.id !== excludeId);
  if (others.length === 0) return { id: 'gate-e', name: 'Gate E', density: 19, trend: 'stable' };
  return others.reduce((prev, curr) => (curr.density < prev.density ? curr : prev));
}

/**
 * Primary fallback for POST /api/recommend.
 * Uses rule-based logic to identify the least-congested alternative gate
 * and generates contextual crowd-control guidance.
 */
export function getRecommendFallback(gate: Gate, gates: Gate[]): Record<string, string | boolean> {
  const bestGate = findLeastCrowdedGate(gates, gate.id);
  return {
    whatsHappening: `${gate.name} is experiencing an active crowd surge, with current density rising rapidly to ${gate.density}% capacity.`,
    risk: `If unaddressed, this surge will exceed design capacity limits, creating dangerous turnstile queue pressure and crushing hazards within approximately 5 minutes.`,
    action: `Initiate immediate crowd diversion. Redirect arriving supporters away from ${gate.name} toward ${bestGate.name}, which is currently under-utilised at only ${bestGate.density}% capacity.`,
    scriptEnglish: `Attention supporters approaching ${gate.name}: to get you inside the stadium much quicker and avoid queues, please head to ${bestGate.name} right now. It is completely clear with no line. Follow the staff's instructions. Thank you for your help!`,
    scriptSpanish: `Atención a todos los aficionados cerca de la ${gate.name}: para ingresar al estadio mucho más rápido, por favor diríjanse a la ${bestGate.name} en este momento. Está totalmente despejada y sin fila. Siga las instrucciones del personal. ¡Gracias por su colaboración!`,
    scriptFrench: `Attention à tous les supporters approchant de la ${gate.name} : afin d'entrer plus rapidement dans le stade et d'éviter les files d'attente, veuillez vous diriger vers la ${bestGate.name} dès maintenant. Elle est totalement fluide et libre d'accès. Suivez les instructions du personnel. Merci !`,
    isLocalFallback: true,
  };
}

/**
 * Ultimate fallback for POST /api/recommend.
 * Triggered when even the primary fallback encounters an error.
 */
export function getRecommendUltimateFallback(gate: Gate, gates: Gate[]): Record<string, string | boolean> {
  const bestGate = findLeastCrowdedGate(gates, gate.id);
  return {
    whatsHappening: `${gate.name} is experiencing heavy load. Density is currently at ${gate.density}%.`,
    risk: `Increased wait times and localised pressure at the turnstiles expected if left unmanaged.`,
    action: `Gently direct new arrivals toward ${bestGate.name} which has low congestion (${bestGate.density}% density).`,
    scriptEnglish: `Hi everyone! To get you inside much quicker, please head towards ${bestGate.name} where there are no queues right now. Thank you for your support!`,
    scriptSpanish: `¡Hola a todos! Para ingresar mucho más rápido, por favor diríjanse hacia la ${bestGate.name} donde no hay filas en este momento. ¡Muchas gracias por su apoyo!`,
    scriptFrench: `Bonjour à tous ! Pour entrer beaucoup plus rapidement, veuillez vous diriger vers la ${bestGate.name} où il n'y a pas d'attente actuellement. Merci pour votre aide !`,
    isLocalFallback: true,
  };
}

/**
 * Fallback for POST /api/broadcast-script.
 * Returns pre-written, tourist-friendly announcements in three languages.
 */
export function getBroadcastScriptFallback(gateName: string): Record<string, string | boolean> {
  const gate = gateName || 'this gate';
  return {
    scriptEnglish: `Hi everyone! To get you inside much faster and avoid the crowd here at ${gate}, we are routing everyone to the adjacent gate. It is fully open and there is no queue! Just a quick walk around the side. Thank you for your help, we appreciate you!`,
    scriptSpanish: `¡Hola a todos! Para que puedan ingresar mucho más rápido y evitar la fila aquí en la ${gate}, estamos dirigiendo a todos a la puerta de al lado. ¡Está totalmente despejada y sin esperas! Solo toma un momento rodear la esquina. ¡Muchas gracias por su paciencia y apoyo!`,
    scriptFrench: `Bonjour à tous ! Afin de vous faire entrer beaucoup plus vite et d'éviter l'attente ici à la ${gate}, nous vous redirigeons vers la porte juste à côté. Elle est entièrement fluide et sans file d'attente ! C'est à deux pas d'ici. Merci infiniment de votre collaboration !`,
    isLocalFallback: true,
  };
}

/**
 * Fallback for POST /api/translate.
 * Performs keyword-based language detection and returns pre-translated
 * responses for common stadium scenarios in Spanish, French, German, Japanese, and Hindi.
 */
export function getTranslateFallback(phrase: string): Record<string, string> {
  const lower = phrase.toLowerCase().trim();

  // ── Medical emergencies ──────────────────────────────────────────────────
  if (
    lower.includes('corazón') || lower.includes('corazon') || lower.includes('padre') ||
    lower.includes('dolor') || lower.includes('medico') || lower.includes('enfermo') ||
    lower.includes('ayuda') || lower.includes('sangre') || lower.includes('urgente')
  ) {
    const isCardiac = lower.includes('padre') || lower.includes('corazón') || lower.includes('corazon');
    return {
      originalLanguage: 'Spanish',
      translatedText: isCardiac
        ? 'Help please! My father is feeling very sick with his heart near Gate C.'
        : 'I need medical help / I feel sick.',
      urgencyTag: 'Medical',
      classificationReason: 'Explicit mention of cardiac emergency symptoms or urgent medical distress.',
      suggestedResponse: 'Por favor, quédese aquí tranquilo. Estoy llamando a nuestro equipo médico de inmediato para que lo asistan. Todo va a estar bien.',
      suggestedResponseEnglish: 'Please, stay here and remain calm. I am calling our medical response team right now to assist you. Everything is going to be okay.',
      detectedTone: 'Panic-stricken & Distressed',
    };
  }

  // ── Spanish accessibility ────────────────────────────────────────────────
  if (
    lower.includes('silla') || lower.includes('ruedas') || lower.includes('discapacidad') ||
    lower.includes('rampa') || lower.includes('ascensor')
  ) {
    return {
      originalLanguage: 'Spanish',
      translatedText: 'Where is the wheelchair ramp / elevator?',
      urgencyTag: 'Accessibility',
      classificationReason: 'Inquiry regarding wheelchair access or accessibility services.',
      suggestedResponse: 'Contamos con una rampa de acceso y un ascensor a la vuelta de esta esquina, a la derecha. Un voluntario lo puede acompañar si gusta.',
      suggestedResponseEnglish: "We have an accessibility ramp and elevator just around this corner, to the right. A volunteer can accompany you if you'd like.",
      detectedTone: 'Concerned & Seeking Assistance',
    };
  }

  // ── Facilities / navigation ──────────────────────────────────────────────
  if (
    lower.includes('toilet') || lower.includes('toilettes') || lower.includes('toilette') ||
    lower.includes('perdido') || lower.includes('puerta') || lower.includes('boleto') ||
    lower.includes('baño') || lower.includes('agua')
  ) {
    const isFrench = lower.includes('toilettes') || lower.includes('toilette');
    return {
      originalLanguage: isFrench ? 'French' : 'Spanish',
      translatedText: isFrench
        ? 'Hello, excuse me, where are the closest restrooms please?'
        : 'I am lost / where is the restroom or water?',
      urgencyTag: 'Casual',
      classificationReason: 'Spectator requesting restrooms location and general directions.',
      suggestedResponse: isFrench
        ? "Les toilettes les plus proches sont situées juste à côté de la Porte D, à environ trente mètres d'ici."
        : 'Los baños y dispensadores de agua están derecho por este pasillo a unos 50 metros.',
      suggestedResponseEnglish: isFrench
        ? 'The nearest restrooms are located right next to Gate D, about thirty meters from here.'
        : 'The restrooms and water stations are straight down this hallway about 50 meters.',
      detectedTone: 'Calm & Conversational',
    };
  }

  // ── German medical emergency ─────────────────────────────────────────────
  if (
    lower.includes('hilfe') || lower.includes('tochter') || lower.includes('luft') ||
    lower.includes('sanit') || lower.includes('arzt')
  ) {
    return {
      originalLanguage: 'German',
      translatedText: 'Help! My daughter has run out of air and urgently needs a paramedic!',
      urgencyTag: 'Medical',
      classificationReason: 'Urgent German request regarding breathing difficulty and emergency medical team support.',
      suggestedResponse: 'Bitte bleiben Sie ganz ruhig hier bei mir. Ich habe soeben den Sanitätsdienst alarmiert, sie sind sofort auf dem Weg zu uns. Wir helfen Ihnen!',
      suggestedResponseEnglish: 'Please remain calm here with me. I have just alerted the medical service, they are on their way to us immediately. We will help you!',
      detectedTone: 'Panic-stricken & Distressed',
    };
  }

  // ── Japanese accessibility ───────────────────────────────────────────────
  if (
    lower.includes('車椅子') || lower.includes('エレベーター') ||
    lower.includes('えれべーたー') || lower.includes('くるまいす')
  ) {
    return {
      originalLanguage: 'Japanese',
      translatedText: 'Excuse me, where is the elevator for wheelchair users?',
      urgencyTag: 'Accessibility',
      classificationReason: 'Accessibility request for wheelchair lift/elevator access in Japanese.',
      suggestedResponse: '車椅子用のエレベーターは、この角を右に曲がってすぐのところにございます。よろしければ、スタッフがご案内いたします。',
      suggestedResponseEnglish: "The elevator for wheelchair users is located just around this corner on the right. If you'd like, a staff member can guide you there.",
      detectedTone: 'Concerned & Seeking Assistance',
    };
  }

  // ── French medical ───────────────────────────────────────────────────────
  if (lower.includes('mal') || lower.includes('secours') || lower.includes('hopital') || lower.includes('medecin')) {
    return {
      originalLanguage: 'French',
      translatedText: 'I am unwell / need first aid.',
      urgencyTag: 'Medical',
      classificationReason: 'Explicit mention of feeling unwell or needing a doctor in French.',
      suggestedResponse: "S'il vous plaît, restez ici. J'appelle notre équipe médicale d'urgence immédiatement pour vous aider. Tout va bien se passer.",
      suggestedResponseEnglish: 'Please, stay here. I am calling our emergency medical team immediately to help you. Everything will be fine.',
      detectedTone: 'Concerned & Seeking Assistance',
    };
  }

  // ── French accessibility ─────────────────────────────────────────────────
  if (lower.includes('fauteuil') || lower.includes('rampe') || lower.includes('ascenseur')) {
    return {
      originalLanguage: 'French',
      translatedText: 'Where is the wheelchair lift or elevator?',
      urgencyTag: 'Accessibility',
      classificationReason: 'Accessibility search for elevator or ramps in French.',
      suggestedResponse: 'Nous avons une rampe d\'accès et un ascenseur juste au coin à droite. Un bénévole peut vous accompagner si vous le souhaitez.',
      suggestedResponseEnglish: 'We have an access ramp and elevator just around the corner on the right. A volunteer can accompany you if you wish.',
      detectedTone: 'Concerned & Seeking Assistance',
    };
  }

  // ── Hindi assistance ─────────────────────────────────────────────────────
  if (
    lower.includes('मदद') || lower.includes('पानी') || lower.includes('शौचालय') ||
    lower.includes('डॉक्टर') || lower.includes('madad') || lower.includes('paani')
  ) {
    const isMedical = lower.includes('मदद') || lower.includes('madad');
    return {
      originalLanguage: 'Hindi',
      translatedText: isMedical
        ? 'Help! Please call a doctor immediately, someone is sick.'
        : 'Excuse me, where can I find drinking water or restrooms?',
      urgencyTag: isMedical ? 'Medical' : 'Casual',
      classificationReason: 'Supporter request in Hindi concerning medical aid or essential stadium facilities.',
      suggestedResponse: isMedical
        ? 'कृपया यहीं शांत रहें। मैंने आपातकालीन चिकित्सा टीम को सूचित कर दिया है, वे तुरंत आ रहे हैं।'
        : 'पानी के काउंटर और शौचालय सीधे इस गलियारे में लगभग पचास मीटर की दूरी पर हैं।',
      suggestedResponseEnglish: isMedical
        ? 'Please stay calm here. I have informed the emergency medical team, they are coming immediately.'
        : 'The water stations and restrooms are straight down this corridor about fifty meters.',
      detectedTone: isMedical ? 'Panic-stricken & Distressed' : 'Calm & Conversational',
    };
  }

  // ── Generic fallback ─────────────────────────────────────────────────────
  return {
    originalLanguage: 'Auto-Detected',
    translatedText: phrase,
    urgencyTag: 'Casual',
    classificationReason: 'General spectator inquiry.',
    suggestedResponse: `We understand your inquiry: "${phrase}". Let us find a team leader or nearby signage to assist you immediately.`,
    suggestedResponseEnglish: 'We understand your inquiry. Let us find a team leader or nearby signage to assist you immediately.',
    detectedTone: 'Calm & Conversational',
  };
}

/**
 * Fallback for POST /api/parse-mock-file when both local CSV parsing
 * and Gemini file parsing fail. Returns a realistic surge scenario.
 */
export function getParseFileFallback(): ParsedGate[] {
  return [
    { id: 'gate-b', name: 'Gate B (Custom Spike)', density: 91, trend: 'up', history: [70, 75, 80, 86, 91] },
    { id: 'gate-c', name: 'Gate C (Nominal)', density: 45, trend: 'down', history: [60, 56, 52, 48, 45] },
    { id: 'gate-d', name: 'Gate D (Heavy)', density: 82, trend: 'up', history: [68, 71, 74, 78, 82] },
    { id: 'gate-e', name: 'Gate E (Empty)', density: 14, trend: 'stable', history: [15, 14, 15, 13, 14] },
  ];
}
