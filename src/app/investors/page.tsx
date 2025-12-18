'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function InvestorsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPrototypeForm, setShowPrototypeForm] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Simple password protection
  const INVESTOR_PASSWORD = 'dashdice2025'; // Change this to your secure password
  
  useEffect(() => {
    // Check if already authenticated in session
    const auth = sessionStorage.getItem('investor_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INVESTOR_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('investor_auth', 'true');
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };
  
  const totalSlides = 12;
  
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DashDice</h1>
          <p className="text-gray-600 mb-8">Investor Access</p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter investor password"
                autoFocus
              />
            </div>
            
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
            
            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Access Investor Page
            </button>
          </form>
          
          <p className="text-xs text-gray-500 mt-6 text-center">
            If you need access, please contact the founder.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* No indexing meta tags would go in metadata */}
      
      <div className="max-w-6xl mx-auto px-6 py-12 lg:px-8">
        
        {/* 1. Header */}
        <header className="mb-20 border-b border-gray-200 pb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">DashDice</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl">
            [One sentence positioning statement goes here]
          </p>
          
          <div className="flex flex-wrap gap-4">
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Download Pitch Deck
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Book a Call
            </a>
          </div>
        </header>
        
        {/* 2. Founder Introduction Video */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Founder Introduction (3 mins)</h2>
          
          <div className="bg-gray-100 rounded-lg aspect-video mb-4 flex items-center justify-center border border-gray-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-300 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Video Player Placeholder</p>
              <p className="text-sm text-gray-500">Founder Introduction Video</p>
            </div>
          </div>
          
          <p className="text-gray-600 leading-relaxed max-w-3xl">
            A short introduction to DashDice, the thesis, and what we're building.
          </p>
        </section>
        
        {/* 3. Gameplay Video */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Prototype Gameplay (1–2 mins)</h2>
          
          <div className="bg-gray-100 rounded-lg aspect-video mb-4 flex items-center justify-center border border-gray-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-300 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Video Player Placeholder</p>
              <p className="text-sm text-gray-500">Gameplay Video</p>
            </div>
          </div>
          
          <p className="text-gray-600 leading-relaxed max-w-3xl">
            Short raw gameplay from the current prototype build.
          </p>
        </section>
        
        {/* 4. Pitch Deck Carousel */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Pitch Deck</h2>
          
          {/* Carousel */}
          <div className="relative mb-6">
            <div className="bg-gray-100 rounded-lg aspect-[16/9] flex items-center justify-center border border-gray-200 overflow-hidden">
              <div className="text-center">
                <div className="text-6xl font-bold text-gray-400 mb-2">{currentSlide + 1}</div>
                <p className="text-gray-600 font-medium">Slide {currentSlide + 1} of {totalSlides}</p>
                <p className="text-sm text-gray-500">Key Deck Slide Placeholder</p>
              </div>
            </div>
            
            {/* Navigation */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-colors"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-colors"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlide ? 'w-8 bg-gray-900' : 'w-2 bg-gray-300'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          
          {/* PDF Links */}
          <div className="flex flex-wrap gap-4 mb-4">
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              View Full Deck (PDF)
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Download Full Deck (PDF)
            </a>
          </div>
          
          <p className="text-sm text-gray-500">
            Carousel shows selected key slides; full deck available as PDF.
          </p>
        </section>
        
        {/* 5. Prototype Access */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Prototype Access</h2>
          
          <p className="text-gray-700 leading-relaxed mb-6 max-w-3xl">
            Prototype access is available on request. We provide demo accounts for qualified investors 
            to experience the gameplay, mechanics, and core features firsthand.
          </p>
          
          {!showPrototypeForm ? (
            <button
              onClick={() => setShowPrototypeForm(true)}
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Request Prototype Access
            </button>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Access</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firm *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Investment firm or organization"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="your.email@firm.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How did you hear about DashDice? (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Referral, network, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Any specific questions or areas of interest..."
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Submit Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrototypeForm(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
        
        {/* 6. Key Documents */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Documents</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Go-To-Market Overview',
                description: 'Distribution strategy and user acquisition plan'
              },
              {
                title: 'Financial Model Summary',
                description: 'Revenue projections and unit economics'
              },
              {
                title: 'Monetisation Overview',
                description: 'Revenue streams and pricing strategy'
              },
              {
                title: 'AI Communication Overview',
                description: 'Technical architecture and AI implementation'
              },
              {
                title: 'Competitive Thesis',
                description: 'Market positioning and differentiation analysis'
              }
            ].map((doc, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{doc.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{doc.description}</p>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-gray-900 font-medium hover:underline"
                >
                  Open PDF
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </section>
        
        {/* 7. Advisors */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Advisors</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: '[Advisor Name]',
                credential: 'Former VP Product at [Major Gaming Company]',
                advises: 'Product strategy and game design'
              },
              {
                name: '[Advisor Name]',
                credential: 'Ex-Head of Growth at [Tech Unicorn]',
                advises: 'User acquisition and viral growth'
              },
              {
                name: '[Advisor Name]',
                credential: 'Former CTO at [Gaming Studio]',
                advises: 'Technical architecture and scalability'
              },
              {
                name: '[Advisor Name]',
                credential: 'Investment Partner at [VC Firm]',
                advises: 'Fundraising and investor relations'
              }
            ].map((advisor, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{advisor.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{advisor.credential}</p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Advises on:</span> {advisor.advises}
                </p>
              </div>
            ))}
          </div>
        </section>
        
        {/* 8. LOIs / Signals */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Credibility Signals</h2>
          
          <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-gray-900 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">
                  <strong>12 signed LOIs</strong> from world-class freelance designers
                </span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-gray-900 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">
                  [Optional second signal placeholder — creators, playtests, prototype engagement, etc.]
                </span>
              </li>
            </ul>
          </div>
        </section>
        
        {/* 9. Contact / CTA Footer */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Next Steps</h2>
          
          <p className="text-gray-700 leading-relaxed mb-8 max-w-3xl">
            If this is relevant to your investment focus, I'd welcome a short call to discuss 
            the opportunity, answer questions, and explore potential alignment.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:contact@dashdice.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book a Call
            </a>
          </div>
        </section>
        
        {/* 10. Footer Meta */}
        <footer className="border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </footer>
        
      </div>
    </div>
  );
}
