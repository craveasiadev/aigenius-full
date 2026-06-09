import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Brain, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

interface Question {
  id: string;
  question: string;
  options: string[];
}

const getQuestionsForAge = (age: number, gender: string): Question[] => {
  // Age 5-7 questions
  if (age >= 5 && age <= 7) {
    return [
      {
        id: '1',
        question: `What does ${gender === 'male' ? 'he' : gender === 'female' ? 'she' : 'they'} enjoy doing most in free time?`,
        options: ['Drawing and coloring', 'Playing with toys', 'Watching videos', 'Playing outside'],
      },
      {
        id: '2',
        question: 'Which activity makes them most excited?',
        options: ['Building with blocks', 'Reading stories', 'Singing and dancing', 'Playing sports'],
      },
      {
        id: '3',
        question: 'What kind of stories do they like best?',
        options: ['Adventure stories', 'Animal stories', 'Fairy tales', 'Science stories'],
      },
      {
        id: '4',
        question: 'How do they like to learn new things?',
        options: ['By watching', 'By doing', 'By listening', 'By playing games'],
      },
      {
        id: '5',
        question: 'What do they talk about the most?',
        options: ['Animals and nature', 'Superheroes', 'Family and friends', 'Space and planets'],
      },
      {
        id: '6',
        question: 'Which toy would they choose?',
        options: ['Art supplies', 'Building blocks', 'Musical instruments', 'Sports equipment'],
      },
      {
        id: '7',
        question: 'How do they react to challenges?',
        options: ['Keep trying', 'Ask for help', 'Get frustrated', 'Try different ways'],
      },
      {
        id: '8',
        question: 'What makes them feel proud?',
        options: ['Finishing a project', 'Making others happy', 'Learning something new', 'Winning games'],
      },
      {
        id: '9',
        question: 'Who do they want to be like?',
        options: ['A teacher', 'An artist', 'A scientist', 'An athlete'],
      },
      {
        id: '10',
        question: 'What would be their perfect day?',
        options: ['Creating art', 'Playing with friends', 'Exploring nature', 'Learning new things'],
      },
    ];
  }

  // Age 8-10 questions
  if (age >= 8 && age <= 10) {
    return [
      {
        id: '1',
        question: 'What subject interests them the most?',
        options: ['Science and experiments', 'Art and creativity', 'Math and puzzles', 'Reading and writing'],
      },
      {
        id: '2',
        question: 'How do they prefer to spend weekends?',
        options: ['Doing hobbies', 'Playing with friends', 'Learning new skills', 'Playing video games'],
      },
      {
        id: '3',
        question: 'What motivates them to try harder?',
        options: ['Personal goals', 'Making parents proud', 'Competing with others', 'Curiosity'],
      },
      {
        id: '4',
        question: 'Which career sounds most interesting to them?',
        options: ['Engineer or inventor', 'Artist or designer', 'Teacher or doctor', 'Athlete or musician'],
      },
      {
        id: '5',
        question: 'How do they solve problems?',
        options: ['Think it through alone', 'Ask for advice', 'Try different solutions', 'Research online'],
      },
      {
        id: '6',
        question: 'What kind of projects do they enjoy?',
        options: ['Building things', 'Creating art', 'Writing stories', 'Organizing events'],
      },
      {
        id: '7',
        question: 'How do they work in group settings?',
        options: ['Natural leader', 'Supportive team member', 'Prefer working alone', 'Ideas contributor'],
      },
      {
        id: '8',
        question: 'What do they value most?',
        options: ['Achievement', 'Creativity', 'Helping others', 'Having fun'],
      },
      {
        id: '9',
        question: 'Which activity would they choose for a school project?',
        options: ['Science experiment', 'Art presentation', 'Written report', 'Video creation'],
      },
      {
        id: '10',
        question: 'What makes learning enjoyable for them?',
        options: ['Hands-on activities', 'Interactive discussions', 'Visual demonstrations', 'Competition and games'],
      },
    ];
  }

  // Age 11-12 questions
  return [
    {
      id: '1',
      question: 'What are their long-term aspirations?',
      options: ['STEM career', 'Creative profession', 'Social impact work', 'Business or entrepreneurship'],
    },
    {
      id: '2',
      question: 'How do they approach complex problems?',
      options: ['Analytical thinking', 'Creative solutions', 'Seeking mentorship', 'Trial and error'],
    },
    {
      id: '3',
      question: 'What drives their motivation?',
      options: ['Personal achievement', 'Making a difference', 'Recognition', 'Learning and growth'],
    },
    {
      id: '4',
      question: 'Which extracurricular would they choose?',
      options: ['Robotics or coding', 'Art or music', 'Debate or journalism', 'Sports or dance'],
    },
    {
      id: '5',
      question: 'How do they handle failure?',
      options: ['Learn and improve', 'Need encouragement', 'Bounce back quickly', 'Analyze what went wrong'],
    },
    {
      id: '6',
      question: 'What type of content do they consume?',
      options: ['Educational videos', 'Creative content', 'News and current events', 'Entertainment'],
    },
    {
      id: '7',
      question: 'What leadership style do they show?',
      options: ['Organized planner', 'Inspiring motivator', 'Collaborative coordinator', 'Independent worker'],
    },
    {
      id: '8',
      question: 'Which skill do they want to develop?',
      options: ['Technology and coding', 'Art and design', 'Communication', 'Critical thinking'],
    },
    {
      id: '9',
      question: 'What social causes interest them?',
      options: ['Environment', 'Education', 'Technology access', 'Arts and culture'],
    },
    {
      id: '10',
      question: 'How do they envision their future?',
      options: ['Innovating and creating', 'Leading and inspiring', 'Teaching and mentoring', 'Exploring and discovering'],
    },
  ];
};

