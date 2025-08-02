export interface Goal {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'open-ended';
  question: string;
  options?: string[];
  placeholder?: string;
}

export interface GoalQuestions {
  [goalId: string]: Question[];
}

export interface UserResponse {
  questionId: string;
  answer: string;
}

export interface UserGoalData {
  selectedGoal: Goal;
  responses: UserResponse[];
}

export interface PersonalityQuestion {
  id: string;
  question: string;
  description: string;
}

export interface PersonalityResponse {
  questionId: string;
  rating: number; // 1-5 scale
}

export interface PersonalityProfile {
  responses: PersonalityResponse[];
  completed: boolean;
}

export const GOALS: Goal[] = [
  {
    id: 'health-fitness',
    title: 'Health & Fitness',
    description: 'Transform your physical wellbeing and build lasting healthy habits',
    icon: '🏋️',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'career-development',
    title: 'Career Development',
    description: 'Advance your professional journey and unlock new opportunities',
    icon: '🚀',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'personal-growth',
    title: 'Personal Growth',
    description: 'Develop yourself mentally, emotionally, and spiritually',
    icon: '🌱',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'relationships',
    title: 'Relationships',
    description: 'Build stronger connections and improve communication',
    icon: '❤️',
    color: 'from-rose-500 to-orange-500'
  },
  {
    id: 'financial-stability',
    title: 'Financial Stability',
    description: 'Take control of your finances and secure your future',
    icon: '💰',
    color: 'from-yellow-500 to-green-500'
  },
  {
    id: 'creativity-hobbies',
    title: 'Creativity & Hobbies',
    description: 'Creating time to explore value through creative pursuits',
    icon: '🎨',
    color: 'from-violet-500 to-purple-500'
  }
];

