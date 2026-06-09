export interface PersonaQuestion {
  id: string;
  question: string;
  options: {
    label: 'A' | 'B' | 'C' | 'D';
    text: string;
    traitImpacts: {
      learning_style?: 'visual' | 'handson' | 'verbal' | 'logical';
      behaviour_tendency?: 'initiator' | 'thinker' | 'observer' | 'feeler';
      curiosity_type?: 'explorer' | 'builder' | 'questioner' | 'story_dreamer';
    };
  }[];
}

export const PERSONA_QUESTIONS: PersonaQuestion[] = [
  {
    id: 'q1',
    question: 'How do you like to start your day?',
    options: [
      {
        label: 'A',
        text: 'I like to look around and see what\'s happening',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'I like doing something with my hands',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'I like talking or humming',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'I like reading or thinking quietly',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q2',
    question: 'When you see something new, what do you do first?',
    options: [
      {
        label: 'A',
        text: 'Try it immediately',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Look at it carefully',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Ask someone',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Wait and feel how I feel',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q3',
    question: 'What makes you want to explore?',
    options: [
      {
        label: 'A',
        text: 'Going to new places',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Building things',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Asking "why?"',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Imagining stories',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q4',
    question: 'What helps you learn best?',
    options: [
      {
        label: 'A',
        text: 'Watching videos',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'Doing activities',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Listening to explanation',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'Solving puzzles',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q5',
    question: 'When you have a problem, what do you do?',
    options: [
      {
        label: 'A',
        text: 'Start immediately',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Think first',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Ask for guidance',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Follow feelings',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q6',
    question: 'What do you like to do for fun?',
    options: [
      {
        label: 'A',
        text: 'Go to new places',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Fix or make things',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Ask many questions',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Create stories',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q7',
    question: 'How do you remember things?',
    options: [
      {
        label: 'A',
        text: 'Look at pictures',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'Touch and try',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Listen and repeat',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'Count or sort',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q8',
    question: 'When playing with friends, you usually...',
    options: [
      {
        label: 'A',
        text: 'Lead friends',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Solve calmly',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Watch others first',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Care about feelings',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q9',
    question: 'What kind of play do you enjoy most?',
    options: [
      {
        label: 'A',
        text: 'Adventure',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Construction toys',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Mystery puzzles',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Fantasy stories',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q10',
    question: 'When you have an idea, you...',
    options: [
      {
        label: 'A',
        text: 'Draw what I see',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'Build something',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Tell someone',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'Plan steps',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q11',
    question: 'When something is hard, you...',
    options: [
      {
        label: 'A',
        text: 'Take charge',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Think deeply',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Check around me',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'See how everyone feels',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q12',
    question: 'What interests you most?',
    options: [
      {
        label: 'A',
        text: 'Explore outside',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Create devices',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Ask questions',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Imagine scenes',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q13',
    question: 'How do you like to learn new things?',
    options: [
      {
        label: 'A',
        text: 'Learn from pictures',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'Learn by doing',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Learn by listening',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'Learn by patterns',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q14',
    question: 'When you need to decide something, you...',
    options: [
      {
        label: 'A',
        text: 'Act first',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Think before acting',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Watch others',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Follow emotions',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q15',
    question: 'What sounds most exciting?',
    options: [
      {
        label: 'A',
        text: 'Outdoor quest',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Lego/building',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Why-things-work',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Magic story',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q16',
    question: 'When you want to show someone your idea, you...',
    options: [
      {
        label: 'A',
        text: 'Show them pictures or drawings',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'Make something to show',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Talk and explain',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'Write it down step by step',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q17',
    question: 'What kind of books or shows do you like?',
    options: [
      {
        label: 'A',
        text: 'Ones with lots of pictures',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'Ones where I can try things',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Ones people read to me',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'Ones with mysteries to solve',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q18',
    question: 'In class, you learn best when...',
    options: [
      {
        label: 'A',
        text: 'Teacher shows pictures or videos',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'You can touch and do activities',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Teacher talks and explains',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'You can work on problems',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q19',
    question: 'When you finish homework, you like to...',
    options: [
      {
        label: 'A',
        text: 'Look at colorful books or screens',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'Play with toys or craft',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Talk to family or friends',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'Read or solve puzzles',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q20',
    question: 'What helps you understand better?',
    options: [
      {
        label: 'A',
        text: 'Seeing colorful charts or maps',
        traitImpacts: { learning_style: 'visual' },
      },
      {
        label: 'B',
        text: 'Trying it myself',
        traitImpacts: { learning_style: 'handson' },
      },
      {
        label: 'C',
        text: 'Someone explaining it',
        traitImpacts: { learning_style: 'verbal' },
      },
      {
        label: 'D',
        text: 'Reading instructions',
        traitImpacts: { learning_style: 'logical' },
      },
    ],
  },
  {
    id: 'q21',
    question: 'How do you feel about trying new activities?',
    options: [
      {
        label: 'A',
        text: 'Jump right in',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Think about it first',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Watch how others do it',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Check if it feels right',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q22',
    question: 'When working on a project, you...',
    options: [
      {
        label: 'A',
        text: 'Start working right away',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Make a plan first',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Look at examples first',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Think about what you enjoy',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q23',
    question: 'When someone asks your opinion, you...',
    options: [
      {
        label: 'A',
        text: 'Say what you think right away',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Think carefully before answering',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Ask what others think',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Share how you feel',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q24',
    question: 'When you meet new people, you...',
    options: [
      {
        label: 'A',
        text: 'Say hello first',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Wait to see what they\'re like',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Watch and listen',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Wait until you feel comfortable',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q25',
    question: 'When something goes wrong, you...',
    options: [
      {
        label: 'A',
        text: 'Try to fix it quickly',
        traitImpacts: { behaviour_tendency: 'initiator' },
      },
      {
        label: 'B',
        text: 'Figure out what happened',
        traitImpacts: { behaviour_tendency: 'thinker' },
      },
      {
        label: 'C',
        text: 'Ask for help',
        traitImpacts: { behaviour_tendency: 'observer' },
      },
      {
        label: 'D',
        text: 'Take a moment to feel better',
        traitImpacts: { behaviour_tendency: 'feeler' },
      },
    ],
  },
  {
    id: 'q26',
    question: 'What would you rather do on a weekend?',
    options: [
      {
        label: 'A',
        text: 'Go somewhere new',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Build or create something',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Learn about a new topic',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Play pretend games',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q27',
    question: 'On a rainy day, you prefer to...',
    options: [
      {
        label: 'A',
        text: 'Look out the window and watch',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Build with blocks or Lego',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Read about interesting topics',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Make up stories or draw',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q28',
    question: 'What makes you happiest?',
    options: [
      {
        label: 'A',
        text: 'Finding new places',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Making something work',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Learning something new',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Creating a story',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q29',
    question: 'What kind of books or shows do you like?',
    options: [
      {
        label: 'A',
        text: 'Travel and adventure',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'Building and making',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Science and discovery',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'Fantasy and imagination',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
  {
    id: 'q30',
    question: 'What makes you most curious?',
    options: [
      {
        label: 'A',
        text: 'Places you haven\'t been',
        traitImpacts: { curiosity_type: 'explorer' },
      },
      {
        label: 'B',
        text: 'How things are made',
        traitImpacts: { curiosity_type: 'builder' },
      },
      {
        label: 'C',
        text: 'Why things happen',
        traitImpacts: { curiosity_type: 'questioner' },
      },
      {
        label: 'D',
        text: 'What could be imagined',
        traitImpacts: { curiosity_type: 'story_dreamer' },
      },
    ],
  },
];

export function selectRandomQuestions(count: number = 8): PersonaQuestion[] {
  const categorized = {
    learning_style: [] as PersonaQuestion[],
    behaviour_tendency: [] as PersonaQuestion[],
    curiosity_type: [] as PersonaQuestion[],
  };

  const getCategory = (question: PersonaQuestion) => {
    for (const option of question.options) {
      if (option.traitImpacts.learning_style) return 'learning_style';
      if (option.traitImpacts.behaviour_tendency) return 'behaviour_tendency';
      if (option.traitImpacts.curiosity_type) return 'curiosity_type';
    }
    return 'learning_style';
  };

  PERSONA_QUESTIONS.forEach((question) => {
    categorized[getCategory(question)].push(question);
  });

  const categories = Object.keys(categorized) as Array<keyof typeof categorized>;
  const perCategory = Math.floor(count / categories.length);
  let remainder = count - perCategory * categories.length;

  const selected: PersonaQuestion[] = [];
  const used = new Set<string>();

  categories.forEach((category) => {
    const pool = [...categorized[category]].sort(() => Math.random() - 0.5);
    const take = perCategory + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    pool.slice(0, take).forEach((q) => {
      selected.push(q);
      used.add(q.id);
    });
  });

  if (selected.length < count) {
    const remaining = PERSONA_QUESTIONS.filter((q) => !used.has(q.id)).sort(() => Math.random() - 0.5);
    selected.push(...remaining.slice(0, count - selected.length));
  }

  return selected.sort(() => Math.random() - 0.5);
}
