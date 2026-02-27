// src/pages/admin/RegistrationControl.jsx
import React from 'react';
import { ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const RegistrationControl = () => {
  const { isRegistrationOpen, toggleRegistration } = useAuth();

  const handleToggle = () => {
    toggleRegistration();
    toast.success(`Student registration has been ${!isRegistrationOpen ? 'opened' : 'closed'}.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registration Control</h1>
        <p className="text-gray-500">Enable or disable new student registrations from the landing page.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {isRegistrationOpen ? (
              <ToggleRight className="w-12 h-12 text-green-500" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-gray-400" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Student Registration Status</h2>
              <p className={`font-bold text-lg ${isRegistrationOpen ? 'text-green-600' : 'text-red-600'}`}>
                {isRegistrationOpen ? 'OPEN' : 'CLOSED'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleToggle}
            variant={isRegistrationOpen ? 'danger' : 'success'}
            className="w-full md:w-auto"
          >
            {isRegistrationOpen ? 'Close Registration' : 'Open Registration'}
          </Button>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-800">
              When registration is closed, the "Register" button on the landing page will be disabled for new students. Existing users can still log in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationControl;