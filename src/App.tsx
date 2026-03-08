import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./hooks/useAuth";
import { RequireAuth, RequireRole } from "./components/auth/Guards";
import { ErrorBoundary } from "./components/ui/error-boundary";

// Lazy loaded routes
const Index = lazy(() => import("./pages/Index"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const RecordDetail = lazy(() => import("./pages/RecordDetail"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const RiskManagementPage = lazy(() => import("./pages/RiskManagementPage"));
const AdminAccounts = lazy(() => import("./pages/AdminAccounts"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
                <Route path="/module/:moduleId" element={<RequireAuth><ModulePage /></RequireAuth>} />
                <Route path="/record/*" element={<RequireAuth><RecordDetail /></RequireAuth>} />
                <Route path="/audit" element={<RequireAuth><AuditPage /></RequireAuth>} />
                <Route path="/archive" element={<RequireAuth><ArchivePage /></RequireAuth>} />
                <Route path="/risk-management" element={<RequireAuth><RiskManagementPage /></RequireAuth>} />
                <Route path="/activity" element={<RequireAuth><ActivityPage /></RequireAuth>} />
                <Route path="/admin/accounts" element={<RequireRole roles={["admin"]}><AdminAccounts /></RequireRole>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