export const GeniusAssessment = () => {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();

  const [profile, setProfile] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const loadProfile = async () => {
    if (!profileId) return;

    try {
      // Fetch all profiles for this parent and find the one we need
      // This uses the parent's Sanctum auth token
      const response = await api.get<{
        success: boolean;
        profiles: any[];
      }>('/aipreneur/profiles');

      if (!response.success || !response.profiles) {
        console.error('Error loading profiles');
        navigate('/parent/genius-profiles');
        return;
      }

      // Find the specific profile by ID
      const data = response.profiles.find(p => p.id === profileId);

      if (!data) {
        console.error('Profile not found');
        navigate('/parent/genius-profiles');
        return;
      }

      setProfile(data);

      // Calculate age
      const birthDate = new Date(data.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Load age-appropriate questions
      const ageQuestions = getQuestionsForAge(age, data.gender || 'neutral');
      setQuestions(ageQuestions);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      navigate('/parent/genius-profiles');
    }
  };

  const handleAnswer = (answer: string) => {
    setAnswers({
      ...answers,
      [questions[currentQuestionIndex].id]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      // Save quiz to backend
      await api.post(`/aipreneur/profiles/${profile.id}/persona-quiz`, {
        answers,
        completed_at: new Date().toISOString(),
      });

      // Clear local storage backup if any
      localStorage.removeItem(`quiz_${profile.id}`);

      // Navigate to success or back to profiles
      navigate('/parent/genius-profiles');
    } catch (error) {
      console.error('Error saving quiz:', error);
      // Fallback to local storage if API fails (optional, but good for offline)
      const quizData = {
        genius_id: profile.id,
        answers,
        completed_at: new Date().toISOString(),
      };
      localStorage.setItem(`quiz_${profile.id}`, JSON.stringify(quizData));

      alert('Network error. Progress saved locally. Please try again later.');
      navigate('/parent/genius-profiles');
    } finally {
      setLoading(false);
    }
  };


  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestion?.id];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allQuestionsAnswered = questions.every(q => answers[q.id]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'white' }}>Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '50%', right: '20%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <header className="sticky top-0 z-50" style={{ background: 'rgba(10, 10, 26, 0.7)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.6))' }}>
              <Brain className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold" style={{ color: 'white' }}>
                Assessment for {profile.genius_name}
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-2" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="h-full"
          style={{ background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.8), rgba(236, 72, 153, 0.8))' }}
        />
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-12" style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl p-8 md:p-12"
            style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className="mb-8">
              <div className="text-sm font-semibold mb-4" style={{ color: 'rgba(167, 139, 250, 0.8)' }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'white' }}>
                {currentQuestion.question}
              </h2>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Select the option that best describes {profile.genius_name}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(option)}
                  className="w-full p-6 rounded-2xl text-left transition-all text-white"
                  style={selectedAnswer === option
                    ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.6))', boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)', border: '1px solid rgba(139, 92, 246, 0.4)' }
                    : { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={selectedAnswer === option
                        ? { background: 'rgba(255, 255, 255, 0.2)' }
                        : { background: 'rgba(255, 255, 255, 0.06)' }
                      }
                    >
                      {selectedAnswer === option ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="font-bold text-white">{String.fromCharCode(65 + index)}</span>
                      )}
                    </div>
                    <span className="text-lg font-semibold flex-1">{option}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${currentQuestionIndex === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                  }`}
                style={{ color: 'white', background: currentQuestionIndex === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.04)' }}
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </button>

              {isLastQuestion ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={!allQuestionsAnswered}
                  className="px-8 py-4 rounded-xl font-bold text-white flex items-center gap-2"
                  style={allQuestionsAnswered
                    ? { background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }
                    : { background: 'rgba(255, 255, 255, 0.1)', cursor: 'not-allowed', opacity: 0.5 }
                  }
                >
                  Complete Assessment
                  <CheckCircle className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  disabled={!selectedAnswer}
                  className="px-8 py-4 rounded-xl font-bold text-white flex items-center gap-2"
                  style={selectedAnswer
                    ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
                    : { background: 'rgba(255, 255, 255, 0.1)', cursor: 'not-allowed', opacity: 0.5 }
                  }
                >
                  Next Question
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Question Navigation Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className="h-3 rounded-full transition-all"
              style={index === currentQuestionIndex
                ? { background: 'rgba(139, 92, 246, 0.8)', width: '2rem' }
                : answers[questions[index].id]
                  ? { background: 'rgba(34, 197, 94, 0.6)', width: '0.75rem' }
                  : { background: 'rgba(255, 255, 255, 0.15)', width: '0.75rem' }
              }
            />
          ))}
        </div>
      </main>
    </div>
  );
};
