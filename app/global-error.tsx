'use client';

// App Router global error boundary — Next.js renders this when the
// root layout itself throws during render. It's the last line of
// defense before a blank browser tab.
//
// Sentry.captureException() ensures even these unrecoverable errors
// surface in our dashboard with a full stack trace and (if Session
// Replay caught the session) the DOM state leading up to the crash.

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