export const GOAL_QUESTIONS: GoalQuestions = {
  'health-fitness': [
    {
      id: 'fitness-level',
      type: 'multiple-choice',
      question: 'How would you rate your current fitness level?',
      options: ['Beginner - Just starting my fitness journey', 'Intermediate - I exercise regularly but want to improve', 'Advanced - I have a solid fitness routine']
    },
    {
      id: 'main-goal',
      type: 'open-ended',
      question: 'What is your main fitness goal?',
      placeholder: 'e.g., Lose 20 pounds, Run a 5K, Build muscle...'
    },
    {
      id: 'health-conditions',
      type: 'open-ended',
      question: 'Do you have any health conditions or injuries that might affect your progress?',
      placeholder: 'Please describe any relevant health considerations...'
    },
    {
      id: 'motivation',
      type: 'open-ended',
      question: 'What motivates you most to achieve this health goal?',
      placeholder: 'Share what drives you to make this change...'
    }
  ],
  'career-development': [
    {
      id: 'current-position',
      type: 'open-ended',
      question: 'What is your current job title and industry?',
      placeholder: 'e.g., Software Developer in Tech, Teacher in Education...'
    },
    {
      id: 'target-position',
      type: 'open-ended',
      question: 'What position or career path are you aiming for?',
      placeholder: 'Describe your ideal next career step...'
    },
    {
      id: 'skills-development',
      type: 'open-ended',
      question: 'What skills do you want to develop to reach this goal?',
      placeholder: 'List the key skills you need to grow...'
    },
    {
      id: 'current-challenges',
      type: 'open-ended',
      question: 'What challenges are you currently facing in your career?',
      placeholder: 'Share the obstacles you want to overcome...'
    }
  ],
  'personal-growth': [
    {
      id: 'skills-development',
      type: 'open-ended',
      question: 'What specific skills or knowledge do you want to develop?',
      placeholder: 'Describe the skills you want to build or knowledge you want to gain...'
    },
    {
      id: 'ideal-self',
      type: 'open-ended',
      question: 'How do you envision your ideal self in terms of personal qualities or behaviors?',
      placeholder: 'Share your vision of who you want to become...'
    },
    {
      id: 'limiting-habits',
      type: 'open-ended',
      question: 'What habits or mindsets do you believe are holding you back from personal growth?',
      placeholder: 'Identify what you need to change or overcome...'
    },
    {
      id: 'progress-measurement',
      type: 'open-ended',
      question: 'How do you plan to measure your progress in personal development?',
      placeholder: 'Describe how you will track your growth and success...'
    }
  ],
  'relationships': [
    {
      id: 'relationship-improvements',
      type: 'open-ended',
      question: 'What aspects of your current relationships do you want to improve or change?',
      placeholder: 'Share what you would like to see improve in your relationships...'
    },
    {
      id: 'communication-effectiveness',
      type: 'open-ended',
      question: 'How effectively do you communicate your needs and boundaries to others?',
      placeholder: 'Reflect on your communication style and effectiveness...'
    },
    {
      id: 'conflict-resolution',
      type: 'open-ended',
      question: 'What strategies do you use to resolve conflicts in your relationships?',
      placeholder: 'Describe your approach to handling disagreements...'
    },
    {
      id: 'showing-appreciation',
      type: 'open-ended',
      question: 'How do you show appreciation and support to the people in your life?',
      placeholder: 'Share how you express care and support for others...'
    }
  ],
  'financial-stability': [
    {
      id: 'financial-goals',
      type: 'open-ended',
      question: 'What are your short-term and long-term financial goals?',
      placeholder: 'Describe your financial objectives for the next few years...'
    },
    {
      id: 'money-management',
      type: 'open-ended',
      question: 'How do you currently manage your income and expenses?',
      placeholder: 'Share your current approach to budgeting and spending...'
    },
    {
      id: 'savings-strategy',
      type: 'open-ended',
      question: 'How are you building your emergency fund or savings?',
      placeholder: 'Describe your saving habits and strategies...'
    },
    {
      id: 'wealth-building',
      type: 'open-ended',
      question: 'How do you approach investing or growing your wealth?',
      placeholder: 'Share your investment philosophy and approach...'
    }
  ],
  'creativity-hobbies': [
    {
      id: 'creative-interests',
      type: 'multiple-choice',
      question: 'What type of creative activities interest you most?',
      options: ['Visual Arts (painting, drawing, photography)', 'Performing Arts (music, dance, theater)', 'Crafts & DIY (woodworking, pottery, sewing)', 'Writing & Literature (creative writing, poetry)']
    },
    {
      id: 'time-availability',
      type: 'open-ended',
      question: 'How much time can you realistically dedicate to creative pursuits each week?',
      placeholder: 'e.g., 2-3 hours on weekends, 30 minutes daily...'
    },
    {
      id: 'creative-goals',
      type: 'open-ended',
      question: 'What would you like to create or accomplish through your hobby?',
      placeholder: 'Describe your creative aspirations and what success looks like...'
    },
    {
      id: 'current-barriers',
      type: 'open-ended',
      question: 'What currently prevents you from pursuing your creative interests?',
      placeholder: 'Share the obstacles that keep you from being creative...'
    }
  ],
  'custom': [
    {
      id: 'custom-timeline',
      type: 'multiple-choice',
      question: 'What timeframe do you have in mind for achieving this goal?',
      options: ['1-3 months', '3-6 months', '6-12 months', 'More than a year']
    },
    {
      id: 'custom-motivation',
      type: 'open-ended',
      question: 'What motivates you most to achieve this goal?',
      placeholder: 'Describe what drives you and why this goal matters to you...'
    },
    {
      id: 'custom-obstacles',
      type: 'open-ended',
      question: 'What challenges or obstacles do you anticipate?',
      placeholder: 'Share any concerns or roadblocks you expect to face...'
    },
    {
      id: 'custom-support',
      type: 'multiple-choice',
      question: 'What type of support would be most helpful?',
      options: ['Regular check-ins and accountability', 'Strategic planning and goal setting', 'Skill development and learning', 'Emotional support and motivation']
    }
  ]
};

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: 'visual-learning',
    question: 'I learn best when I can see visual representations of concepts.',
    description: 'Assesses preference for visual learning (e.g., diagrams, videos), helping match with coaches who use visual tools effectively.'
  },
  {
    id: 'structured-approach',
    question: 'I prefer a structured approach with clear goals and milestones.',
    description: 'Gauges the need for structure versus flexibility, aligning with coaches who offer organized or adaptable styles.'
  },
  {
    id: 'result-motivated',
    question: 'I am motivated more by the end result than the learning process itself.',
    description: 'Determines if the client is goal-driven or process-oriented, aiding in pairing with coaches who emphasize outcomes or journey.'
  },
  {
    id: 'challenge-persistence',
    question: 'When faced with challenges, I tend to persist and find solutions.',
    description: 'Measures resilience and problem-solving attitude, connecting clients to coaches with relevant overcoming-experience.'
  },
  {
    id: 'direct-feedback',
    question: 'I appreciate direct and honest feedback, even if it\'s tough to hear.',
    description: 'Reveals openness to constructive criticism, matching with coaches who provide direct or supportive feedback styles.'
  }
];

export const MOTIVATIONAL_QUOTES = {
  'health-fitness': "The groundwork for all happiness is good health. - Leigh Hunt",
  'career-development': "Success is where preparation and opportunity meet. - Bobby Unser",
  'personal-growth': "The journey of a thousand miles begins with a single step. - Lao Tzu",
  'relationships': "The quality of your life is the quality of your relationships. - Tony Robbins",
  'financial-stability': "It's not how much money you make, but how much money you keep. - Robert Kiyosaki",
  'creativity-hobbies': "Creativity takes courage. - Henri Matisse",
  'custom': "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt"
};