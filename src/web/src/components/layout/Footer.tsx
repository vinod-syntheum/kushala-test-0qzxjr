// @package react v18.0.0
// @package next v14.0.0
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Support resources for restaurant owners
const SUPPORT_RESOURCES = [
  {
    title: 'Help Center',
    href: '/help',
    description: 'Get started and learn more'
  },
  {
    title: 'Restaurant Guide',
    href: '/guide',
    description: 'Best practices and tips'
  },
  {
    title: 'Contact Support',
    href: '/contact',
    description: '24/7 customer service'
  }
] as const;

// Quick navigation links
const QUICK_LINKS = [
  { title: 'Features', href: '/features' },
  { title: 'Pricing', href: '/pricing' },
  { title: 'Blog', href: '/blog' }
] as const;

// Legal and compliance links
const LEGAL_LINKS = [
  { title: 'Privacy Policy', href: '/privacy' },
  { title: 'Terms of Service', href: '/terms' },
  { title: 'Cookie Policy', href: '/cookies' }
] as const;

const Footer: React.FC = React.memo(() => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200" role="contentinfo" aria-label="Site footer">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company branding section */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center" aria-label="Homepage">
              <Image
                src="/logo.svg"
                alt="Digital Presence MVP Logo"
                width={150}
                height={40}
                priority={false}
              />
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              Empowering small restaurants with powerful digital presence solutions.
            </p>
          </div>

          {/* Support resources section */}
          <div className="col-span-1">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Support Resources
            </h2>
            <ul className="mt-4 space-y-4">
              {SUPPORT_RESOURCES.map(({ title, href, description }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group"
                    aria-label={`${title} - ${description}`}
                  >
                    <div className="text-base font-medium text-gray-900 group-hover:text-blue-600">
                      {title}
                    </div>
                    <p className="text-sm text-gray-500">{description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links section */}
          <div className="col-span-1">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Quick Links
            </h2>
            <ul className="mt-4 space-y-4">
              {QUICK_LINKS.map(({ title, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-base text-gray-600 hover:text-blue-600"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links section */}
          <div className="col-span-1">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Legal
            </h2>
            <ul className="mt-4 space-y-4">
              {LEGAL_LINKS.map(({ title, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-base text-gray-600 hover:text-blue-600"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar with copyright */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © {currentYear} Digital Presence MVP. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <Link
                href="/accessibility"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Accessibility
              </Link>
              <Link
                href="/sitemap"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;