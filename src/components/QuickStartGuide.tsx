'use client';

import { useState, useEffect } from 'react';

const slides = [
  {
    title: "Welcome to Gujarat Mobile Khergam! 👋",
    icon: "🏪",
    description: "This is your new, lightning-fast shop management system. Let's take a quick tour to see how easy it is to manage your daily tasks.",
    color: "#f59e0b"
  },
  {
    title: "Track Your Inventory 📦",
    icon: "📦",
    description: "Go to the Inventory page to see all your stock. The system will automatically warn you with low-stock alerts when you're running out of popular items.",
    color: "#8b5cf6"
  },
  {
    title: "Record Sales in Seconds 💰",
    icon: "💰",
    description: "On the Sales page, log new sales instantly. You can mark them as Cash, Online (UPI), or Gifts. The dashboard will automatically calculate your total revenue.",
    color: "#10b981"
  },
  {
    title: "Log Defective Returns 🔄",
    icon: "🔄",
    description: "When a customer returns a broken item, log it in the Replacements page. Admin will receive an instant notification to process the return with the distributor.",
    color: "#f43f5e"
  },
  {
    title: "Install as a Phone App! 📱",
    icon: "📱",
    description: "For the best experience, click 'Install App' in the sidebar or from your browser menu. It will save the app to your home screen so you can use it like a native app!",
    color: "#0ea5e9"
  }
];

export default function QuickStartGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Check if it's the first visit
    const hasSeenGuide = localStorage.getItem('hasSeenGuide');
    if (!hasSeenGuide) {
      setIsOpen(true);
    }

    // Listen for manual open requests from the sidebar
    const handleOpen = () => {
      setCurrentSlide(0);
      setIsOpen(true);
    };

    window.addEventListener('open-guide', handleOpen);
    return () => window.removeEventListener('open-guide', handleOpen);
  }, []);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleClose = () => {
    localStorage.setItem('hasSeenGuide', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const slide = slides[currentSlide];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
      zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '480px',
        overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative'
      }}>
        
        {/* Header Color Bar */}
        <div style={{ height: '8px', width: '100%', backgroundColor: slide.color, transition: 'background-color 0.3s ease' }} />

        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{
            fontSize: '4rem', marginBottom: '1rem', display: 'inline-block',
            background: `${slide.color}20`, padding: '1.5rem', borderRadius: '50%'
          }}>
            {slide.icon}
          </div>
          
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            {slide.title}
          </h2>
          
          <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.6, color: '#475569' }}>
            {slide.description}
          </p>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0 2rem' }}>
          {slides.map((_, idx) => (
            <div key={idx} style={{
              width: idx === currentSlide ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: idx === currentSlide ? slide.color : '#e2e8f0',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.5rem 2rem', borderTop: '1px solid #f1f5f9', marginTop: '1.5rem',
          backgroundColor: '#f8fafc'
        }}>
          <button 
            onClick={handleClose}
            style={{ 
              background: 'none', border: 'none', color: '#64748b', 
              fontWeight: 600, cursor: 'pointer', padding: '0.5rem'
            }}
          >
            Skip
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {currentSlide > 0 && (
              <button 
                onClick={handlePrev}
                style={{ 
                  background: '#e2e8f0', border: 'none', color: '#475569', 
                  padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Back
              </button>
            )}
            <button 
              onClick={handleNext}
              style={{ 
                background: slide.color, border: 'none', color: 'white', 
                padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
            >
              {currentSlide === slides.length - 1 ? "Get Started 🚀" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
