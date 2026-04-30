import React, { useState } from 'react';
import { 
  ToggleLeft, 
  ToggleRight, 
  AlertTriangle, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  BarChart3,
  History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { academicService, userService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const RegistrationControl = () => {
  const { isRegistrationOpen, toggleRegistration } = useAuth();
  const { isReadOnly } = useProtectedRoute();

  // Fetch pending students
  const { 
    data: pendingData, 
    loading: pendingLoading,
    refetch: refetchPending
  } = useFetch(() => userService.getUsers({ role: 'student', status: 'pending' }));

  // Fetch registration history (would come from API)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const pendingStudents = pendingData?.users || [];
  const pendingCount = pendingStudents.length;

  const handleToggle = async () => {
    setLoading(true);
    try {
      await toggleRegistration();
      toast.success(`Student registration has been ${!isRegistrationOpen ? 'opened' : 'closed'}.`);
      setShowConfirmModal(false);
    } catch (error) {
      toast.error(error.error || 'Failed to toggle registration');
    } finally {
      setLoading(false);
    }
  };

  if (pendingLoading) {
    return <LoadingSpinner fullScreen text="Loading registration data..." />;
  }

  return (
    <PageContainer>
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`bg-gradient-to-br rounded-xl p-6 text-white ${
          isRegistrationOpen ? 'from-green-600 to-teal-600' : 'from-red-600 to-orange-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="opacity-90 text-sm">Current Status</p>
              <p className="text-3xl font-bold mt-1">
                {isRegistrationOpen ? 'OPEN' : 'CLOSED'}
              </p>
            </div>
            {isRegistrationOpen ? (
              <ToggleRight className="w-12 h-12 opacity-80" />
            ) : (
              <ToggleLeft className="w-12 h-12 opacity-80" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Control Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${
              isRegistrationOpen ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {isRegistrationOpen ? (
                <ToggleRight className={`w-16 h-16 ${
                  isRegistrationOpen ? 'text-green-600' : 'text-gray-400'
                }`} />
              ) : (
                <ToggleLeft className="w-16 h-16 text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Student Registration Status
              </h2>
              <p className={`text-lg font-semibold ${
                isRegistrationOpen ? 'text-green-600' : 'text-red-600'
              }`}>
                {isRegistrationOpen ? 'REGISTRATION IS OPEN' : 'REGISTRATION IS CLOSED'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {isRegistrationOpen 
                  ? 'New students can register through the landing page'
                  : 'New student registrations are disabled'
                }
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowConfirmModal(true)}
            variant={isRegistrationOpen ? 'danger' : 'success'}
            size="lg"
            className="min-w-[200px]"
            disabled={isReadOnly || loading}
          >
            {isRegistrationOpen ? 'Close Registration' : 'Open Registration'}
          </Button>
        </div>
      </div>

      {/* Impact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            When Registration is OPEN
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              New students can register through the landing page
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              Department heads receive notifications of new registrations
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              Registration form is accessible to everyone
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              Pending approvals will appear in department head dashboards
            </li>
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-600" />
            When Registration is CLOSED
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              "Register" button is disabled on landing page
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              Existing users can still log in normally
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              Pending registrations remain for approval
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              System functions normally for all other operations
            </li>
          </ul>
        </div>
      </div>

      {/* Pending Students Summary */}
      {pendingCount > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-600" />
            Pending Registrations Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Computer Science</p>
              <p className="text-2xl font-bold text-yellow-800">
                {pendingStudents.filter(s => s.department === 'Computer Science').length}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Information Technology</p>
              <p className="text-2xl font-bold text-yellow-800">
                {pendingStudents.filter(s => s.department === 'Information Technology').length}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Information Systems</p>
              <p className="text-2xl font-bold text-yellow-800">
                {pendingStudents.filter(s => s.department === 'Information Systems').length}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin/users?role=student&status=pending'}
            >
              View All Pending Students
            </Button>
          </div>
        </div>
      )}

      {/* Warning Alert */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mt-6">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-800">Important Note</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Changing registration status affects all departments simultaneously. 
              Department heads will still need to approve individual student registrations.
              This setting only controls whether new students can initiate the registration process.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleToggle}
        title={isRegistrationOpen ? 'Close Registration' : 'Open Registration'}
        message={`Are you sure you want to ${isRegistrationOpen ? 'close' : 'open'} student registration? ${
          isRegistrationOpen 
            ? 'New students will not be able to register until you open it again.' 
            : 'Students will be able to register immediately.'
        }`}
        confirmText={isRegistrationOpen ? 'Yes, Close' : 'Yes, Open'}
        variant={isRegistrationOpen ? 'danger' : 'success'}
        loading={loading}
      />
    </PageContainer>
  );
};

export default RegistrationControl;