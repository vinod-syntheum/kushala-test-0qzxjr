'use client';

import { useRouter } from 'next/navigation'; // v14.x
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

/**
 * A user-friendly 404 error page component that provides clear navigation options
 * and tracks error occurrences for analytics purposes.
 */
const NotFound: React.FC = () => {
  const router = useRouter();

  // Track 404 occurrence when component mounts
  React.useEffect(() => {
    // Analytics tracking would be implemented here
    console.info('404 error page viewed');
  }, []);

  const handleHomeNavigation = React.useCallback(() => {
    // Track navigation interaction
    console.info('404 page: Navigate to home clicked');
    router.push('/');
  }, [router]);

  return (
    <main 
      className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900"
      role="main"
      aria-labelledby="error-title"
    >
      <Card
        variant="elevated"
        padding="large"
        className="w-full max-w-md mx-auto text-center"
        testId="not-found-card"
      >
        {/* Error status code for screen readers */}
        <span className="sr-only">Error 404</span>

        {/* Visual error illustration */}
        <div 
          className="w-64 h-64 mx-auto mb-8"
          role="img"
          aria-label="Page not found illustration"
        >
          {/* Placeholder for custom 404 illustration */}
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-6xl">404</span>
          </div>
        </div>

        {/* Error message */}
        <h1 
          id="error-title"
          className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2"
        >
          Page Not Found
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We couldn't find the page you're looking for. It might have been moved or deleted.
        </p>

        {/* Navigation button */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleHomeNavigation}
          className="mx-auto"
          ariaLabel="Return to homepage"
        >
          Return to Homepage
        </Button>
      </Card>
    </main>
  );
};

export default NotFound;