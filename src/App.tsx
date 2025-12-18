import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RealtimeNotifications from "./components/RealtimeNotifications";
import OrderNotifications from "./components/OrderNotifications";
import UploadFailureMonitor from "./components/upload-history/UploadFailureMonitor";
import SessionTimeoutWarning from "./components/SessionTimeoutWarning";
import { useInactivityTimeout } from "./hooks/useInactivityTimeout";
import { useAutoSessionExtend } from "./hooks/useAutoSessionExtend";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import KnowledgeBase from "./pages/KnowledgeBase";
import SmsHistory from "./pages/SmsHistory";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// App content that requires AuthProvider context
const AppContent = () => {
  useInactivityTimeout(30); // 30 minute inactivity timeout when "Remember me" is unchecked
  useAutoSessionExtend(); // Automatically extends session in background when user is active
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppContent />
        <SessionTimeoutWarning />
        <RealtimeNotifications />
        <UploadFailureMonitor />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OrderNotifications />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <Upload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge-base"
              element={
                <ProtectedRoute>
                  <KnowledgeBase />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sms-history"
              element={
                <ProtectedRoute>
                  <SmsHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
