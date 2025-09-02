import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/coaches" element={<CoachesPage />} />
          <Route path="/coach/:id" element={<CoachProfilePage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/sessions" element={<UserSessionsPage />} />
          <Route path="/session/:sessionId" element={<VideoSessionPage />} />
          <Route path="/session-portal/:sessionId" element={<SessionPortalPage />} />
          <Route path="/session-portal" element={<SessionPortalFallbackPage />} />
          <Route path="/coach-response-success" element={<CoachResponseSuccessPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
