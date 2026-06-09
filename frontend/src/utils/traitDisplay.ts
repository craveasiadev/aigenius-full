export const LEARNING_STYLE_DISPLAY = {
  visual: {
    name: 'Visual Learner',
    description: 'Learns best by seeing and observing',
    icon: '👁️',
  },
  handson: {
    name: 'Hands-On Learner',
    description: 'Learns best by doing and experiencing',
    icon: '✋',
  },
  verbal: {
    name: 'Verbal Learner',
    description: 'Learns best by listening and talking',
    icon: '💬',
  },
  logical: {
    name: 'Logical Learner',
    description: 'Learns best by thinking and problem-solving',
    icon: '🧠',
  },
};

export const BEHAVIOUR_TENDENCY_DISPLAY = {
  initiator: {
    name: 'Initiator',
    description: 'Takes action quickly and leads the way',
    icon: '🚀',
  },
  thinker: {
    name: 'Thinker',
    description: 'Thinks things through carefully before acting',
    icon: '🤔',
  },
  observer: {
    name: 'Observer',
    description: 'Watches and learns from others first',
    icon: '👀',
  },
  feeler: {
    name: 'Feeler',
    description: 'Makes decisions based on emotions and feelings',
    icon: '❤️',
  },
};

export const CURIOSITY_TYPE_DISPLAY = {
  explorer: {
    name: 'Explorer',
    description: 'Loves discovering new places and experiences',
    icon: '🗺️',
  },
  builder: {
    name: 'Builder',
    description: 'Enjoys creating and building things',
    icon: '🏗️',
  },
  questioner: {
    name: 'Questioner',
    description: 'Asks lots of questions to understand how things work',
    icon: '❓',
  },
  story_dreamer: {
    name: 'Story Dreamer',
    description: 'Loves imagining stories and creative worlds',
    icon: '✨',
  },
};

export function getLearningStyleDisplay(code: string | null) {
  if (!code) return null;
  return LEARNING_STYLE_DISPLAY[code as keyof typeof LEARNING_STYLE_DISPLAY] || null;
}

export function getBehaviourTendencyDisplay(code: string | null) {
  if (!code) return null;
  return BEHAVIOUR_TENDENCY_DISPLAY[code as keyof typeof BEHAVIOUR_TENDENCY_DISPLAY] || null;
}

export function getCuriosityTypeDisplay(code: string | null) {
  if (!code) return null;
  return CURIOSITY_TYPE_DISPLAY[code as keyof typeof CURIOSITY_TYPE_DISPLAY] || null;
}
