'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);
const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

export default function InvestorsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPrototypeForm, setShowPrototypeForm] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showScheduler, setShowScheduler] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // Slides to exclude (0-indexed)
  const excludedSlides = [0, 9, 10, 14, 15, 18, 19, 22]; // 1, 10, 11, 15, 16, 19, 20, 23 in 1-indexed
  const [filteredSlideCount, setFilteredSlideCount] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    firm: '',
    email: '',
    referral: '',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Configure PDF.js worker on client side
  useEffect(() => {
    import('react-pdf').then((pdfjs) => {
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.mjs`;
    });
  }, []);
  
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
  
  const totalSlides = filteredSlideCount || 12;
  
  // Map display index to actual PDF page number
  const getActualPageNumber = (displayIndex: number) => {
    const excludedSlidesWithLast = numPages > 0 ? [...excludedSlides, numPages - 1] : excludedSlides;
    let actualPage = 0;
    let displayCount = 0;
    
    for (let i = 0; i < numPages; i++) {
      if (!excludedSlidesWithLast.includes(i)) {
        if (displayCount === displayIndex) {
          actualPage = i;
          break;
        }
        displayCount++;
      }
    }
    
    return actualPage + 1; // Convert to 1-indexed for PDF
  };
  
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Calculate filtered slides (excluding specified slides and last slide)
    const excludedSlidesWithLast = [...excludedSlides, numPages - 1];
    const filtered = numPages - excludedSlidesWithLast.length;
    setFilteredSlideCount(filtered);
    setPdfError(null);
  };
  
  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfError('Failed to load pitch deck. Please refresh the page.');
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    
    try {
      const response = await fetch('/api/send-prototype-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFormSuccess(true);
        // Reset form
        setFormData({
          name: '',
          firm: '',
          email: '',
          referral: '',
          notes: ''
        });
      } else {
        setFormError(data.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormError('Failed to submit request. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
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
            DashDice is a next-generation, skill-based PvP mobile game built for India-first scale and global competitive play—combining deep strategy, transparent mechanics, and an AI-driven LiveOps engine designed for long-term mastery and retention.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <a
              href="/investor-pitch.pdf"
              download="DashDice-Investor-Pitch.pdf"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Download Pitch Deck
            </a>
            <a
              href="mailto:play@dashdice.gg"
              className="inline-flex items-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
            <button
              onClick={() => setShowScheduler(true)}
              className="inline-flex items-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Book a Call
            </button>
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
            <div className="flex items-center gap-4">
              {/* Left Navigation Button */}
              <button
                onClick={prevSlide}
                className="bg-black hover:bg-gray-800 p-3 rounded-full shadow-lg transition-colors flex-shrink-0"
                aria-label="Previous slide"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Carousel Container */}
              <div className="flex-1 bg-gray-100 aspect-[16/9] flex items-center justify-center overflow-hidden" style={{ borderRadius: '6px' }}>
                {pdfError ? (
                  <div className="text-center p-8">
                    <p className="text-red-600 mb-2">{pdfError}</p>
                    <p className="text-sm text-gray-500">Slide {currentSlide + 1} of {totalSlides}</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <Document
                      file="/investor-pitch.pdf"
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                          <p className="text-gray-600">Loading pitch deck...</p>
                        </div>
                      }
                    >
                      <Page
                        pageNumber={getActualPageNumber(currentSlide)}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 120, 900) : 900}
                        scale={0.85}
                        className="mx-auto"
                      />
                    </Document>
                  </div>
                )}
              </div>
              
              {/* Right Navigation Button */}
              <button
                onClick={nextSlide}
                className="bg-black hover:bg-gray-800 p-3 rounded-full shadow-lg transition-colors flex-shrink-0"
                aria-label="Next slide"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
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
              href="/investor-pitch.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              View Full Deck (PDF)
            </a>
            <a
              href="/investor-pitch.pdf"
              download="DashDice-Investor-Pitch.pdf"
              className="inline-flex items-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Download Full Deck (PDF)
            </a>
          </div>
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
          ) : formSuccess ? (
            <div className="bg-green-50 rounded-lg p-6 border border-green-200 max-w-2xl">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Request Submitted!</h3>
                  <p className="text-green-700">
                    Thank you for your interest. We'll review your request and get back to you shortly at {formData.email || 'your email'}.
                  </p>
                  <button
                    onClick={() => {
                      setShowPrototypeForm(false);
                      setFormSuccess(false);
                    }}
                    className="mt-4 text-sm text-green-700 hover:text-green-800 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Access</h3>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder:text-gray-600"
                    placeholder="Your name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firm *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firm}
                    onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder:text-gray-600"
                    placeholder="Investment firm or organization"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder:text-gray-600"
                    placeholder="your.email@firm.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder:text-gray-600"
                    placeholder="Any specific questions or areas of interest..."
                  />
                </div>
                
                {formError && (
                  <div className="text-red-600 text-sm">{formError}</div>
                )}
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPrototypeForm(false);
                      setFormError('');
                    }}
                    disabled={formSubmitting}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                name: 'William',
                credential: 'Strategy & Game Mechanics Advisor',
                advises: 'Senior competitive game strategist guiding core systems, balance, and long-term gameplay depth.'
              },
              {
                name: 'John',
                credential: 'Technical Architecture Advisor',
                advises: 'Senior backend engineer at Autodesk, advising on scalable infrastructure, AI systems, and platform architecture.'
              },
              {
                name: 'Mark',
                credential: 'Business & Operations Advisor',
                advises: 'Founder and CEO of a large automotive manufacturing supplier, advising on operational discipline, budgeting, and scaling.'
              },
              {
                name: 'Venkatram',
                credential: 'Financial & India Market Advisor',
                advises: 'Senior product leader at VISA, advising on India market strategy, payments, monetisation, and cross-border execution.'
              },
              {
                name: 'Nick',
                credential: 'Art & Creative Direction Advisor',
                advises: 'Founder of a Montreal-based design studio, with credits on high-profile Amazon gaming productions, guiding visual identity and creative quality.'
              }
            ].map((advisor, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{advisor.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{advisor.credential}</p>
                <p className="text-sm text-gray-500">{advisor.advises}</p>
              </div>
            ))}
          </div>
        </section>
        
        {/* 8. LOIs / Signals */}
        <section className="mb-20" style={{ display: 'none' }}>
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
              href="mailto:play@dashdice.gg"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
            <button
              onClick={() => setShowScheduler(true)}
              className="inline-flex items-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book a Call
            </button>
          </div>
        </section>
        
        {/* 10. Footer Meta */}
        <footer className="border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </footer>
        
      </div>

      {/* Scheduler Modal */}
      {showScheduler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full h-full max-w-full max-h-full overflow-hidden relative">
            <button
              onClick={() => setShowScheduler(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Close scheduler"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <iframe 
              src="https://dashdice.pipedrive.com/scheduler/4xk05YHK/investment-discussion" 
              title="Pipedrive Scheduler" 
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
