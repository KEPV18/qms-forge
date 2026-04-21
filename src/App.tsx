import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./hooks/useAuth";
import { RequireAuth, RequireRole } from "./components/auth/Guards";
import { ErrorBoundary, ErrorFallback } from "./components/ui/ErrorBoundary";
import { ThemeProvider } from "./hooks/useTheme";

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
const ProceduresPage = lazy(() => import("./pages/ProceduresPage"));
const ISOManualPage = lazy(() => import("./pages/ISOManualPage"));
const FormsRegistryPage = lazy(() => import("./pages/FormsRegistryPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const RecordCreationPage = lazy(() => import("./pages/RecordCreationPage"));
const RecordListPage = lazy(() => import("./pages/RecordListPage"));
const RecordViewPage = lazy(() => import("./pages/RecordViewPage"));
const DataIntegrityPage = lazy(() => import("./pages/DataIntegrityPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 minute default
      gcTime: 10 * 60_000,      // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Page-level error boundary with retry button
function PageBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={
      <ErrorFallback
        title="Page Error"
        message="Something went wrong on this page. Try refreshing or go back to the dashboard."
        onRetry={() => window.location.reload()}
      />
    }>
      {children}
    </ErrorBoundary>
  );
}

const App = () => {
  // Apply saved accent color on boot
  const savedAccent = localStorage.getItem('accentColor') || 'cyan';
  document.documentElement.setAttribute('data-accent', savedAccent);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<PageBoundary><Login /></PageBoundary>} />
                    <Route path="/register" element={<PageBoundary><Register /></PageBoundary>} />
                    <Route path="/auth/callback" element={<PageBoundary><AuthCallback /></PageBoundary>} />
                    <Route path="/" element={<RequireAuth><PageBoundary><Index /></PageBoundary></RequireAuth>} />
                    <Route path="/module/:moduleId" element={<RequireAuth><PageBoundary><ModulePage /></PageBoundary></RequireAuth>} />
                    <Route path="/record/*" element={<RequireAuth><PageBoundary><RecordDetail /></PageBoundary></RequireAuth>} />
                    <Route path="/audit" element={<RequireAuth><PageBoundary><AuditPage /></PageBoundary></RequireAuth>} />
                    <Route path="/projects" element={<RequireAuth><PageBoundary><ProjectsPage /></PageBoundary></RequireAuth>} />
                    <Route path="/project/:projectName" element={<RequireAuth><PageBoundary><ProjectDetailPage /></PageBoundary></RequireAuth>} />
                    <Route path="/archive" element={<RequireAuth><PageBoundary><ArchivePage /></PageBoundary></RequireAuth>} />
                    <Route path="/risk-management" element={<RequireAuth><PageBoundary><RiskManagementPage /></PageBoundary></RequireAuth>} />
                    <Route path="/activity" element={<RequireAuth><PageBoundary><ActivityPage /></PageBoundary></RequireAuth>} />
                    <Route path="/procedures" element={<RequireAuth><PageBoundary><ProceduresPage /></PageBoundary></RequireAuth>} />
                    <Route path="/iso-manual" element={<RequireAuth><PageBoundary><ISOManualPage /></PageBoundary></RequireAuth>} />
                    <Route path="/forms" element={<RequireAuth><PageBoundary><FormsRegistryPage /></PageBoundary></RequireAuth>} />
                    <Route path="/create" element={<RequireAuth><PageBoundary><RecordCreationPage /></PageBoundary></RequireAuth>} />
                    <Route path="/records" element={<RequireAuth><PageBoundary><RecordListPage /></PageBoundary></RequireAuth>} />
                    <Route path="/records/:serial" element={<RequireAuth><PageBoundary><RecordViewPage /></PageBoundary></RequireAuth>} />
                    <Route path="/integrity" element={<RequireAuth><PageBoundary><DataIntegrityPage /></PageBoundary></RequireAuth>} />
                    <Route path="/admin/accounts" element={<RequireRole roles={["admin"]}><PageBoundary><AdminAccounts /></PageBoundary></RequireRole>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;