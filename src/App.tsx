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
import QualityPage from "./pages/quality/QualityPage";
import BillingPage from "./pages/billing/BillingPage";
import PaymentsPage from "./pages/billing/PaymentsPage";
import PharmacyPage from "./pages/pharmacy/PharmacyPage";
import OPDPage from "./pages/opd/OPDPage";
import OTPage from "./pages/ot/OTPage";
import LabPage from "./pages/lab/LabPage";
import RadiologyPage from "./pages/radiology/RadiologyPage";
import IPDPage from "./pages/ipd/IPDPage";
import EmergencyPage from "./pages/emergency/EmergencyPage";
import InsurancePage from "./pages/insurance/InsurancePage";
import PatientsPage from "./pages/patients/PatientsPage";
import NursingPage from "./pages/nursing/NursingPage";
import HRPage from "./pages/hr/HRPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import SettingsPage from "./pages/settings/SettingsPage";
import SettingsBankAccountsPage from "./pages/settings/SettingsBankAccountsPage";
import SettingsStaffPage from "./pages/settings/SettingsStaffPage";
import SettingsDepartmentsPage from "./pages/settings/SettingsDepartmentsPage";
import SettingsWardsPage from "./pages/settings/SettingsWardsPage";
import SettingsServicesPage from "./pages/settings/SettingsServicesPage";
import SettingsDrugsPage from "./pages/settings/SettingsDrugsPage";
import SettingsProfilePage from "./pages/settings/SettingsProfilePage";
import SettingsRolesPage from "./pages/settings/SettingsRolesPage";
import SettingsBrandingPage from "./pages/settings/SettingsBrandingPage";
import SettingsWhatsAppPage from "./pages/settings/SettingsWhatsAppPage";
import SettingsLanguagePage from "./pages/settings/SettingsLanguagePage";
import SettingsPlanPage from "./pages/settings/SettingsPlanPage";
import SettingsShiftsPage from "./pages/settings/SettingsShiftsPage";
import SettingsModulesPage from "./pages/settings/SettingsModulesPage";
import SettingsDoctorSchedulesPage from "./pages/settings/SettingsDoctorSchedulesPage";
import SettingsLabTestsPage from "./pages/settings/SettingsLabTestsPage";
import SettingsConsentFormsPage from "./pages/settings/SettingsConsentFormsPage";
import SettingsOTChecklistPage from "./pages/settings/SettingsOTChecklistPage";
import SettingsProtocolsPage from "./pages/settings/SettingsProtocolsPage";
import SettingsThresholdsPage from "./pages/settings/SettingsThresholdsPage";
import SettingsDischargeWorkflowPage from "./pages/settings/SettingsDischargeWorkflowPage";
import SettingsApprovalsPage from "./pages/settings/SettingsApprovalsPage";
import SettingsOPDWorkflowPage from "./pages/settings/SettingsOPDWorkflowPage";
import SettingsNotificationsPage from "./pages/settings/SettingsNotificationsPage";
import SettingsReportSchedulesPage from "./pages/settings/SettingsReportSchedulesPage";
import SettingsRazorpayPage from "./pages/settings/SettingsRazorpayPage";
import SettingsGSTPage from "./pages/settings/SettingsGSTPage";
import SettingsABDMPage from "./pages/settings/SettingsABDMPage";
import SettingsBackupPage from "./pages/settings/SettingsBackupPage";
import SettingsAPIKeysPage from "./pages/settings/SettingsAPIKeysPage";
import APIConfigHubPage from "./pages/settings/APIConfigHubPage";
import SettingsICDCodesPage from "./pages/settings/SettingsICDCodesPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import InboxPage from "./pages/inbox/InboxPage";
import TelemedicinePage from "./pages/telemedicine/TelemedicinePage";
import HODDashboardPage from "./pages/hod/HODDashboardPage";
import TVDisplayPage from "./pages/tv/TVDisplayPage";
import DesignSystem from "./pages/DesignSystem";
import PatientPortal from "./pages/portal/PatientPortal";
import GoLiveChecklistPage from "./pages/admin/GoLiveChecklistPage";
import DataMigrationPage from "./pages/admin/DataMigrationPage";
import AccountsPage from "./pages/accounts/AccountsPage";
import OpeningBalancesPage from "./pages/accounts/OpeningBalancesPage";
import BloodBankPage from "./pages/blood-bank/BloodBankPage";
import CSSDPage from "./pages/cssd/CSSDPage";
import DialysisPage from "./pages/dialysis/DialysisPage";
import OncologyPage from "./pages/oncology/OncologyPage";
import ModulesPage from "./pages/modules/ModulesPage";
import MRDPage from "./pages/mrd/MRDPage";
import PmjayPage from "./pages/pmjay/PmjayPage";
import BiomedicalPage from "./pages/biomedical/BiomedicalPage";
import HousekeepingPage from "./pages/housekeeping/HousekeepingPage";
import HMISPage from "./pages/hmis/HMISPage";
import DietPage from "./pages/dietetics/DietPage";
import PaymentLandingPage from "./pages/pay/PaymentLandingPage";
import LMSPage from "./pages/lms/LMSPage";
import CRMPage from "./pages/crm/CRMPage";
import PROPage from "./pages/pro/PROPage";
import PhysioPage from "./pages/physio/PhysioPage";
import MortuaryPage from "./pages/mortuary/MortuaryPage";
import VaccinationPage from "./pages/vaccination/VaccinationPage";
import DentalPage from "./pages/dental/DentalPage";
import AyushPage from "./pages/ayush/AyushPage";
import PackagesPage from "./pages/packages/PackagesPage";
import IVFPage from "./pages/ivf/IVFPage";
import NotFound from "./pages/NotFound";
import AuthGuard from "@/components/auth/AuthGuard";

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
          <Route path="/pay/:token" element={<PaymentLandingPage />} />
          <Route path="/portal/*" element={<PatientPortal />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup/onboarding" element={<AuthGuard><OnboardingWizard /></AuthGuard>} />
          <Route path="/design-system" element={<DesignSystem />} />
          <Route path="/tv-display" element={<TVDisplayPage />} />
          <Route path="/hod-dashboard" element={<HODDashboardPage />} />

          {/* App shell routes */}
          <Route element={<AppShell />}>
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
