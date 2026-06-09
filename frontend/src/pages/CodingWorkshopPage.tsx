import { useNavigate } from 'react-router-dom';
import { Code, GraduationCap, Sparkles, ArrowLeft } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { BottomNav } from '../components/BottomNav';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useSmartBack } from '../lib/smartBack';

export const CodingWorkshopPage = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack('/s/aipreneur/innovation');
  const { geniusProfile } = useGeniusAuth();
  const displayName = geniusProfile?.first_name || 'Friend';

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: '#0a0a1a' }}>
      {/* Glassmorphism ambient background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '15%', width: 450, height: 450, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.10)', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(236, 72, 153, 0.07)', filter: 'blur(90px)' }} />
      </div>

      <TopNav userName={displayName} />

      <div className="max-w-5xl mx-auto px-6 py-10 pt-20 md:pt-24" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => smartBack()}
          className="flex items-center gap-2 mb-6"
          style={{ color: 'rgba(139, 92, 246, 0.9)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Innovation Lab
        </button>

        {/* Main glass card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'rgba(15, 15, 30, 0.5)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              <Code className="w-6 h-6" style={{ color: 'rgba(165, 243, 252, 0.9)' }} />
            </div>
            <h1 className="text-3xl font-black" style={{ color: 'white' }}>Coding Workshop</h1>
          </div>
          <p className="max-w-2xl" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Learn how to build real apps, games, and smart shop tech. Each workshop is kid-friendly
            and teaches coding through fun projects.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature card 1 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Sparkles className="w-5 h-5 mb-3" style={{ color: 'rgba(250, 204, 21, 0.9)' }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: 'white' }}>Project Based</h3>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Build mini games, kiosks, and smart displays.</p>
            </div>
            {/* Feature card 2 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <GraduationCap className="w-5 h-5 mb-3" style={{ color: 'rgba(139, 92, 246, 0.9)' }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: 'white' }}>Guided Mentors</h3>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Friendly coaches help kids finish each project.</p>
            </div>
            {/* Feature card 3 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Code className="w-5 h-5 mb-3" style={{ color: 'rgba(168, 130, 255, 0.9)' }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: 'white' }}>Real Skills</h3>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Learn loops, logic, and creativity with code.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              className="px-6 py-3 rounded-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                color: 'white',
              }}
              onClick={() => navigate('/s/classes?category=coding')}
            >
              Join the next workshop
            </button>
            <button
              className="px-6 py-3 rounded-2xl transition-all"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
              onClick={() => navigate('/s/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CodingWorkshopPage;
