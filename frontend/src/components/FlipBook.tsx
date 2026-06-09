import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import type { GeneratedChapter } from '../types/models';
import { InteractiveQuestion, type InteractiveQuestionData } from './InteractiveQuestion';
import { getChapterQuestions, convertToInteractiveQuestion, saveUserChapterResponse } from '../services/chapterQuestionService';
import { updatePersonaProfileWithInsights, shouldRefreshRecommendations } from '../services/personaInsightsService';
import { getRecommendationsForStudent } from '../services/recommendationService';

declare global {
  interface Window {
    jQuery: any;
    $: any;
  }
}

interface FlipBookProps {
  chapter: GeneratedChapter;
  onTurning?: (pageNumber: number) => boolean;
  onTurned?: (pageNumber: number) => void;
  width?: number;
  height?: number;
  userId?: string;
  geniusProfileId?: string;
}

export interface FlipBookRef {
  next: () => void;
  prev: () => void;
  goTo: (pageNumber: number) => void;
  getCurrentPage: () => number;
}

export const FlipBook = forwardRef<FlipBookRef, FlipBookProps>(
  ({ chapter, onTurning, onTurned, width = 900, height = 600, userId, geniusProfileId }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);
    const [questions, setQuestions] = useState<InteractiveQuestionData[]>([]);
    const [answeredCount, setAnsweredCount] = useState(0);

    useImperativeHandle(ref, () => ({
      next: () => {
        if (window.$ && containerRef.current && window.$.fn && window.$.fn.turn) {
          try {
            window.$(containerRef.current).turn('next');
          } catch (e) {
            console.warn('Turn.js not ready:', e);
          }
        }
      },
      prev: () => {
        if (window.$ && containerRef.current && window.$.fn && window.$.fn.turn) {
          try {
            window.$(containerRef.current).turn('previous');
          } catch (e) {
            console.warn('Turn.js not ready:', e);
          }
        }
      },
      goTo: (pageNumber: number) => {
        if (window.$ && containerRef.current && window.$.fn && window.$.fn.turn) {
          try {
            window.$(containerRef.current).turn('page', pageNumber);
          } catch (e) {
            console.warn('Turn.js not ready:', e);
          }
        }
      },
      getCurrentPage: () => {
        if (window.$ && containerRef.current && window.$.fn && window.$.fn.turn) {
          try {
            return window.$(containerRef.current).turn('page');
          } catch (e) {
            console.warn('Turn.js not ready:', e);
          }
        }
        return 1;
      },
    }));

    useEffect(() => {
      const loadQuestions = async () => {
        if (!chapter.chapterId) return;

        const chapterQuestions = await getChapterQuestions(chapter.chapterId);
        const interactiveQuestions = chapterQuestions
          .map(q => convertToInteractiveQuestion(q))
          .filter((q): q is InteractiveQuestionData => q !== null);

        setQuestions(interactiveQuestions);
      };

      loadQuestions();
    }, [chapter.chapterId]);

    const handleQuestionAnswer = async (questionId: string, correct: boolean) => {
      if (!userId) return;

      const questionIndex = questions.findIndex(q => q.id === questionId);
      if (questionIndex === -1) return;

      const questionNumber = questionIndex + 1;

      const saved = await saveUserChapterResponse(
        userId,
        chapter.chapterId,
        questionNumber,
        undefined,
        'answered'
      );

      if (saved) {
        const newAnsweredCount = answeredCount + 1;
        setAnsweredCount(newAnsweredCount);

        if (geniusProfileId && newAnsweredCount % 3 === 0) {
          await updatePersonaProfileWithInsights(geniusProfileId, chapter.chapterId);

          const shouldRefresh = await shouldRefreshRecommendations(geniusProfileId, chapter.chapterId);
          if (shouldRefresh) {
            await getRecommendationsForStudent(geniusProfileId, true);
          }
        }
      }
    };

    const totalStoryPages = chapter.pages.length;
    const questionInterval = Math.floor(totalStoryPages / (questions.length + 1));

    const shouldShowQuestionAfterPage = (pageIndex: number): InteractiveQuestionData | null => {
      if (questions.length === 0) return null;

      const questionIndex = Math.floor((pageIndex + 1) / questionInterval) - 1;

      if (questionIndex >= 0 && questionIndex < questions.length) {
        const expectedPageIndex = (questionIndex + 1) * questionInterval - 1;
        if (pageIndex === expectedPageIndex) {
          return questions[questionIndex];
        }
      }

      return null;
    };

    useEffect(() => {
      if (!containerRef.current || isInitialized.current) {
        return;
      }

      const initTurnJs = () => {
        if (!window.$ || !window.$.fn || !window.$.fn.turn) {
          return false;
        }

        const container = containerRef.current;
        if (!container) return false;

        // Check if we have children rendered
        const childCount = container.children.length;
        if (childCount === 0) {
          return false;
        }

        const $flipbook = window.$(container);

        try {
          // Check if turn is already initialized
          if ($flipbook.data().pages) {
            return true;
          }

          // Simple initialization like the reference
          $flipbook.turn({
            width: width,
            height: height,
            autoCenter: true,
          });

          $flipbook.bind('turning', (event: any, page: number) => {
            if (onTurning) {
              const canTurn = onTurning(page);
              if (!canTurn) {
                event.preventDefault();
              }
            }
          });

          $flipbook.bind('turned', (event: any, page: number) => {
            if (onTurned) {
              onTurned(page);
            }
          });

          isInitialized.current = true;
          return true;
        } catch (e) {
          console.error('Error initializing Turn.js:', e);
          return false;
        }
      };

      // Wait a bit for React to render all children
      const timeout = setTimeout(() => {
        const checkInterval = setInterval(() => {
          if (initTurnJs()) {
            clearInterval(checkInterval);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
        }, 5000);
      }, 300);

      return () => {
        clearTimeout(timeout);
        if (window.$ && containerRef.current && window.$.fn && window.$.fn.turn) {
          try {
            const $flipbook = window.$(containerRef.current);
            if ($flipbook.data().pages) {
              $flipbook.turn('destroy');
            }
          } catch (e) {
            console.warn('Error destroying Turn.js:', e);
          }
        }
        isInitialized.current = false;
      };
    }, [width, height, onTurning, onTurned, chapter]);

    return (
      <div
        ref={containerRef}
        className="flipbook"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          margin: '0 auto',
        }}
      >
        <div className="hard page-cover" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '40px',
          color: 'white',
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>📖</div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '10px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          }}>
            {chapter.cover.title}
          </h1>
          <div style={{
            width: '100px',
            height: '4px',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '2px',
          }} />
        </div>

        <div className="hard" style={{ background: '#f8f8f8' }}></div>

        {chapter.pages.map((page, index) => {
          const questionToShow = shouldShowQuestionAfterPage(index);

          return (
            <div key={index}>
              <div className="storybook-page">
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  padding: '30px',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    flex: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    background: '#f9f9f9',
                  }}>
                    {page.upload?.imageUrl ? (
                      <img
                        src={page.upload.imageUrl}
                        alt={page.title}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '80px',
                        opacity: 0.3,
                      }}>🎨</div>
                    )}
                  </div>

                  <div style={{
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.02))',
                    borderRadius: '8px',
                    padding: '15px',
                  }}>
                    <p style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#555',
                      lineHeight: '1.5',
                      margin: '0 0 8px 0',
                      fontFamily: 'Georgia, serif',
                    }}>
                      {page.title}
                    </p>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '400',
                      color: '#666',
                      lineHeight: '1.6',
                      margin: '0 0 8px 0',
                      fontFamily: 'Georgia, serif',
                      fontStyle: 'italic',
                    }}>
                      {page.text}
                    </p>
                    <div style={{
                      fontSize: '11px',
                      color: '#999',
                      marginTop: '4px',
                      fontWeight: '500',
                    }}>
                      Page {index + 1}
                    </div>
                  </div>
                </div>
              </div>

              {questionToShow && (
                <div className="storybook-page">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: '30px',
                    boxSizing: 'border-box',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(236, 72, 153, 0.05))',
                  }}>
                    <InteractiveQuestion
                      question={questionToShow}
                      onAnswer={(correct) => handleQuestionAnswer(questionToShow.id, correct)}
                      onComplete={() => {}}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="hard" style={{ background: '#f8f8f8' }}></div>

        <div className="hard page-cover" style={{
          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '40px',
          color: 'white',
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎓</div>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          }}>
            The End
          </h2>
        </div>
      </div>
    );
  }
);

FlipBook.displayName = 'FlipBook';
