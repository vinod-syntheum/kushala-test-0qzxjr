'use client';

import React, { useCallback, useEffect } from 'react'; // v18.0.0
import Image from 'next/image'; // v14.0.0
import Link from 'next/link'; // v14.0.0
import { useIntersectionObserver } from 'react-intersection-observer'; // v9.0.0

import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/common/Button';

// Feature sections with metrics
const FEATURES = [
  {
    title: 'Website Builder',
    description: 'Drag-and-drop interface for easy website creation',
    icon: '/icons/builder.svg',
    metrics: {
      timeToLaunch: '30 minutes',
      satisfaction: '95%'
    }
  },
  {
    title: 'Event Management',
    description: 'Create and manage restaurant events and tickets',
    icon: '/icons/events.svg',
    metrics: {
      setupTime: '15 minutes',
      ticketSales: '+40%'
    }
  },
  {
    title: 'Location Management',
    description: 'Manage multiple restaurant locations easily',
    icon: '/icons/locations.svg',
    metrics: {
      maxLocations: '3',
      updateTime: '5 minutes'
    }
  }
] as const;

// Social proof metrics
const SOCIAL_PROOF = {
  restaurants: '1000+',
  events: '5000+',
  satisfaction: '95%',
  uptime: '99.9%'
} as const;

const HomePage: React.FC = () => {
  // Intersection observer hooks for lazy loading and animations
  const [heroRef, heroInView] = useIntersectionObserver({ threshold: 0.1 });
  const [featuresRef, featuresInView] = useIntersectionObserver({ threshold: 0.1 });
  const [metricsRef, metricsInView] = useIntersectionObserver({ threshold: 0.1 });

  // Handle CTA clicks with analytics
  const handleGetStarted = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Track conversion event
    window.gtag?.('event', 'conversion', {
      event_category: 'engagement',
      event_label: 'get_started_click'
    });
    window.location.href = '/register';
  }, []);

  // Preload critical images
  useEffect(() => {
    const images = ['/hero-image.webp', ...FEATURES.map(f => f.icon)];
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="light" className="absolute" />

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className={`
          relative pt-32 pb-20 px-4 sm:px-6 lg:px-8
          min-h-[90vh] flex items-center
          bg-gradient-to-br from-blue-50 to-white
          transform-gpu transition-opacity duration-500
          ${heroInView ? 'opacity-100' : 'opacity-0'}
        `}
        aria-label="Hero section"
      >
        <div className="max-w-7xl mx-auto">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
                Launch Your Restaurant's Digital Presence in Minutes
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                Create a professional website, manage events, and handle multiple locations
                with our all-in-one platform designed for small restaurants.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleGetStarted}
                  size="lg"
                  className="w-full sm:w-auto"
                  aria-label="Get started with website builder"
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => window.location.href = '/demo'}
                  aria-label="Watch platform demo"
                >
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-6 relative">
              <Image
                src="/hero-image.webp"
                alt="Restaurant website builder interface preview"
                width={640}
                height={480}
                priority
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        ref={featuresRef}
        className={`
          py-20 px-4 sm:px-6 lg:px-8 bg-white
          transform-gpu transition-all duration-500 delay-100
          ${featuresInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}
        aria-label="Features section"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need to Succeed Online
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors"
              >
                <Image
                  src={feature.icon}
                  alt={`${feature.title} icon`}
                  width={48}
                  height={48}
                  className="mb-4"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <dl className="grid grid-cols-2 gap-4">
                  {Object.entries(feature.metrics).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm text-gray-500">{key}</dt>
                      <dd className="text-lg font-semibold text-blue-600">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section
        ref={metricsRef}
        className={`
          py-16 px-4 sm:px-6 lg:px-8 bg-gray-50
          transform-gpu transition-all duration-500 delay-200
          ${metricsInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}
        aria-label="Social proof section"
      >
        <div className="max-w-7xl mx-auto">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {Object.entries(SOCIAL_PROOF).map(([key, value]) => (
              <div key={key} className="text-center">
                <dt className="text-sm text-gray-500 uppercase tracking-wide">
                  {key.replace(/_/g, ' ')}
                </dt>
                <dd className="mt-2 text-3xl font-bold text-blue-600">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Transform Your Restaurant's Online Presence?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of restaurants already growing their business with us.
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto"
            aria-label="Start free trial"
          >
            Start Free Trial
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;