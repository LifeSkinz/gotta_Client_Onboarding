import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import CoachProfilePage from "./pages/CoachProfilePage";
import CoachesPage from "./pages/CoachesPage";
import PreviewPage from "./pages/PreviewPage";
import { UserSessionsPage } from "./components/UserSessionsPage";
import VideoSessionPage from "./pages/VideoSessionPage";
import SessionPortalPage from "./pages/SessionPortalPage";
import { PaymentSuccessPage } from "./pages/PaymentSuccessPage";
import { PaymentCancelledPage } from "./pages/PaymentCancelledPage";
import CoachResponseSuccessPage from "./pages/CoachResponseSuccessPage";
import SessionPortalFallbackPage from "./pages/SessionPortalFallbackPage";
import ProfilePage from "./pages/ProfilePage";
import CoachResponsePage from "./pages/CoachResponsePage";
import CoachSessionLandingPage from "./pages/CoachSessionLandingPage";
import CoachOnboardingPage from "./pages/CoachOnboardingPage";
import { AdminCoachesPage } from "./pages/AdminCoachesPage";
import { CoachDashboardPage } from "./pages/CoachDashboardPage";
import { CoachSignupRequestPage } from "./pages/CoachSignupRequestPage";
import { JoinSessionRedirect } from "./components/JoinSessionRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthGuard><AuthPage /></AuthGuard>} />
            <Route path="/coaches" element={<AuthGuard requireAuth><CoachesPage /></AuthGuard>} />
            <Route path="/coach/:id" element={<AuthGuard requireAuth><CoachProfilePage /></AuthGuard>} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/sessions" element={<AuthGuard requireAuth><UserSessionsPage /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard requireAuth><ProfilePage /></AuthGuard>} />
            <Route path="/session/:sessionId" element={<SessionPortalPage />} />
            <Route path="/session-portal/:sessionId" element={<SessionPortalPage />} />
            <Route path="/session-portal" element={<SessionPortalFallbackPage />} />
            <Route path="/coach-response-success" element={<CoachResponseSuccessPage />} />
            <Route path="/coach-response" element={<CoachResponsePage />} />
            <Route path="/coach-session/:sessionId" element={<CoachSessionLandingPage />} />
            <Route path="/coach-onboard" element={<CoachOnboardingPage />} />
            <Route path="/coach-dashboard" element={<AuthGuard requireAuth><CoachDashboardPage /></AuthGuard>} />
            <Route path="/admin/coaches" element={<AuthGuard requireAuth><AdminCoachesPage /></AuthGuard>} />
            <Route path="/coach-signup-request" element={<CoachSignupRequestPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
            <Route path="/join-session" element={<JoinSessionRedirect />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
