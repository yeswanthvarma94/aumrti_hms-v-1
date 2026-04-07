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
            <Route path="/opd" element={<OPDPage />} />
            <Route path="/ipd" element={<IPDPage />} />
            <Route path="/emergency" element={<EmergencyPage />} />
            <Route path="/ot" element={<OTPage />} />
            <Route path="/nursing" element={<NursingPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/radiology" element={<RadiologyPage />} />
            <Route path="/pharmacy" element={<PharmacyPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/insurance" element={<InsurancePage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/hr" element={<HRPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/quality" element={<QualityPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/telemedicine" element={<TelemedicinePage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/bank-accounts" element={<SettingsBankAccountsPage />} />
            <Route path="/settings/staff" element={<SettingsStaffPage />} />
            <Route path="/settings/departments" element={<SettingsDepartmentsPage />} />
            <Route path="/settings/wards" element={<SettingsWardsPage />} />
            <Route path="/settings/services" element={<SettingsServicesPage />} />
            <Route path="/settings/drugs" element={<SettingsDrugsPage />} />
            <Route path="/settings/profile" element={<SettingsProfilePage />} />
            <Route path="/settings/roles" element={<SettingsRolesPage />} />
            <Route path="/settings/branding" element={<SettingsBrandingPage />} />
            <Route path="/settings/whatsapp" element={<SettingsWhatsAppPage />} />
            <Route path="/settings/language" element={<SettingsLanguagePage />} />
            <Route path="/settings/plan" element={<SettingsPlanPage />} />
            <Route path="/settings/shifts" element={<SettingsShiftsPage />} />
            <Route path="/settings/modules" element={<SettingsModulesPage />} />
            <Route path="/settings/doctor-schedules" element={<SettingsDoctorSchedulesPage />} />
            <Route path="/settings/lab-tests" element={<SettingsLabTestsPage />} />
            <Route path="/settings/consent-forms" element={<SettingsConsentFormsPage />} />
            <Route path="/settings/ot-checklist" element={<SettingsOTChecklistPage />} />
            <Route path="/settings/protocols" element={<SettingsProtocolsPage />} />
            <Route path="/settings/clinical-thresholds" element={<SettingsThresholdsPage />} />
            <Route path="/settings/discharge-workflow" element={<SettingsDischargeWorkflowPage />} />
            <Route path="/settings/approvals" element={<SettingsApprovalsPage />} />
            <Route path="/settings/opd-workflow" element={<SettingsOPDWorkflowPage />} />
            <Route path="/settings/notifications" element={<SettingsNotificationsPage />} />
            <Route path="/settings/report-schedules" element={<SettingsReportSchedulesPage />} />
            <Route path="/settings/razorpay" element={<SettingsRazorpayPage />} />
            <Route path="/settings/gst" element={<SettingsGSTPage />} />
            <Route path="/settings/abdm" element={<SettingsABDMPage />} />
            <Route path="/settings/backup" element={<SettingsBackupPage />} />
            <Route path="/settings/api-keys" element={<SettingsAPIKeysPage />} />
            <Route path="/settings/api-hub" element={<APIConfigHubPage />} />
            <Route path="/settings/icd-codes" element={<SettingsICDCodesPage />} />
            <Route path="/settings/radiology" element={<SettingsRadiologyPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/setup" element={<OpeningBalancesPage />} />
            <Route path="/blood-bank" element={<BloodBankPage />} />
            <Route path="/cssd" element={<CSSDPage />} />
            <Route path="/dialysis" element={<DialysisPage />} />
            <Route path="/oncology" element={<OncologyPage />} />
            <Route path="/mrd" element={<MRDPage />} />
            <Route path="/pmjay" element={<PmjayPage />} />
            <Route path="/biomedical" element={<BiomedicalPage />} />
            <Route path="/housekeeping" element={<HousekeepingPage />} />
            <Route path="/hmis" element={<HMISPage />} />
            <Route path="/dietetics" element={<DietPage />} />
            <Route path="/lms" element={<LMSPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/pro" element={<PROPage />} />
            <Route path="/physio" element={<PhysioPage />} />
            <Route path="/mortuary" element={<MortuaryPage />} />
            <Route path="/vaccination" element={<VaccinationPage />} />
            <Route path="/dental" element={<DentalPage />} />
            <Route path="/ayush" element={<AyushPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/ivf" element={<IVFPage />} />
            <Route path="/admin/go-live" element={<GoLiveChecklistPage />} />
            <Route path="/admin/data-migration" element={<DataMigrationPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
