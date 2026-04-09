import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Existing Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
import Home from './pages/DashboardPage';
import { WalletContextProvider } from './contexts/WalletContext';

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

/* ==================== ONBOARDING ROUTE ==================== */
const OnboardingRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isProfileIncomplete = !user?.fullName || !user?.phoneNumber;
  if (user?.userType === 'DEMENTIA_PATIENT' && isProfileIncomplete) return children;

  return <Navigate to="/home" replace />;
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
  if (user?.userType !== 'CAREGIVER') return <Navigate to="/home" replace />;
  return children;
};

/* ==================== APP ROUTES ==================== */
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
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
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
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

/* ==================== MAIN APP ==================== */
export default function App() {
  return (
    <WalletContextProvider>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </WalletContextProvider>
  );
}