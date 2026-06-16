import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

const queryClient = new QueryClient();


// Lazy-loaded Pages and Components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const SummarizationPage = lazy(() => import('./pages/SummarizationPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const CaregiverEmergencyView = lazy(() => import('./pages/CaregiverEmergencyView'));
const RoutinePage = lazy(() => import('./pages/RoutinePage'));

// Voice Helper and HITL Pages
const VoiceHelper = lazy(() => import('./components/VoiceHelper'));
const HITLReviewDashboard = lazy(() => import('./components/HITLReviewDashboard'));

import './index.css';
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Home = lazy(() => import('./pages/DashboardPage'));
import SolanaProvider from './contexts/SolanaProvider';

/* ==================== LOADING SPINNER ==================== */
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

/* ==================== PUBLIC ROUTE ==================== */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return children;
};

/* ==================== PROTECTED ROUTE ==================== */
const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
};

/* ==================== HITL REVIEWER ROUTE ==================== */
const HITLReviewerRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.userType !== 'CAREGIVER') return <Navigate to="/home" replace />;
  return children;
};

/* ==================== APP ROUTES ==================== */
// ✅ FIX: AppRoutes is defined inside App so it renders inside both
// Router and AuthProvider. Previously AuthProvider was inside Router,
// meaning if AuthProvider ever needed to call useNavigate() internally
// (e.g. to redirect after token expiry), it would fail because
// useNavigate() requires a Router ancestor — and AuthProvider was
// rendering before Router's context was available to its own children.
//
// Correct nesting order: Router → AuthProvider → Route components
// This guarantees all routing hooks are available everywhere in the tree.
function AppRoutes() {
  return (
    <Routes>

      {/* -------- PUBLIC -------- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* -------- PROFILE SETUP -------- */}
      <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />

      {/* -------- PROTECTED PAGES -------- */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

      
      {/* -------- CORE FEATURES -------- */}
      <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
      <Route path="/emergency" element={<ProtectedRoute><EmergencyPage /></ProtectedRoute>} />
      <Route path="/summarization" element={<ProtectedRoute><SummarizationPage /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
      <Route path="/routines" element={<ProtectedRoute><RoutinePage /></ProtectedRoute>} />
      <Route path="/caregiver-emergency" element={<ProtectedRoute><CaregiverEmergencyView /></ProtectedRoute>} />

      {/* -------- VOICE HELPER -------- */}
      <Route
        path="/voice-helper"
        element={
          <ProtectedRoute>
            <div className="max-w-4xl mx-auto px-4 py-8">
              <VoiceHelper />
            </div>
          </ProtectedRoute>
        }
      />

      {/* -------- HITL REVIEWER DASHBOARD -------- */}
      <Route path="/hitl-dashboard" element={<HITLReviewerRoute><HITLReviewDashboard /></HITLReviewerRoute>} />

      {/* -------- DEFAULT -------- */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

/* ==================== MAIN APP ==================== */
// ✅ FIX: Router wraps AuthProvider, not the other way around.
// Before: <Router> → <AuthProvider> (AuthProvider cannot use routing hooks)
// After:  <Router> → <AuthProvider> → <AppRoutes> (everything has Router context)
export default function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors />
      <AuthProvider>
       <QueryClientProvider client={queryClient}>
         <SolanaProvider>
           <Suspense fallback={<LoadingSpinner />}>
             <AppRoutes />
           </Suspense>
         </SolanaProvider>
       </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
}
