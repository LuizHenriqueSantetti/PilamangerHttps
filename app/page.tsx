'use client';

import App from '../src/app/App';
import { ErrorBoundary } from '../src/app/components/ErrorBoundary';
import { I18nProvider } from '../src/app/i18n/I18nProvider';

export default function Page() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  );
}
