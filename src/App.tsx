import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Loans from "./pages/Loans";
import LoanDetail from "./pages/LoanDetail";
import Afas from "./pages/Afas";
import MonthlyApproval from "./pages/MonthlyApproval";
import Export from "./pages/Export";
import Activity from "./pages/Activity";
import Portfolio from "./pages/Portfolio";
import Collateral from "./pages/Collateral";
import Compliance from "./pages/Compliance";
import Funding from "./pages/Funding";
import NotFound from "./pages/NotFound";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      retry: 1, // Only retry once on failure
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Navigate to="/loans" replace />} />
      <Route
        path="/loans"
        element={
          <ProtectedRoute>
            <Loans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loans/:id"
        element={
          <ProtectedRoute>
            <LoanDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monthly-approval"
        element={
          <ProtectedRoute>
            <MonthlyApproval />
          </ProtectedRoute>
        }
      />
      <Route
        path="/afas"
        element={
          <ProtectedRoute>
            <Afas />
          </ProtectedRoute>
        }
      />
      {/* Redirects from old AFAS routes */}
      <Route path="/afas-dashboard" element={<Navigate to="/afas" replace />} />
      <Route path="/afas-data" element={<Navigate to="/afas?tab=data" replace />} />
      <Route path="/afas-gl-explorer" element={<Navigate to="/afas" replace />} />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <Activity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/export"
        element={
          <ProtectedRoute>
            <Export />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collateral"
        element={
          <ProtectedRoute>
            <Collateral />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance"
        element={
          <ProtectedRoute>
            <Compliance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/funding"
        element={
          <ProtectedRoute>
            <Funding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portfolio"
        element={
          <ProtectedRoute>
            <Portfolio />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
