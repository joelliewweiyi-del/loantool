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
import MonthlyApproval from "./pages/MonthlyApproval";
import AfasData from "./pages/AfasData";
import AfasGLExplorer from "./pages/AfasGLExplorer";
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
        path="/afas-data"
        element={
          <ProtectedRoute>
            <AfasData />
          </ProtectedRoute>
        }
      />
      <Route
        path="/afas-gl-explorer"
        element={
          <ProtectedRoute>
            <AfasGLExplorer />
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
