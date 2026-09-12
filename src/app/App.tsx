import { RouterProvider } from 'react-router-dom';

import { getEnvironment } from './config/env';

import { AppProviders } from './providers/AppProviders';

import { router } from './router/router';

export default function App() {
  /*
   * Render-time validation allows the outer
   * error boundary to show configuration errors.
   */
  getEnvironment();

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
