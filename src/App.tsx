import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import Register from "./pages/register";
import OnboardingWizard from "./pages/setup/OnboardingWizard";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import DesignSystem from "./pages/DesignSystem";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup/onboarding" element={<OnboardingWizard />} />
          <Route path="/design-system" element={<DesignSystem />} />

          {/* App shell routes */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/opd" element={<ComingSoon />} />
            <Route path="/ipd" element={<ComingSoon />} />
            <Route path="/emergency" element={<ComingSoon />} />
            <Route path="/ot" element={<ComingSoon />} />
            <Route path="/nursing" element={<ComingSoon />} />
            <Route path="/lab" element={<ComingSoon />} />
            <Route path="/radiology" element={<ComingSoon />} />
            <Route path="/pharmacy" element={<ComingSoon />} />
            <Route path="/billing" element={<ComingSoon />} />
            <Route path="/insurance" element={<ComingSoon />} />
            <Route path="/payments" element={<ComingSoon />} />
            <Route path="/hr" element={<ComingSoon />} />
            <Route path="/inventory" element={<ComingSoon />} />
            <Route path="/quality" element={<ComingSoon />} />
            <Route path="/settings" element={<ComingSoon />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
