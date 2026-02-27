// src/pages/admin/SystemSettings.jsx
import React, { useState } from 'react';
import { Settings, Database, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const SystemSettings = () => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClearCache = () => {
    // In a real app, this would clear server-side cache
    toast.success('Cache cleared successfully!');
  };

  const handleResetSystem = async () => {
    setLoading(true);
    try {
      // Preserve user and registration status
      const users = localStorage.getItem('fypUsers');
      const currentUser = localStorage.getItem('fypCurrentUser');
      const registrationStatus = localStorage.getItem('fypRegistrationStatus');

      // Clear everything
      localStorage.clear();

      // Restore preserved items
      if (users) localStorage.setItem('fypUsers', users);
      if (currentUser) localStorage.setItem('fypCurrentUser', currentUser);
      if (registrationStatus) localStorage.setItem('fypRegistrationStatus', registrationStatus);

      // Set academic year to an uninitialized state
      const initialAcademicYear = {
        current: null,
        semester: null,
        status: 'pending_setup',
        startDate: null,
        history: []
      };
      localStorage.setItem('fypAcademicYear', JSON.stringify(initialAcademicYear));
      
      toast.success('System data reset successfully!');
      setShowResetModal(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const systemInfo = {
    version: '1.0.0',
    lastUpdated: new Date().toLocaleDateString(),
    environment: 'Development',
    storage: 'Local Storage'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500">Configure system parameters and maintenance</p>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Version</p>
            <p className="font-medium text-gray-900">{systemInfo.version}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="font-medium text-gray-900">{systemInfo.lastUpdated}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Environment</p>
            <p className="font-medium text-gray-900">{systemInfo.environment}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Storage</p>
            <p className="font-medium text-gray-900">{systemInfo.storage}</p>
          </div>
        </div>
      </div>

      {/* Maintenance Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Database className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Maintenance</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Clear Cache</h3>
              <p className="text-sm text-gray-500">Clear temporary system data</p>
            </div>
            <Button variant="secondary" onClick={handleClearCache} icon={RefreshCw}>
              Clear
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <h3 className="font-medium text-red-900">Reset System Data</h3>
              <p className="text-sm text-red-700">
                Remove all project data (groups, proposals, reports). Users will be preserved.
              </p>
            </div>
            <Button variant="danger" onClick={() => setShowResetModal(true)}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
        </div>

        <div className="space-y-3">
          {[
            { name: 'Authentication Service', status: 'operational' },
            { name: 'Data Storage', status: 'operational' },
            { name: 'Notification System', status: 'operational' },
            { name: 'Report Generation', status: 'operational' }
          ].map((service, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">{service.name}</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-sm text-green-600 capitalize">{service.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset System Data"
        onConfirm={handleResetSystem}
        confirmText="Reset Data"
        confirmVariant="danger"
        loading={loading}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Warning: This action is irreversible</p>
              <p className="text-sm text-red-700 mt-1">
                This will permanently delete all:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside mt-2">
                <li>Student groups</li>
                <li>Project proposals</li>
                <li>Progress reports</li>
                <li>Final drafts</li>
                <li>Defense schedules</li>
                <li>Notifications</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600">
            User accounts will be preserved. Are you sure you want to continue?
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SystemSettings;