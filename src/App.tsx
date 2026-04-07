import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/login/LoginPage";
import NotFound from "./pages/NotFound";
import AuthGuard from "@/components/auth/AuthGuard";
import RoleGuard from "@/components/auth/RoleGuard";
import ModuleErrorBoundary from "@/components/auth/ModuleErrorBoundary";
import { ROUTE_ROLES } from "@/lib/routeRoles";

const Register = lazy(() => import("./pages/register"));
const OnboardingWizard = lazy(() => import("./pages/setup/OnboardingWizard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const QualityPage = lazy(() => import("./pages/quality/QualityPage"));
const BillingPage = lazy(() => import("./pages/billing/BillingPage"));
const PaymentsPage = lazy(() => import("./pages/billing/PaymentsPage"));
const PharmacyPage = lazy(() => import("./pages/pharmacy/PharmacyPage"));
const OPDPage = lazy(() => import("./pages/opd/OPDPage"));
const OTPage = lazy(() => import("./pages/ot/OTPage"));
const LabPage = lazy(() => import("./pages/lab/LabPage"));
const RadiologyPage = lazy(() => import("./pages/radiology/RadiologyPage"));
const IPDPage = lazy(() => import("./pages/ipd/IPDPage"));
const EmergencyPage = lazy(() => import("./pages/emergency/EmergencyPage"));
const InsurancePage = lazy(() => import("./pages/insurance/InsurancePage"));
const PatientsPage = lazy(() => import("./pages/patients/PatientsPage"));
const NursingPage = lazy(() => import("./pages/nursing/NursingPage"));
const HRPage = lazy(() => import("./pages/hr/HRPage"));
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const SettingsBankAccountsPage = lazy(() => import("./pages/settings/SettingsBankAccountsPage"));
const SettingsStaffPage = lazy(() => import("./pages/settings/SettingsStaffPage"));
const SettingsDepartmentsPage = lazy(() => import("./pages/settings/SettingsDepartmentsPage"));
const SettingsWardsPage = lazy(() => import("./pages/settings/SettingsWardsPage"));
const SettingsServicesPage = lazy(() => import("./pages/settings/SettingsServicesPage"));
const SettingsDrugsPage = lazy(() => import("./pages/settings/SettingsDrugsPage"));
const SettingsProfilePage = lazy(() => import("./pages/settings/SettingsProfilePage"));
const SettingsRolesPage = lazy(() => import("./pages/settings/SettingsRolesPage"));
const SettingsBrandingPage = lazy(() => import("./pages/settings/SettingsBrandingPage"));
const SettingsWhatsAppPage = lazy(() => import("./pages/settings/SettingsWhatsAppPage"));
const SettingsLanguagePage = lazy(() => import("./pages/settings/SettingsLanguagePage"));
const SettingsPlanPage = lazy(() => import("./pages/settings/SettingsPlanPage"));
const SettingsShiftsPage = lazy(() => import("./pages/settings/SettingsShiftsPage"));
const SettingsModulesPage = lazy(() => import("./pages/settings/SettingsModulesPage"));
const SettingsDoctorSchedulesPage = lazy(() => import("./pages/settings/SettingsDoctorSchedulesPage"));
const SettingsLabTestsPage = lazy(() => import("./pages/settings/SettingsLabTestsPage"));
const SettingsConsentFormsPage = lazy(() => import("./pages/settings/SettingsConsentFormsPage"));
const SettingsOTChecklistPage = lazy(() => import("./pages/settings/SettingsOTChecklistPage"));
const SettingsProtocolsPage = lazy(() => import("./pages/settings/SettingsProtocolsPage"));
const SettingsThresholdsPage = lazy(() => import("./pages/settings/SettingsThresholdsPage"));
const SettingsDischargeWorkflowPage = lazy(() => import("./pages/settings/SettingsDischargeWorkflowPage"));
const SettingsApprovalsPage = lazy(() => import("./pages/settings/SettingsApprovalsPage"));
const SettingsOPDWorkflowPage = lazy(() => import("./pages/settings/SettingsOPDWorkflowPage"));
const SettingsNotificationsPage = lazy(() => import("./pages/settings/SettingsNotificationsPage"));
const SettingsReportSchedulesPage = lazy(() => import("./pages/settings/SettingsReportSchedulesPage"));
const SettingsRazorpayPage = lazy(() => import("./pages/settings/SettingsRazorpayPage"));
const SettingsGSTPage = lazy(() => import("./pages/settings/SettingsGSTPage"));
const SettingsABDMPage = lazy(() => import("./pages/settings/SettingsABDMPage"));
const SettingsBackupPage = lazy(() => import("./pages/settings/SettingsBackupPage"));
const SettingsAPIKeysPage = lazy(() => import("./pages/settings/SettingsAPIKeysPage"));
const APIConfigHubPage = lazy(() => import("./pages/settings/APIConfigHubPage"));
const SettingsICDCodesPage = lazy(() => import("./pages/settings/SettingsICDCodesPage"));
const AnalyticsPage = lazy(() => import("./pages/analytics/AnalyticsPage"));
const InboxPage = lazy(() => import("./pages/inbox/InboxPage"));
const TelemedicinePage = lazy(() => import("./pages/telemedicine/TelemedicinePage"));
const HODDashboardPage = lazy(() => import("./pages/hod/HODDashboardPage"));
const TVDisplayPage = lazy(() => import("./pages/tv/TVDisplayPage"));
const DesignSystem = lazy(() => import("./pages/DesignSystem"));
const PatientPortal = lazy(() => import("./pages/portal/PatientPortal"));
const GoLiveChecklistPage = lazy(() => import("./pages/admin/GoLiveChecklistPage"));
const DataMigrationPage = lazy(() => import("./pages/admin/DataMigrationPage"));
const AccountsPage = lazy(() => import("./pages/accounts/AccountsPage"));
const OpeningBalancesPage = lazy(() => import("./pages/accounts/OpeningBalancesPage"));
const BloodBankPage = lazy(() => import("./pages/blood-bank/BloodBankPage"));
const CSSDPage = lazy(() => import("./pages/cssd/CSSDPage"));
const DialysisPage = lazy(() => import("./pages/dialysis/DialysisPage"));
const OncologyPage = lazy(() => import("./pages/oncology/OncologyPage"));
const ModulesPage = lazy(() => import("./pages/modules/ModulesPage"));
const MRDPage = lazy(() => import("./pages/mrd/MRDPage"));
const PmjayPage = lazy(() => import("./pages/pmjay/PmjayPage"));
const BiomedicalPage = lazy(() => import("./pages/biomedical/BiomedicalPage"));
const HousekeepingPage = lazy(() => import("./pages/housekeeping/HousekeepingPage"));
const HMISPage = lazy(() => import("./pages/hmis/HMISPage"));
const DietPage = lazy(() => import("./pages/dietetics/DietPage"));
const PaymentLandingPage = lazy(() => import("./pages/pay/PaymentLandingPage"));
const LMSPage = lazy(() => import("./pages/lms/LMSPage"));
const CRMPage = lazy(() => import("./pages/crm/CRMPage"));
const PROPage = lazy(() => import("./pages/pro/PROPage"));
const PhysioPage = lazy(() => import("./pages/physio/PhysioPage"));
const MortuaryPage = lazy(() => import("./pages/mortuary/MortuaryPage"));
const VaccinationPage = lazy(() => import("./pages/vaccination/VaccinationPage"));
const DentalPage = lazy(() => import("./pages/dental/DentalPage"));
const AyushPage = lazy(() => import("./pages/ayush/AyushPage"));
const PackagesPage = lazy(() => import("./pages/packages/PackagesPage"));
const IVFPage = lazy(() => import("./pages/ivf/IVFPage"));
const SettingsRadiologyPage = lazy(() => import("./pages/settings/SettingsRadiologyPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const SuspenseWrap = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div />}>{children}</Suspense>
);

const RG = ({ path, children }: { path: string; children: React.ReactNode }) => {
  const roles = ROUTE_ROLES[path];
  if (!roles) return <>{children}</>;
  return <RoleGuard allowedRoles={roles}>{children}</RoleGuard>;
};

/** Wraps a lazy module in both ErrorBoundary (crash isolation) and Suspense (loading) */
const SM = ({ name, children }: { name: string; children: React.ReactNode }) => (
  <ModuleErrorBoundary moduleName={name}>
    <Suspense fallback={<div />}>{children}</Suspense>
  </ModuleErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pay/:token" element={<SuspenseWrap><PaymentLandingPage /></SuspenseWrap>} />
          <Route path="/portal/*" element={<SuspenseWrap><PatientPortal /></SuspenseWrap>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SuspenseWrap><Register /></SuspenseWrap>} />
          <Route path="/setup/onboarding" element={<AuthGuard><SuspenseWrap><OnboardingWizard /></SuspenseWrap></AuthGuard>} />
          <Route path="/design-system" element={<SuspenseWrap><DesignSystem /></SuspenseWrap>} />
          <Route path="/tv-display" element={<SuspenseWrap><TVDisplayPage /></SuspenseWrap>} />
          <Route path="/hod-dashboard" element={<AuthGuard><SuspenseWrap><HODDashboardPage /></SuspenseWrap></AuthGuard>} />

          {/* App shell routes */}
          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/opd" element={<RG path="/opd"><OPDPage /></RG>} />
            <Route path="/ipd" element={<RG path="/ipd"><IPDPage /></RG>} />
            <Route path="/emergency" element={<RG path="/emergency"><EmergencyPage /></RG>} />
            <Route path="/ot" element={<RG path="/ot"><OTPage /></RG>} />
            <Route path="/nursing" element={<RG path="/nursing"><NursingPage /></RG>} />
            <Route path="/lab" element={<RG path="/lab"><LabPage /></RG>} />
            <Route path="/radiology" element={<RG path="/radiology"><RadiologyPage /></RG>} />
            <Route path="/pharmacy" element={<RG path="/pharmacy"><PharmacyPage /></RG>} />
            <Route path="/billing" element={<RG path="/billing"><BillingPage /></RG>} />
            <Route path="/insurance" element={<RG path="/insurance"><InsurancePage /></RG>} />
            <Route path="/payments" element={<RG path="/payments"><PaymentsPage /></RG>} />
            <Route path="/hr" element={<RG path="/hr"><HRPage /></RG>} />
            <Route path="/inventory" element={<RG path="/inventory"><InventoryPage /></RG>} />
            <Route path="/quality" element={<RG path="/quality"><QualityPage /></RG>} />
            <Route path="/analytics" element={<RG path="/analytics"><AnalyticsPage /></RG>} />
            <Route path="/telemedicine" element={<RG path="/telemedicine"><TelemedicinePage /></RG>} />
            <Route path="/inbox" element={<RG path="/inbox"><InboxPage /></RG>} />
            <Route path="/settings" element={<RG path="/settings"><SettingsPage /></RG>} />
            <Route path="/settings/bank-accounts" element={<RG path="/settings"><SettingsBankAccountsPage /></RG>} />
            <Route path="/settings/staff" element={<RG path="/settings"><SettingsStaffPage /></RG>} />
            <Route path="/settings/departments" element={<RG path="/settings"><SettingsDepartmentsPage /></RG>} />
            <Route path="/settings/wards" element={<RG path="/settings"><SettingsWardsPage /></RG>} />
            <Route path="/settings/services" element={<RG path="/settings"><SettingsServicesPage /></RG>} />
            <Route path="/settings/drugs" element={<RG path="/settings"><SettingsDrugsPage /></RG>} />
            <Route path="/settings/profile" element={<RG path="/settings"><SettingsProfilePage /></RG>} />
            <Route path="/settings/roles" element={<RG path="/settings"><SettingsRolesPage /></RG>} />
            <Route path="/settings/branding" element={<RG path="/settings"><SettingsBrandingPage /></RG>} />
            <Route path="/settings/whatsapp" element={<RG path="/settings"><SettingsWhatsAppPage /></RG>} />
            <Route path="/settings/language" element={<RG path="/settings"><SettingsLanguagePage /></RG>} />
            <Route path="/settings/plan" element={<RG path="/settings"><SettingsPlanPage /></RG>} />
            <Route path="/settings/shifts" element={<RG path="/settings"><SettingsShiftsPage /></RG>} />
            <Route path="/settings/modules" element={<RG path="/settings"><SettingsModulesPage /></RG>} />
            <Route path="/settings/doctor-schedules" element={<RG path="/settings"><SettingsDoctorSchedulesPage /></RG>} />
            <Route path="/settings/lab-tests" element={<RG path="/settings"><SettingsLabTestsPage /></RG>} />
            <Route path="/settings/consent-forms" element={<RG path="/settings"><SettingsConsentFormsPage /></RG>} />
            <Route path="/settings/ot-checklist" element={<RG path="/settings"><SettingsOTChecklistPage /></RG>} />
            <Route path="/settings/protocols" element={<RG path="/settings"><SettingsProtocolsPage /></RG>} />
            <Route path="/settings/clinical-thresholds" element={<RG path="/settings"><SettingsThresholdsPage /></RG>} />
            <Route path="/settings/discharge-workflow" element={<RG path="/settings"><SettingsDischargeWorkflowPage /></RG>} />
            <Route path="/settings/approvals" element={<RG path="/settings"><SettingsApprovalsPage /></RG>} />
            <Route path="/settings/opd-workflow" element={<RG path="/settings"><SettingsOPDWorkflowPage /></RG>} />
            <Route path="/settings/notifications" element={<RG path="/settings"><SettingsNotificationsPage /></RG>} />
            <Route path="/settings/report-schedules" element={<RG path="/settings"><SettingsReportSchedulesPage /></RG>} />
            <Route path="/settings/razorpay" element={<RG path="/settings"><SettingsRazorpayPage /></RG>} />
            <Route path="/settings/gst" element={<RG path="/settings"><SettingsGSTPage /></RG>} />
            <Route path="/settings/abdm" element={<RG path="/settings"><SettingsABDMPage /></RG>} />
            <Route path="/settings/backup" element={<RG path="/settings"><SettingsBackupPage /></RG>} />
            <Route path="/settings/api-keys" element={<RG path="/settings"><SettingsAPIKeysPage /></RG>} />
            <Route path="/settings/api-hub" element={<RG path="/settings"><APIConfigHubPage /></RG>} />
            <Route path="/settings/icd-codes" element={<RG path="/settings"><SettingsICDCodesPage /></RG>} />
            <Route path="/settings/radiology" element={<RG path="/settings"><SettingsRadiologyPage /></RG>} />
            <Route path="/accounts" element={<RG path="/accounts"><AccountsPage /></RG>} />
            <Route path="/accounts/setup" element={<RG path="/accounts"><OpeningBalancesPage /></RG>} />
            <Route path="/blood-bank" element={<RG path="/blood-bank"><BloodBankPage /></RG>} />
            <Route path="/cssd" element={<RG path="/cssd"><CSSDPage /></RG>} />
            <Route path="/dialysis" element={<RG path="/dialysis"><DialysisPage /></RG>} />
            <Route path="/oncology" element={<RG path="/oncology"><OncologyPage /></RG>} />
            <Route path="/mrd" element={<RG path="/mrd"><MRDPage /></RG>} />
            <Route path="/pmjay" element={<RG path="/pmjay"><PmjayPage /></RG>} />
            <Route path="/biomedical" element={<RG path="/biomedical"><BiomedicalPage /></RG>} />
            <Route path="/housekeeping" element={<RG path="/housekeeping"><HousekeepingPage /></RG>} />
            <Route path="/hmis" element={<RG path="/hmis"><HMISPage /></RG>} />
            <Route path="/dietetics" element={<RG path="/dietetics"><DietPage /></RG>} />
            <Route path="/lms" element={<RG path="/lms"><LMSPage /></RG>} />
            <Route path="/crm" element={<RG path="/crm"><CRMPage /></RG>} />
            <Route path="/pro" element={<RG path="/pro"><PROPage /></RG>} />
            <Route path="/physio" element={<RG path="/physio"><PhysioPage /></RG>} />
            <Route path="/mortuary" element={<RG path="/mortuary"><MortuaryPage /></RG>} />
            <Route path="/vaccination" element={<RG path="/vaccination"><VaccinationPage /></RG>} />
            <Route path="/dental" element={<RG path="/dental"><DentalPage /></RG>} />
            <Route path="/ayush" element={<RG path="/ayush"><AyushPage /></RG>} />
            <Route path="/packages" element={<RG path="/packages"><PackagesPage /></RG>} />
            <Route path="/ivf" element={<RG path="/ivf"><IVFPage /></RG>} />
            <Route path="/admin/go-live" element={<RG path="/admin/go-live"><GoLiveChecklistPage /></RG>} />
            <Route path="/admin/data-migration" element={<RG path="/admin/data-migration"><DataMigrationPage /></RG>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
