import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Camera, Upload, ChevronRight, ChevronLeft, BookOpen, Award, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTokenUsage } from '../contexts/TokenUsageContext';
import { getStorySession, updateStorySession, generateBackcover, generateStorybookPageImage } from '../services/storyGenerationService';
import { ImageGeneratingLoader } from '../components/ImageGeneratingLoader';
import { ImageGenerationSuccess } from '../components/ImageGenerationSuccess';
import { supabase } from '../lib/supabase';
import type { StorySession, StoryPage } from '../types/story';

type FlowStep = 'title-select' | 'cover-create' | 'page-flow' | 'backcover';
type PageStep = 'intro' | 'activity' | 'result';

export const StorybookCreate = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateFromDelta } = useTokenUsage();

  const sessionId = searchParams.get('session_id');

  const [geniusProfile, setGeniusProfile] = useState<any>(null);
  const [storySession, setStorySession] = useState<StorySession | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>('title-select');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageStep, setPageStep] = useState<PageStep>('intro');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [pagePhotos, setPagePhotos] = useState<Record<number, string>>({});
  const [pagePhotosBase64, setPagePhotosBase64] = useState<Record<number, string>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [completedPages, setCompletedPages] = useState<Set<number>>(new Set([]));
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingBackcover, setIsGeneratingBackcover] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generatingImageForPage, setGeneratingImageForPage] = useState<number | null>(null);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadGeniusProfile();
    }
  }, [currentUser]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    } else {
      navigate('/s/create');
    }
  }, [sessionId]);

  const loadGeniusProfile = async () => {
    if (!currentUser) return;

    try {
      const { data } = await supabase
        .from('genius_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      setGeniusProfile(data);
      console.log('✅ Genius profile loaded:', data?.id);
    } catch (error) {
      console.error('❌ Error loading genius profile:', error);
    }
  };

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      const session = await getStorySession(sessionId);
      if (session) {
        setStorySession(session);

        if (session.generated_images) {
          setGeneratedImages(session.generated_images);
        }

        if (session.selected_title && session.cover_image_url) {
          setFlowStep('page-flow');
          setCoverImageUrl(session.cover_image_url);
        } else if (session.selected_title) {
          setFlowStep('cover-create');
        } else {
          setFlowStep('title-select');
        }
      }
    } catch (error) {
      console.error('Error loading story session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleSelect = async (title: string) => {
    if (!storySession) return;

    setStorySession({ ...storySession, selected_title: title });
    await updateStorySession(storySession.session_id, { selected_title: title });

    setTimeout(() => setFlowStep('cover-create'), 500);
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverImageUrl(url);
    }
  };

  const handleStartStory = async () => {
    if (!storySession || !coverImageUrl) return;

    setStorySession({ ...storySession, cover_image_url: coverImageUrl });
    await updateStorySession(storySession.session_id, { cover_image_url: coverImageUrl });

    setFlowStep('page-flow');
    setPageStep('intro');
    setCurrentPageIndex(0);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📸 Photo uploaded, creating preview URL...');
      const url = URL.createObjectURL(file);
      setPagePhotos({ ...pagePhotos, [currentPageIndex]: url });

      console.log('🔄 Converting image to base64...');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setPagePhotosBase64({ ...pagePhotosBase64, [currentPageIndex]: base64String });
        console.log('✅ Base64 conversion complete');

        console.log('🚀 Triggering image generation for page:', currentPageIndex);
        await handleGeneratePageImage(currentPageIndex, base64String);
      };
      reader.readAsDataURL(file);
    }

    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const handleRetakePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔁 RETAKE button triggered');

    const file = event.target.files?.[0];
    if (!file) {
      console.log('⚠️ No file selected, keeping existing image');
      return;
    }

    // Clear the existing generated image first
    const updatedImages = { ...generatedImages };
    delete updatedImages[currentPageIndex];
    setGeneratedImages(updatedImages);

    // Clear from database
    if (storySession) {
      await updateStorySession(storySession.session_id, {
        generated_images: updatedImages,
      });
    }

    // Then handle the new photo upload
    await handlePhotoUpload(event);
  };

  const handleGeneratePageImage = async (pageIndex: number, base64Image?: string) => {
    console.log('🔍 handleGeneratePageImage called for page:', pageIndex);
    console.log('📊 State check:', {
      hasSession: !!storySession,
      hasUser: !!currentUser,
      hasProfile: !!geniusProfile,
      profileId: geniusProfile?.id,
      hasBase64Image: !!base64Image
    });

    if (!storySession || !geniusProfile?.id) {
      console.error('❌ Missing session or genius profile, aborting generation');
      return;
    }

    const page = storySession.pages[pageIndex];
    if (!page) {
      console.error('❌ Page not found at index:', pageIndex);
      return;
    }

    console.log('✅ All checks passed, starting generation...');
    setGeneratingImageForPage(pageIndex);
    setImageGenerationError(null);

    try {
      console.log('🎨 Generating image for page', pageIndex);
      console.log('🖼️ Using uploaded image:', !!base64Image);

      const imageToUse = base64Image || pagePhotosBase64[pageIndex];

      const response = await generateStorybookPageImage(
        {
          intro_text: page.intro_text,
          result_text: page.result_text_template,
          genius_name: storySession.genius_name,
          age: storySession.age,
          gender: storySession.gender || 'child',
          page_index: pageIndex,
          chapter_theme: storySession.chapter_theme || 'adventure',
          uploaded_image_base64: imageToUse,
        },
        geniusProfile.id
      );

      console.log('✅ Image generated:', response.image_url);

      const updatedImages = {
        ...generatedImages,
        [pageIndex]: response.image_url,
      };

      setGeneratedImages(updatedImages);

      updateFromDelta(response.tokens_used);

      await updateStorySession(storySession.session_id, {
        generated_images: updatedImages as any,
      });
    } catch (error: any) {
      console.error('❌ Image generation failed:', error);
      setImageGenerationError(error.message || 'Failed to generate image');
    } finally {
      setGeneratingImageForPage(null);
    }
  };

  const handleQuizAnswer = (optionIndex: number) => {
    setQuizAnswers({ ...quizAnswers, [currentPageIndex]: String(optionIndex) });
  };

  const handleNextPage = () => {
    if (currentPageIndex < 9) {
      setCurrentPageIndex(currentPageIndex + 1);
      setPageStep('intro');
    } else {
      handleFinishAdventure();
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
      setPageStep('intro');
    }
  };

  const handleFinishAdventure = async () => {
    if (!storySession || !currentUser) return;

    setIsGeneratingBackcover(true);

    try {
      const response = await generateBackcover({
        session_id: storySession.session_id,
        genius_profile_id: currentUser.id,
        genius_name: storySession.genius_name,
        age: storySession.age,
        gender: storySession.gender,
        chapter_code: storySession.chapter_code,
        chapter_title: storySession.chapter_title,
        selected_title: storySession.selected_title || '',
      });

      updateFromDelta(response.tokens_used);

      setStorySession({
        ...storySession,
        backcover_summary: response.backcover_summary,
        backcover_author_text: response.backcover_author_text,
      });

      setFlowStep('backcover');
    } catch (error) {
      console.error('Error generating backcover:', error);
      alert('Failed to generate back cover. Please try again.');
    } finally {
      setIsGeneratingBackcover(false);
    }
  };

  if (isLoading || !storySession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full"
          style={{ border: '4px solid rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const currentPage: StoryPage | undefined = storySession.pages[currentPageIndex];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed top-[30%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="relative z-10">
        {flowStep === 'title-select' && (
          <TitleSelectScreen
            session={storySession}
            onSelectTitle={handleTitleSelect}
          />
        )}

        {flowStep === 'cover-create' && (
          <CoverCreateScreen
            session={storySession}
            coverImageUrl={coverImageUrl}
            onUpload={handleCoverUpload}
            onStartStory={handleStartStory}
          />
        )}

        {flowStep === 'page-flow' && currentPage && (
          <PageFlowScreen
            session={storySession}
            page={currentPage}
            pageIndex={currentPageIndex}
            pageStep={pageStep}
            pagePhoto={pagePhotos[currentPageIndex]}
            quizAnswer={quizAnswers[currentPageIndex]}
            completedPages={completedPages}
            generatedImages={generatedImages}
            generatingImageForPage={generatingImageForPage}
            imageGenerationError={imageGenerationError}
            onPhotoUpload={handlePhotoUpload}
            onRetakePhoto={handleRetakePhoto}
            onQuizAnswer={handleQuizAnswer}
            onRetryImageGeneration={() => handleGeneratePageImage(currentPageIndex)}
            onNextStep={() => {
              if (pageStep === 'intro') setPageStep('activity');
              else if (pageStep === 'activity') {
                setPageStep('result');
                setCompletedPages(prev => new Set(prev).add(currentPageIndex));
              }
            }}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        )}

        {flowStep === 'backcover' && (
          <BackcoverScreen
            session={storySession}
            onViewStorybook={() => navigate('/s/dashboard')}
          />
        )}

        {isGeneratingBackcover && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-full mb-6 mx-auto"
                style={{ border: '4px solid rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }}
              />
              <h2 className="text-2xl font-bold text-white mb-2">Creating Your Back Cover...</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Almost done!</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

function TitleSelectScreen({ session, onSelectTitle }: { session: StorySession; onSelectTitle: (title: string) => void }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 pb-24 sm:pb-28" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl w-full"
      >
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl sm:text-6xl mb-4"
          >
            ✨
          </motion.div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Story Title
          </h1>
          <p className="text-lg sm:text-xl" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            Pick the title that excites you most, {session.genius_name}!
          </p>
        </div>

        <div className="space-y-4">
          {session.titles.map((title, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, x: 10 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedIndex(index);
                setTimeout(() => onSelectTitle(title), 300);
              }}
              className="w-full p-4 sm:p-6 rounded-2xl text-left transition-all"
              style={selectedIndex === index
                ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', border: '2px solid rgba(139, 92, 246, 0.8)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
                : { background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '2px solid rgba(255, 255, 255, 0.06)' }
              }
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg sm:text-xl font-bold text-white min-w-0 flex-1">{title}</span>
                {selectedIndex === index && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ type: 'spring' }}
                    className="shrink-0"
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function CoverCreateScreen({ session, coverImageUrl, onUpload, onStartStory }: {
  session: StorySession;
  coverImageUrl: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartStory: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 pb-24 sm:pb-28" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-4">Create Your Cover</h1>
          <p className="text-lg sm:text-xl mb-2 break-words" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{session.selected_title}</p>
          <p style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            Take a photo of yourself looking like a brave {session.chapter_theme} hero!
          </p>
        </div>

        <div className="relative">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onUpload}
            className="hidden"
            id="cover-upload"
          />

          <label
            htmlFor="cover-upload"
            className="block w-full aspect-[3/4] max-w-md mx-auto cursor-pointer"
          >
            {coverImageUrl ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full h-full rounded-3xl overflow-hidden shadow-2xl"
                style={{ border: '4px solid rgba(139, 92, 246, 0.5)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)' }}
              >
                <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="w-full h-full rounded-3xl flex flex-col items-center justify-center"
                style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '4px dashed rgba(255, 255, 255, 0.08)' }}
              >
                <Camera className="w-16 h-16 mb-4" style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
                <p className="font-semibold" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Tap to Take Photo</p>
              </motion.div>
            )}
          </label>
        </div>

        {coverImageUrl && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartStory}
            className="w-full mt-8 px-8 py-4 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
            style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.6))', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}
          >
            Begin Page 1
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}

function PageFlowScreen({
  session,
  page,
  pageIndex,
  pageStep,
  pagePhoto,
  quizAnswer,
  completedPages,
  generatedImages,
  generatingImageForPage,
  imageGenerationError,
  onPhotoUpload,
  onRetakePhoto,
  onQuizAnswer,
  onRetryImageGeneration,
  onNextStep,
  onNextPage,
  onPrevPage
}: {
  session: StorySession;
  page: StoryPage;
  pageIndex: number;
  pageStep: PageStep;
  pagePhoto?: string;
  quizAnswer?: string;
  completedPages: Set<number>;
  generatedImages: Record<number, string>;
  generatingImageForPage: number | null;
  imageGenerationError: string | null;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetakePhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuizAnswer: (index: number) => void;
  onRetryImageGeneration: () => void;
  onNextStep: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}) {
  const canContinue = pageStep === 'intro' || (pageStep === 'activity' && (page.page_type === 'quiz' ? quizAnswer !== undefined : !page.activity_requires_photo || (pagePhoto && generatedImages[pageIndex])));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 pb-24 sm:pb-28" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
      <motion.div
        key={`${pageIndex}-${pageStep}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-3xl w-full"
      >
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="font-bold text-base sm:text-lg shrink-0" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>Page {pageIndex + 1} of 10</span>
            <span className="text-sm font-medium truncate min-w-0" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{session.selected_title}</span>
          </div>
          <div className="w-full rounded-full h-3 shadow-inner" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
            <motion.div
              className="h-3 rounded-full"
              style={{ background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.7), rgba(99, 102, 241, 0.7))', boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)' }}
              initial={{ width: 0 }}
              animate={{ width: `${((pageIndex + 1) / 10) * 100}%` }}
            />
          </div>
        </div>

        {pageStep === 'intro' && (
          <IntroStep text={page.intro_text} onNext={onNextStep} />
        )}

        {pageStep === 'activity' && page.page_type === 'activity' && (
          <ActivityStep
            prompt={page.activity_prompt_photo || ''}
            requiresPhoto={page.activity_requires_photo || false}
            photo={pagePhoto}
            pageIndex={pageIndex}
            generatedImage={generatedImages[pageIndex]}
            isGenerating={generatingImageForPage === pageIndex}
            generationError={imageGenerationError}
            storyText={`${page.intro_text} ${page.result_text_template}`}
            onUpload={onPhotoUpload}
            onRetake={onRetakePhoto}
            onNext={onNextStep}
            onPrev={onPrevPage}
            onRetry={onRetryImageGeneration}
            canContinue={canContinue}
          />
        )}

        {pageStep === 'activity' && page.page_type === 'quiz' && (
          <QuizStep
            question={page.activity_prompt_question || ''}
            options={page.options || []}
            selectedIndex={quizAnswer ? parseInt(quizAnswer) : undefined}
            pageIndex={pageIndex}
            onSelect={onQuizAnswer}
            onNext={onNextStep}
            onPrev={onPrevPage}
            canContinue={canContinue}
          />
        )}

        {pageStep === 'result' && (
          <ResultStep
            text={page.result_text_template}
            photo={pagePhoto}
            generatedImage={generatedImages[pageIndex]}
            pageIndex={pageIndex}
            isLastPage={pageIndex === 9}
            isPageCompleted={completedPages.has(pageIndex)}
            onNext={onNextPage}
            onPrev={onPrevPage}
          />
        )}
      </motion.div>
    </div>
  );
}

function IntroStep({ text, onNext }: { text: string; onNext: () => void }) {
  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="rounded-3xl p-5 sm:p-8 shadow-2xl"
      style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
    >
      <BookOpen className="w-12 h-12 mb-6" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
      <p className="text-lg sm:text-2xl text-white leading-relaxed mb-8">{text}</p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        className="w-full px-6 py-4 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
      >
        Start Mission
        <ChevronRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}

function ActivityStep({
  prompt,
  requiresPhoto,
  photo,
  pageIndex,
  generatedImage,
  isGenerating,
  generationError,
  storyText,
  onUpload,
  onRetake,
  onNext,
  onPrev,
  onRetry,
  canContinue
}: {
  prompt: string;
  requiresPhoto: boolean;
  photo?: string;
  pageIndex: number;
  generatedImage?: string;
  isGenerating: boolean;
  generationError: string | null;
  storyText: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetake: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onPrev: () => void;
  onRetry: () => void;
  canContinue: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="rounded-3xl p-5 sm:p-8 shadow-2xl"
      style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Camera className="w-8 h-8 shrink-0" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
        <h3 className="text-xl sm:text-2xl font-bold text-white min-w-0">Your Mission</h3>
      </div>

      <p className="text-base sm:text-xl mb-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{prompt}</p>

      {requiresPhoto && (
        <div className="mb-6">
          {!generatedImage && !photo && !isGenerating && (
            <>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onUpload}
                className="hidden"
                id="activity-upload"
              />

              <label htmlFor="activity-upload" className="block cursor-pointer">
                <div className="w-full aspect-video rounded-2xl flex flex-col items-center justify-center transition-colors" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '2px dashed rgba(255, 255, 255, 0.08)' }}>
                  <Upload className="w-12 h-12 mb-2" style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
                  <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Upload Your Creation</p>
                </div>
              </label>
            </>
          )}

          {photo && !generatedImage && !isGenerating && (
            <div className="space-y-4">
              <img src={photo} alt="Your upload" className="w-full rounded-2xl opacity-50" style={{ border: '2px solid rgba(255, 255, 255, 0.1)' }} />
              <p className="text-center text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Preparing to generate AI image...</p>
            </div>
          )}

          {isGenerating && <ImageGeneratingLoader />}

          {generatedImage && !isGenerating && (
            <div className="space-y-4">
              <ImageGenerationSuccess imageUrl={generatedImage} storyText={storyText} />

              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onRetake}
                className="hidden"
                id={`retake-upload-${pageIndex}`}
              />

              <label htmlFor={`retake-upload-${pageIndex}`} className="block cursor-pointer">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.6), rgba(239, 68, 68, 0.6))' }}
                >
                  <Camera className="w-5 h-5" />
                  RETAKE
                </motion.div>
              </label>

              <details className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                <summary className="cursor-pointer" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>View original photo</summary>
                <img src={photo} alt="Original" className="w-32 h-32 object-cover rounded-lg mt-2" style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }} />
              </details>
            </div>
          )}

          {generationError && !isGenerating && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p className="text-red-400 mb-3">{generationError}</p>
              <button
                onClick={onRetry}
                className="w-full px-4 py-2 text-white rounded-lg font-medium transition-colors"
                style={{ background: 'rgba(239, 68, 68, 0.5)' }}
              >
                Retry Generation
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 sm:gap-4 mt-6">
        {pageIndex > 0 && (
          <motion.button
            whileHover={!isGenerating ? { scale: 1.05 } : {}}
            whileTap={!isGenerating ? { scale: 0.95 } : {}}
            onClick={onPrev}
            disabled={isGenerating}
            className="flex-1 px-4 sm:px-6 py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2"
            style={isGenerating
              ? { background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.2)', cursor: 'not-allowed' }
              : { background: 'rgba(255, 255, 255, 0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.08)' }
            }
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </motion.button>
        )}

        <motion.button
          whileHover={canContinue ? { scale: 1.05 } : {}}
          whileTap={canContinue ? { scale: 0.95 } : {}}
          onClick={onNext}
          disabled={!canContinue}
          className={`${pageIndex > 0 ? 'flex-1' : 'w-full'} px-4 sm:px-6 py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2`}
          style={canContinue
            ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
            : { background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.25)', cursor: 'not-allowed' }
          }
        >
          {isGenerating ? (
            <>
              <Lock className="w-5 h-5" />
              Please wait...
            </>
          ) : !canContinue ? (
            <>
              <Lock className="w-5 h-5" />
              Waiting for AI...
            </>
          ) : (
            <>
              See What Happens
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

function QuizStep({ question, options, selectedIndex, pageIndex, onSelect, onNext, onPrev, canContinue }: {
  question: string;
  options: string[];
  selectedIndex?: number;
  pageIndex: number;
  onSelect: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  canContinue: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="rounded-3xl p-5 sm:p-8 shadow-2xl"
      style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
    >
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">{question}</h3>

      <div className="space-y-3 mb-6">
        {options.map((option, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(index)}
            className="w-full p-4 rounded-xl text-left transition-all"
            style={selectedIndex === index
              ? { background: 'rgba(139, 92, 246, 0.15)', border: '2px solid rgba(139, 92, 246, 0.6)' }
              : { background: 'rgba(255, 255, 255, 0.04)', border: '2px solid rgba(255, 255, 255, 0.06)' }
            }
          >
            <span className="text-white font-medium">{option}</span>
          </motion.button>
        ))}
      </div>

      <div className="flex gap-2 sm:gap-4">
        {pageIndex > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPrev}
            className="flex-1 px-4 sm:px-6 py-4 text-white rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2"
            style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </motion.button>
        )}

        <motion.button
          whileHover={canContinue ? { scale: 1.05 } : {}}
          whileTap={canContinue ? { scale: 0.95 } : {}}
          onClick={onNext}
          disabled={!canContinue}
          className={`${pageIndex > 0 ? 'flex-1' : 'w-full'} px-4 sm:px-6 py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2`}
          style={canContinue
            ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
            : { background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.25)', cursor: 'not-allowed' }
          }
        >
          See What Happens
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function ResultStep({
  text,
  photo,
  generatedImage,
  pageIndex,
  isLastPage,
  isPageCompleted,
  onNext,
  onPrev
}: {
  text: string;
  photo?: string;
  generatedImage?: string;
  pageIndex: number;
  isLastPage: boolean;
  isPageCompleted: boolean;
  onNext: () => void;
  onPrev: () => void;
}) {
  const imageToDisplay = generatedImage || photo;

  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="rounded-3xl p-5 sm:p-8 shadow-2xl"
      style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
    >
      <Sparkles className="w-12 h-12 text-yellow-400 mb-6" />
      <p className="text-lg sm:text-2xl text-white leading-relaxed mb-6">{text}</p>

      {imageToDisplay && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 space-y-3"
        >
          <div className="relative">
            <img
              src={imageToDisplay}
              alt="Your storybook page"
              className="w-full rounded-2xl shadow-xl"
              style={{ border: '2px solid rgba(139, 92, 246, 0.4)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)' }}
            />
            {generatedImage && (
              <div className="absolute bottom-2 right-2 px-3 py-1 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                <p className="text-xs font-medium" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>AI-Generated</p>
              </div>
            )}
          </div>
          {generatedImage && photo && (
            <details className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
              <summary className="cursor-pointer" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>View your original photo</summary>
              <img
                src={photo}
                alt="Original upload"
                className="w-32 h-32 object-cover rounded-lg mt-2"
                style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
              />
            </details>
          )}
        </motion.div>
      )}

      <div className="flex gap-2 sm:gap-4">
        {pageIndex > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPrev}
            className="flex-1 px-4 sm:px-6 py-4 text-white rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2"
            style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </motion.button>
        )}

        <motion.button
          whileHover={isPageCompleted ? { scale: 1.05 } : {}}
          whileTap={isPageCompleted ? { scale: 0.95 } : {}}
          onClick={isPageCompleted ? onNext : undefined}
          disabled={!isPageCompleted}
          className={`${pageIndex > 0 ? 'flex-1' : 'w-full'} px-4 sm:px-6 py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2`}
          style={isPageCompleted
            ? isLastPage
              ? { background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }
              : { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
            : { background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.25)', cursor: 'not-allowed' }
          }
        >
          {!isPageCompleted && <Lock className="w-5 h-5" />}
          {isLastPage ? (
            <>
              Finish Adventure
              <Award className="w-5 h-5" />
            </>
          ) : (
            <>
              Next Page
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

function BackcoverScreen({ session, onViewStorybook }: {
  session: StorySession;
  onViewStorybook: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 pb-24 sm:pb-28" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl w-full"
      >
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-5xl sm:text-6xl mb-4 mx-auto w-fit"
          >
            🎉
          </motion.div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Adventure Complete!
          </h1>
        </div>

        <div className="rounded-3xl p-5 sm:p-8 mb-8" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>About This Story</h2>
          <p className="text-base sm:text-lg leading-relaxed mb-8" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {session.backcover_summary}
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'rgba(168, 85, 247, 0.8)' }}>About the Author</h2>
          <p className="text-lg leading-relaxed mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {session.backcover_author_text}
          </p>
          <p className="text-sm italic" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            — {session.genius_name}, Age {session.age}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onViewStorybook}
          className="w-full px-8 py-4 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.6))', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}
        >
          <BookOpen className="w-6 h-6" />
          Back to Dashboard
        </motion.button>
      </motion.div>
    </div>
  );
}
