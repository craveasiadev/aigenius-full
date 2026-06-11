import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Gift, ShoppingBag, Book, Lock, Sparkles, TrendingUp, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { BottomNav } from '../components/BottomNav';

type StoreCategory = 'all' | 'tickets' | 'merch' | 'vouchers';

interface StoreItem {
  id: number;
  name: string;
  description: string;
  type: 'ticket' | 'merch' | 'voucher';
  emoji: string;
  price: number;
  stock: number;
  popular?: boolean;
  color: string;
}

const STORE_ITEMS: StoreItem[] = [
  {
    id: 1,
    name: 'Wonderpark Ticket',
    description: 'One child admission to Wonderpark theme park!',
    type: 'ticket',
    emoji: '🎢',
    price: 800,
    stock: 100,
    popular: true,
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 2,
    name: 'Family Combo (2+2)',
    description: 'Family package: 2 adults + 2 children tickets',
    type: 'ticket',
    emoji: '👨‍👩‍👧‍👦',
    price: 2800,
    stock: 50,
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 3,
    name: 'AI Genius Merch Pack',
    description: 'T-shirt, stickers, and badge set!',
    type: 'merch',
    emoji: '👕',
    price: 450,
    stock: 200,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 4,
    name: 'Bookstore Voucher RM20',
    description: 'RM20 voucher for your favorite bookstore',
    type: 'voucher',
    emoji: '📚',
    price: 600,
    stock: 150,
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 5,
    name: 'Premium Art Kit',
    description: 'Professional art supplies for young creators',
    type: 'merch',
    emoji: '🎨',
    price: 550,
    stock: 80,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 6,
    name: 'Science Experiment Kit',
    description: '10 amazing science experiments to try at home',
    type: 'merch',
    emoji: '🔬',
    price: 700,
    stock: 60,
    color: 'from-indigo-500 to-blue-600',
  },
  {
    id: 7,
    name: 'Ice Cream Voucher',
    description: 'Free ice cream at any partner store',
    type: 'voucher',
    emoji: '🍦',
    price: 150,
    stock: 999,
    color: 'from-yellow-400 to-amber-500',
  },
  {
    id: 8,
    name: 'Toy Store Voucher RM30',
    description: 'RM30 voucher for toys and games',
    type: 'voucher',
    emoji: '🧸',
    price: 900,
    stock: 80,
    color: 'from-red-400 to-pink-500',
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All', emoji: '🛍️' },
  { id: 'tickets', name: 'Tickets', emoji: '🎫' },
  { id: 'merch', name: 'Merch', emoji: '🎁' },
  { id: 'vouchers', name: 'Vouchers', emoji: '🎟️' },
];

export const StorePage = () => {
  const { currentUser } = useAuth();
  const store = useStore();
  const [activeCategory, setActiveCategory] = useState<StoreCategory>('all');
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

  if (!currentUser) return null;

  const rewards = store.getRewards(currentUser.id);

  const filteredItems = STORE_ITEMS.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.type === activeCategory;
  });

  const handleRedeem = (item: StoreItem) => {
    if (rewards.coins >= item.price) {
      alert(`🎉 Redeemed ${item.name}!\n\nYour redemption code will be sent to your email.`);
      setSelectedItem(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)', position: 'relative', overflow: 'hidden' }}>
      {/* Fixed gradient orbs for ambient background lighting */}
      <div style={{
        position: 'fixed', top: '-20%', left: '-10%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '-15%', right: '-10%', width: '450px', height: '450px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', top: '40%', right: '20%', width: '350px', height: '350px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header - Glass Nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(10, 10, 26, 0.7)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        <div style={{
          maxWidth: '72rem', margin: '0 auto', padding: '0 1rem',
          height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(168, 85, 247, 0.6))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShoppingBag style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: 0, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Rewards Store
            </h1>
          </div>

          {/* Coin Balance - Glass Pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(245, 158, 11, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '9999px',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            flexShrink: 0, marginLeft: '0.5rem',
          }}>
            <span style={{ fontSize: '1.2rem' }}>🪙</span>
            <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.95rem' }}>
              {rewards.coins.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem 1rem', position: 'relative', zIndex: 1 }}>
        {/* Hero Banner - Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative', overflow: 'hidden', borderRadius: '1.5rem',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.75rem', marginBottom: '1.5rem',
          }}
        >
          {/* Subtle gradient overlay inside banner */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.1) 40%, rgba(236, 72, 153, 0.15) 100%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 10, paddingRight: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
              <Sparkles style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: 500 }}>Daily Special</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.35rem' }}>
              Wonderpark Tickets
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem', margin: 0 }}>
              Get 20% off family packages this week!
            </p>
          </div>
          <div style={{
            position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)',
            fontSize: '4rem', opacity: 0.2, pointerEvents: 'none',
          }}>
            🎢
          </div>
          {/* Glass shimmer stripe */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
            pointerEvents: 'none',
          }} />
        </motion.div>

        {/* Categories - Glass Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: '1.5rem' }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {CATEGORIES.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id as StoreCategory)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.7rem 1.25rem', borderRadius: '1rem',
                    fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    fontSize: '0.9rem',
                    border: isActive ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(168, 85, 247, 0.4))'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.5)',
                    boxShadow: isActive ? '0 0 20px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                >
                  <span>{category.emoji}</span>
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Items Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
        }}>
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => {
              const canAfford = rewards.coins >= item.price;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => canAfford && setSelectedItem(item)}
                  style={{
                    position: 'relative', overflow: 'hidden', borderRadius: '1.25rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    cursor: canAfford ? 'pointer' : 'default',
                    opacity: canAfford ? 1 : 0.5,
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (canAfford) {
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(139, 92, 246, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      const overlay = e.currentTarget.querySelector('[data-hover-overlay]') as HTMLElement;
                      if (overlay) {
                        overlay.style.opacity = '1';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canAfford) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                      const overlay = e.currentTarget.querySelector('[data-hover-overlay]') as HTMLElement;
                      if (overlay) {
                        overlay.style.opacity = '0';
                      }
                    }
                  }}
                >
                  {/* Popular Badge - Glass Pill */}
                  {item.popular && (
                    <div style={{
                      position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 10,
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.3rem 0.6rem',
                      background: 'rgba(245, 158, 11, 0.2)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '9999px',
                    }}>
                      <Star style={{ width: '12px', height: '12px', color: '#fbbf24', fill: '#fbbf24' }} />
                      <span style={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700 }}>Hot</span>
                    </div>
                  )}

                  {/* Emoji Area - Gradient Background */}
                  <div style={{
                    height: '128px',
                    background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}
                    className={`bg-gradient-to-br ${item.color}`}
                  >
                    <span style={{
                      fontSize: '3.2rem',
                      transition: 'transform 0.3s ease',
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                    }}>
                      {item.emoji}
                    </span>
                    {/* Glass sheen over emoji area */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                      pointerEvents: 'none',
                    }} />
                  </div>

                  {/* Content */}
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{
                      color: 'white', fontWeight: 700, fontSize: '0.875rem',
                      marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.name}
                    </h3>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem',
                      marginBottom: '0.75rem', lineHeight: '1.4',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {item.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>🪙</span>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{item.price}</span>
                      </div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.7rem' }}>{item.stock} left</span>
                    </div>
                  </div>

                  {/* Hover Overlay - Glass Effect */}
                  {canAfford && (
                    <div
                      data-hover-overlay
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(139, 92, 246, 0.08)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.3s ease',
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{
                        padding: '0.5rem 1.25rem',
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '9999px',
                        color: 'white', fontWeight: 700, fontSize: '0.85rem',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                      }}>
                        Tap to Redeem
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '28rem',
                maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto',
                borderRadius: '1.75rem',
                background: 'rgba(15, 15, 30, 0.85)',
                backdropFilter: 'blur(40px) saturate(150%)',
                WebkitBackdropFilter: 'blur(40px) saturate(150%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Emoji / Image Area */}
              <div
                className={`bg-gradient-to-br ${selectedItem.color}`}
                style={{
                  height: '12rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}>
                  {selectedItem.emoji}
                </span>
                {/* Glass sheen */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)',
                  pointerEvents: 'none',
                }} />
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '1.25rem', cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)'; }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                  {selectedItem.name}
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1.5rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
                  {selectedItem.description}
                </p>

                {/* Price & Stock Row - Glass Containers */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  padding: '1rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Price</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🪙</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{selectedItem.price}</span>
                    </div>
                  </div>
                  <div style={{
                    width: '1px', height: '40px',
                    background: 'rgba(255, 255, 255, 0.06)',
                  }} />
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Stock</p>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{selectedItem.stock} left</p>
                  </div>
                </div>

                {/* Redeem Button - Glass Gradient */}
                <button
                  onClick={() => handleRedeem(selectedItem)}
                  style={{
                    width: '100%', padding: '1rem',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(168, 85, 247, 0.6))',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '1rem',
                    color: 'white', fontWeight: 700, fontSize: '1.05rem',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 4px 24px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.85), rgba(168, 85, 247, 0.75))';
                    e.currentTarget.style.boxShadow = '0 6px 32px rgba(139, 92, 246, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(168, 85, 247, 0.6))';
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Gift style={{ width: '20px', height: '20px' }} />
                  Redeem Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default StorePage;
