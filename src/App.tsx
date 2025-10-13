import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Modules from "./pages/Modules";
import ModuleDetail from "./pages/ModuleDetail";
import Consultation from "./pages/Consultation";
import Competencies from "./pages/Competencies";
import Analytics from "./pages/Analytics";
import Insights from "./pages/Insights";
import LearningInsights from "./pages/LearningInsights";
import BulkImport from "./pages/BulkImport";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import AppLayout from "./components/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/modules"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Modules />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/modules/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ModuleDetail />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultation"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Consultation />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/competencies"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Competencies />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute requiredRole="manager">
                  <AppLayout>
                    <Analytics />
                  </AppLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute requiredRole="manager">
                  <AppLayout>
                    <Insights />
                  </AppLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/learning-insights"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute requiredRole="manager">
                  <AppLayout>
                    <LearningInsights />
                  </AppLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bulk-import"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute requiredRole="manager">
                  <AppLayout>
                    <BulkImport />
                  </AppLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
