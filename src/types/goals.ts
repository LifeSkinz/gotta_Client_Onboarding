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

export const GOALS: Goal[] = [
  {
    id: 'health-fitness',
    title: 'Health & Fitness',
    description: 'Transform your physical wellbeing and build lasting healthy habits',
    icon: '💪',
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
  ]
};

export const MOTIVATIONAL_QUOTES = {
  'health-fitness': "The groundwork for all happiness is good health. - Leigh Hunt",
  'career-development': "Success is where preparation and opportunity meet. - Bobby Unser",
  'personal-growth': "The journey of a thousand miles begins with a single step. - Lao Tzu",
  'relationships': "The quality of your life is the quality of your relationships. - Tony Robbins",
  'financial-stability': "It's not how much money you make, but how much money you keep. - Robert Kiyosaki"
};