import { lazy } from 'react';

import {
  createBrowserRouter,
  Navigate,
} from 'react-router-dom';

import type { RouteObject } from 'react-router-dom';

import { AppShell } from '@/app/AppShell';
import { AccessGuard } from '@/app/guards/AccessGuard';
import { isDevelopment } from '@/app/config/env';

import { RouteError } from './RouteError';

const LaunchPage = lazy(
  () => import('@/features/welcome/LaunchPage'),
);

const WelcomePage = lazy(
  () => import('@/features/welcome/WelcomePage'),
);

const CredentialsPage = lazy(
  () => import('@/features/auth/pages/CredentialsPage'),
);

const ForgotPasswordPage = lazy(
  () => import('@/features/auth/pages/ForgotPasswordPage'),
);

const ResetPasswordPage = lazy(
  () => import('@/features/auth/pages/ResetPasswordPage'),
);

const AuthCallbackPage = lazy(
  () => import('@/features/auth/pages/AuthCallbackPage'),
);

const AuthContinuePage = lazy(
  () => import('@/features/auth/pages/AuthContinuePage'),
);

const OnboardingPage = lazy(
  () => import('@/features/onboarding/OnboardingPage'),
);

const CompletionPage = lazy(
  () => import('@/features/onboarding/CompletionPage'),
);


const NotFoundPage = lazy(
  () => import('@/app/pages/NotFoundPage'),
);

const LessonPage = lazy(
  () => import('@/features/learning/LessonPage'),
);
const LibraryPage = lazy(() => import('@/features/learning/LibraryPage'));
const StudyWorkspace = lazy(() => import('@/features/study/StudyWorkspace'));

const VisualLab = lazy(
  () => import('@/pages/VisualLab'),
);

const VisualLabPage = lazy(
  () => import('@/features/visuals/VisualLabPage'),
);

const ExamsHomePage = lazy(() => import('@/features/competitive/ExamPages').then((m) => ({ default: m.ExamsHomePage })));
const ExamPage = lazy(() => import('@/features/competitive/ExamPages').then((m) => ({ default: m.ExamPage })));
const ExamSubjectPage = lazy(() => import('@/features/competitive/ExamPages').then((m) => ({ default: m.ExamSubjectPage })));
const ExamTopicPage = lazy(() => import('@/features/competitive/ExamPages').then((m) => ({ default: m.ExamTopicPage })));
const ExamPyqPage = lazy(() => import('@/features/competitive/ExamPages').then((m) => ({ default: m.ExamPyqPage })));
const ExamTestRunner = lazy(() => import('@/features/competitive/ExamTestRunner').then((m) => ({ default: m.ExamTestRunner })));

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AnatomyHomePage = lazy(() => import('@/features/anatomy/AnatomyPages').then((m) => ({ default: m.AnatomyHomePage })));
const AnatomySystemPage = lazy(() => import('@/features/anatomy/AnatomyPages').then((m) => ({ default: m.AnatomySystemPage })));
const AnatomyOrganPage = lazy(() => import('@/features/anatomy/AnatomyPages').then((m) => ({ default: m.AnatomyOrganPage })));
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const PlannerPage = lazy(() => import('@/features/planner/PlannerPage'));
const FocusPage = lazy(() => import('@/features/focus/FocusPage'));
const NotesPage = lazy(() => import('@/features/notes/NotesPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const SettingsPage = lazy(() => import('@/features/profile/SettingsPage'));
const AdminRoutes = lazy(() => import('@/features/admin/AdminRoutes'));

function developmentRoutes(): RouteObject[] {
  if (!isDevelopment) return [];

  const DesignSystemPage = lazy(
    () => import('@/features/design-system/DesignSystemPage'),
  );

  const CurriculumDevPage = lazy(
    () => import('@/features/curriculum/CurriculumDevPage'),
  );

  const ContentDevPage = lazy(
    () => import('@/features/learning/LessonPage'),
  );

  return [
    {
      element: <AccessGuard audience="session" />,
      children: [
        {
          path: 'dev/design-system',
          element: <DesignSystemPage />,
        },
        {
          path: 'dev/curriculum',
          element: <CurriculumDevPage />,
        },
        {
          path: 'dev/content/:lessonId',
          element: <ContentDevPage preview />,
        },
        {
          path: 'dev/chapter/:chapterId',
          element: <ContentDevPage preview />,
        },
        {
          path: 'dev/visual-lab/:visualizationId',
          element: <VisualLabPage />,
        },
      ],
    },
  ];
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,

    children: [
      ...developmentRoutes(),

      { index: true, element: <LaunchPage /> },

      // Callback/reset routes must not sit behind PublicOnly behavior.
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: 'auth/continue', element: <AuthContinuePage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'visual-lab', element: <VisualLab /> },
      { path: 'visual-lab/:simId', element: <VisualLab /> },

      {
        element: <AccessGuard audience="public" />,
        children: [
          { path: 'welcome', element: <WelcomePage /> },
          {
            path: 'login',
            element: <CredentialsPage key="login" mode="login" />,
          },
          {
            path: 'signup',
            element: <CredentialsPage key="signup" mode="signup" />,
          },
          {
            path: 'forgot-password',
            element: <ForgotPasswordPage />,
          },
        ],
      },

      {
        element: <AccessGuard audience="onboarding" />,
        children: [
          { path: 'onboarding', element: <OnboardingPage /> },
        ],
      },

      {
        element: <AccessGuard audience="session" />,
        children: [
          {
            path: 'onboarding/complete',
            element: <CompletionPage />,
          },
        ],
      },

      {
        path: 'app',
        element: <AccessGuard audience="app" />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          { path: 'anatomy', element: <AnatomyHomePage /> },
          { path: 'anatomy/:systemSlug', element: <AnatomySystemPage /> },
          { path: 'anatomy/:systemSlug/:organSlug', element: <AnatomyOrganPage /> },
          { path: 'progress', element: <ProgressPage /> },
          { path: 'planner', element: <PlannerPage /> },
          { path: 'focus', element: <FocusPage /> },
          { path: 'notes', element: <NotesPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'learn', element: <LibraryPage /> },
          { path: 'learn/subjects/:subjectId', element: <LibraryPage /> },
          { path: 'revision', element: <StudyWorkspace mode="revision" /> },
          { path: 'revision/quick', element: <StudyWorkspace mode="quick" /> },
          { path: 'practice', element: <StudyWorkspace mode="practice" /> },
          { path: 'practice/test', element: <StudyWorkspace mode="practice" test /> },
          { path: 'formulas', element: <StudyWorkspace mode="formulas" /> },
          { path: 'flashcards', element: <StudyWorkspace mode="flashcards" /> },
          {
            path: 'learn/lessons/:lessonId',
            element: <LessonPage />,
          },
          {
            path: 'learn/chapters/:chapterId',
            element: <LessonPage />,
          },
          {
            path: 'visual-lab',
            element: <VisualLab />,
          },
          {
            path: 'visual-lab/:visualizationId',
            element: <VisualLabPage />,
          },
          { path: 'exams', element: <ExamsHomePage /> },
          { path: 'exams/:examKey', element: <ExamPage /> },
          { path: 'exams/:examKey/pyq', element: <ExamPyqPage /> },
          { path: 'exams/:examKey/test', element: <ExamTestRunner /> },
          { path: 'exams/:examKey/:subjectSlug', element: <ExamSubjectPage /> },
          { path: 'exams/:examKey/:subjectSlug/topics/:topicId', element: <ExamTopicPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },

      {
        element: <AccessGuard audience="app" />,
        children: [
          { path: 'admin/*', element: <AdminRoutes /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
