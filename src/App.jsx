// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AppProviders } from './context/AppProviders';

// Hooks
import useSessionHeartbeat from './hooks/useSessionHeartbeat';

// Components
import ServerStatus from './components/common/ServerStatus';

// Auth Pages
import LandingPage from './pages/auth/LandingPage';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ResetPasswordInitiate from './pages/auth/ResetPasswordInitiate';
import ChangePassword from './pages/auth/ChangePassword';
import Unauthorized from './pages/auth/Unauthorized';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import MyProfile from './pages/student/MyProfile';
import ProposalSubmission from './pages/student/ProposalSubmission';
import MyGroup from './pages/student/MyGroup';
import ProgressReport from './pages/student/ProgressReport';
import FinalDraft from './pages/student/FinalDraft';
import StudentEvaluators from './pages/student/StudentEvaluators';
import StudentDefenseSchedule from './pages/student/StudentDefenseSchedule';

// Advisor Pages
import AdvisorDashboard from './pages/advisor/AdvisorDashboard';
import AdvisorProfile from './pages/advisor/AdvisorProfile';
import ProjectMarketplace from './pages/advisor/ProjectMarketplace';
import MentoredGroups from './pages/advisor/MentoredGroups';
import GroupDetails from './pages/advisor/GroupDetails';
import ProgressReview from './pages/advisor/ProgressReview';
import FinalDraftApproval from './pages/advisor/FinalDraftApproval';
import AdvisorEvaluations from './pages/advisor/AdvisorEvaluations';
import EvaluationSchedule from './pages/advisor/EvaluationSchedule';
import EvaluationDetails from './pages/advisor/EvaluationDetails';
import AdvisorRepository from './pages/advisor/AdvisorRepository';

// Department Head Pages
import DeptDashboard from './pages/dept-head/DeptDashboard';
import DeptProfile from './pages/dept-head/DeptProfile';
import StudentRegistration from './pages/dept-head/StudentRegistration';
import RegisteredStudents from './pages/dept-head/RegisteredStudents';
import ProposalEvaluation from './pages/dept-head/ProposalEvaluation';
import GroupGeneration from './pages/dept-head/GroupGeneration';
import GroupInformation from './pages/dept-head/GroupInformation';
import DeptRepository from './pages/dept-head/DeptRepository';
import ClaimedProjects from './pages/dept-head/ClaimedProjects';
import ProgressMonitoring from './pages/dept-head/ProgressMonitoring';
import DeptReports from './pages/dept-head/DeptReports';
import DeptDefenseSchedule from './pages/dept-head/DeptDefenseSchedule';
import DeptFinalDrafts from './pages/dept-head/DeptFinalDrafts';

// Faculty Head Pages
import FacultyDashboard from './pages/faculty-head/FacultyDashboard';
import FacultyProfile from './pages/faculty-head/FacultyProfile';
import DefenseSchedule from './pages/faculty-head/DefenseSchedule';
import EvaluatorManager from './pages/faculty-head/EvaluatorManager';
import VenueManagement from './pages/faculty-head/VenueManagement';
import FacultyReports from './pages/faculty-head/FacultyReports';
import FacultyRepository from './pages/faculty-head/FacultyRepository';
import AcademicYearManager from './pages/faculty-head/AcademicYearManager';
import ProjectDomains from './pages/faculty-head/ProjectDomains';
import SectionConfiguration from './pages/faculty-head/SectionConfiguration';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfile from './pages/admin/AdminProfile';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import SystemRelatedInquiries from './pages/admin/SystemRelatedInquiries';
import RegistrationControl from './pages/admin/RegistrationControl';

// Layout Components
import ProtectedRoute from './components/layout/ProtectedRoute';

// Component to handle session heartbeat within AuthProvider
const SessionHeartbeat = () => {
  useSessionHeartbeat();
  return null;
};

