import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireAdmin, RequireAuth } from './components/Guards';
import { Spinner } from './components/ui';
import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';
import Landing from './pages/Landing';
import { About, HowItWorks, LegalPage, ResourcesPreview } from './pages/PublicPages';
import { ForgotPassword, Login, Register, ResetPassword } from './pages/AuthPages';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Support = lazy(() => import('./pages/Support'));
const Opportunities = lazy(() => import('./pages/Opportunities'));
const Saved = lazy(() => import('./pages/Saved'));
const Work = lazy(() => import('./pages/Work'));
const Biz = lazy(() => import('./pages/Biz'));
const Documents = lazy(() => import('./pages/Documents'));
const Tracker = lazy(() => import('./pages/Tracker'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6 text-violet-300" /></div>}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/resources" element={<ResourcesPreview />} />
          {['privacy', 'terms', 'contact', 'disclaimer'].map((p) => <Route key={p} path={`/${p}`} element={<LegalPage kind={p} />} />)}
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/support" element={<Support />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/work" element={<Work />} />
            <Route path="/biz" element={<Biz />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route element={<RequireAdmin />}><Route path="/admin" element={<Admin />} /></Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
