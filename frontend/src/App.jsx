import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Existing Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FilesPage from './pages/FilesPage';
import MedicationsPage from './pages/MedicationsPage';
import EmergencyPage from './pages/EmergencyPage';
import ProfileSetup from './pages/ProfileSetup';
import SummarizationPage from './pages/SummarizationPage';
import NotesPage from './pages/NotesPage';
import CaregiverEmergencyView from './pages/CaregiverEmergencyView';

// Voice Helper and HITL Pages
import VoiceHelper from './components/VoiceHelper';
import HITLReviewDashboard from './components/HITLReviewDashboard';

import './index.css';
import LandingPage from './pages/LandingPage';

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
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

/* ==================== ONBOARDING ROUTE ==================== */
const OnboardingRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isProfileIncomplete = !user?.fullName || !user?.phoneNumber;
  if (user?.userType === 'DEMENTIA_PATIENT' && isProfileIncomplete) return children;

  return <Navigate to="/dashboard" replace />;
};

/* ==================== PROTECTED ROUTE ==================== */
const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isProfileIncomplete = !user?.fullName || !user?.phoneNumber;
  if (user?.userType === 'DEMENTIA_PATIENT' && isProfileIncomplete) {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
};

/* ==================== HITL REVIEWER ROUTE ==================== */
const HITLReviewerRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.userType !== 'CAREGIVER') return <Navigate to="/dashboard" replace />;
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
      <Route path="/profile-setup" element={<OnboardingRoute><ProfileSetup /></OnboardingRoute>} />

      {/* -------- PROTECTED PAGES -------- */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
      <Route path="/medications" element={<ProtectedRoute><MedicationsPage /></ProtectedRoute>} />
      <Route path="/emergency" element={<ProtectedRoute><EmergencyPage /></ProtectedRoute>} />
      <Route path="/summarization" element={<ProtectedRoute><SummarizationPage /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}