function App() {
  return (
    <Router>
      <AppProviders>
        {/* Session heartbeat for logged-in users */}
        <SessionHeartbeat />
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        
        {/* Server Status Check Component - Shows when backend is down */}
        <ServerStatus />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password/:token" element={<ResetPassword />} />
          <Route path="/auth/reset-password-initiate" element={<ResetPasswordInitiate />} />
          <Route path="/auth/change-password" element={<ChangePassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Student Routes */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/profile" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyProfile />
            </ProtectedRoute>
          } />
          <Route path="/student/proposal" element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProposalSubmission />
            </ProtectedRoute>
          } />
          <Route path="/student/group" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyGroup />
            </ProtectedRoute>
          } />
          <Route path="/student/progress" element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProgressReport />
            </ProtectedRoute>
          } />
          <Route path="/student/final-draft" element={
            <ProtectedRoute allowedRoles={['student']}>
              <FinalDraft />
            </ProtectedRoute>
          } />
          <Route path="/student/evaluators" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentEvaluators />
            </ProtectedRoute>
          } />
          <Route path="/student/defense-schedule" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDefenseSchedule />
            </ProtectedRoute>
          } />

          {/* Advisor Routes */}
          <Route path="/advisor" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <AdvisorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/advisor/profile" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <AdvisorProfile />
            </ProtectedRoute>
          } />
          <Route path="/advisor/marketplace" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <ProjectMarketplace />
            </ProtectedRoute>
          } />
          <Route path="/advisor/groups" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <MentoredGroups />
            </ProtectedRoute>
          } />
          <Route path="/advisor/groups/:groupId" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <GroupDetails />
            </ProtectedRoute>
          } />
          <Route path="/advisor/progress-review" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <ProgressReview />
            </ProtectedRoute>
          } />
          <Route path="/advisor/AdvisorEvaluations" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <AdvisorEvaluations />
            </ProtectedRoute>
          } />
          <Route path="/advisor/evaluations/:groupId" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <EvaluationDetails />
            </ProtectedRoute>
          } />
          <Route path="/advisor/schedule" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <EvaluationSchedule />
            </ProtectedRoute>
          } />
          <Route path="/advisor/final-approval" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <FinalDraftApproval />
            </ProtectedRoute>
          } />
          <Route path="/advisor/repository" element={
            <ProtectedRoute allowedRoles={['advisor']}>
              <AdvisorRepository />
            </ProtectedRoute>
          } />

          {/* Department Head Routes */}
          <Route path="/dept-head" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <DeptDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/profile" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <DeptProfile />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/registrations" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <StudentRegistration />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/students" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <RegisteredStudents />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/proposals" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <ProposalEvaluation />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/groups" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <GroupGeneration />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/group-info" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <GroupInformation />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/claimed-projects" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <ClaimedProjects />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/final-drafts" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <DeptFinalDrafts />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/repository" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <DeptRepository />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/monitoring" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <ProgressMonitoring />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/reports" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <DeptReports />
            </ProtectedRoute>
          } />
          <Route path="/dept-head/defense-schedule" element={
            <ProtectedRoute allowedRoles={['dept-head']}>
              <DeptDefenseSchedule />
            </ProtectedRoute>
          } />

          {/* Faculty Head Routes */}
          <Route path="/faculty-head" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <FacultyDashboard />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/profile" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <FacultyProfile />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/defense" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <DefenseSchedule />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/EvaluatorManager" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <EvaluatorManager />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/venues" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <VenueManagement />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/reports" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <FacultyReports />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/repository" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <FacultyRepository />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/academic-year" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <AcademicYearManager />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/domains" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <ProjectDomains />
            </ProtectedRoute>
          } />
          <Route path="/faculty-head/sections" element={
            <ProtectedRoute allowedRoles={['faculty-head']}>
              <SectionConfiguration />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/registration-control" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RegistrationControl />
            </ProtectedRoute>
          } />
          <Route path="/admin/inquiries" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SystemRelatedInquiries />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SystemSettings />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProviders>
    </Router>
  );
}

export default App;