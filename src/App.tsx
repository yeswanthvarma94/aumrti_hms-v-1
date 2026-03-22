import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/login/LoginPage";
import Register from "./pages/register";
import OnboardingWizard from "./pages/setup/OnboardingWizard";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import OPDPage from "./pages/opd/OPDPage";
import OTPage from "./pages/ot/OTPage";
import LabPage from "./pages/lab/LabPage";
import RadiologyPage from "./pages/radiology/RadiologyPage";
import IPDPage from "./pages/ipd/IPDPage";
import EmergencyPage from "./pages/emergency/EmergencyPage";
import PatientsPage from "./pages/patients/PatientsPage";
import NursingPage from "./pages/nursing/NursingPage";
import SettingsPage from "./pages/settings/SettingsPage";
import SettingsStaffPage from "./pages/settings/SettingsStaffPage";
import SettingsDepartmentsPage from "./pages/settings/SettingsDepartmentsPage";
import SettingsWardsPage from "./pages/settings/SettingsWardsPage";
import SettingsServicesPage from "./pages/settings/SettingsServicesPage";
import SettingsDrugsPage from "./pages/settings/SettingsDrugsPage";
import SettingsProfilePage from "./pages/settings/SettingsProfilePage";
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup/onboarding" element={<OnboardingWizard />} />
          <Route path="/design-system" element={<DesignSystem />} />

          {/* App shell routes */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/opd" element={<OPDPage />} />
            <Route path="/ipd" element={<IPDPage />} />
            <Route path="/emergency" element={<EmergencyPage />} />
            <Route path="/ot" element={<OTPage />} />
            <Route path="/nursing" element={<NursingPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/radiology" element={<ComingSoon />} />
            <Route path="/pharmacy" element={<ComingSoon />} />
            <Route path="/billing" element={<ComingSoon />} />
            <Route path="/insurance" element={<ComingSoon />} />
            <Route path="/payments" element={<ComingSoon />} />
            <Route path="/hr" element={<ComingSoon />} />
            <Route path="/inventory" element={<ComingSoon />} />
            <Route path="/quality" element={<ComingSoon />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/staff" element={<SettingsStaffPage />} />
            <Route path="/settings/departments" element={<SettingsDepartmentsPage />} />
            <Route path="/settings/wards" element={<SettingsWardsPage />} />
            <Route path="/settings/services" element={<SettingsServicesPage />} />
            <Route path="/settings/drugs" element={<SettingsDrugsPage />} />
            <Route path="/settings/profile" element={<SettingsProfilePage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
