
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  RefreshCw,
  AlertTriangle,
  Save,
  Globe,
  Lock,
  Shield,
  Server,
  Clock,
  Download,
  Trash2,
  Activity,
  Info
} from 'lucide-react';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { academicService, userService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

// Helper function to format bytes to human-readable format
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const SystemSettings = () => {
  const { isReadOnly } = useProtectedRoute();

  // Fetch system settings
  const {
    data: settingsData,
    loading: settingsLoading,
    refetch: refetchSettings
  } = useFetch(() => academicService.getSystemSettings());

  const [activeTab, setActiveTab] = useState('security');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);

  // Settings state - will be populated from API
  const [settings, setSettings] = useState({
    // Security Settings
    sessionTimeout: '30',
    passwordMinLength: '8',

    // Performance Settings
    cacheEnabled: true,
    cacheDuration: '3600',
    itemsPerPage: '20',

    // Backup Settings
    autoBackup: false,  // Match backend default
    backupFrequency: 'daily',
    backupRetention: '30'
  });

  // Load settings from API on mount
  useEffect(() => {
    if (settingsData?.settings) {
      const apiSettings = settingsData.settings;
      setSettings(prev => ({
        ...prev,
        sessionTimeout: apiSettings.session_timeout || apiSettings.sessionTimeout || prev.sessionTimeout,
        passwordMinLength: apiSettings.password_min_length || '8',
        cacheEnabled: apiSettings.cache_enabled === 'true' || apiSettings.cacheEnabled === 'true' || apiSettings.cache_enabled === true || apiSettings.cacheEnabled === true,
        cacheDuration: apiSettings.cache_duration || apiSettings.cacheDuration || prev.cacheDuration,
        itemsPerPage: apiSettings.items_per_page || apiSettings.itemsPerPage || prev.itemsPerPage,
        autoBackup: apiSettings.auto_backup !== undefined ? (apiSettings.auto_backup === 'true' || apiSettings.autoBackup === 'true' || apiSettings.auto_backup === true || apiSettings.autoBackup === true) : false,
        backupFrequency: apiSettings.backup_frequency || apiSettings.backupFrequency || prev.backupFrequency,
        backupRetention: apiSettings.backup_retention || apiSettings.backupRetention || prev.backupRetention
      }));
    }
  }, [settingsData]);

  // Load cache stats when performance tab is active
  useEffect(() => {
    if (activeTab === 'performance') {
      loadCacheStats();
    }
  }, [activeTab]);

  const systemInfo = {
    version: '1.0.0',
    lastUpdated: new Date().toLocaleDateString(),
    environment: 'Production',
    database: 'MySQL 8.0',
    server: 'Node.js 18.x',
    uptime: '15 days',
    cpu: '12%'
  };

  const tabs = [
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'performance', label: 'Performance', icon: Server },
    { id: 'backup', label: 'Backup', icon: Database },
    { id: 'system', label: 'System Info', icon: Globe }
  ];

  const handleResetSystem = async () => {
    setLoading(true);
    try {
      // Reset all data tables except users
      const result = await userService.resetSystemData();
      console.log('System reset result:', result);
      toast.success('System reset successfully! All project data has been cleared.');
      setShowResetModal(false);
      await refetchSettings();
    } catch (error) {
      console.error('Reset system error:', error);
      const errorMessage = error?.error || error?.message || 'Failed to reset system data';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await academicService.clearCache();
      toast.success('Cache cleared successfully!');
      // Refresh cache stats after clearing
      await loadCacheStats();
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  // Load cache statistics
  const loadCacheStats = async () => {
    try {
      const response = await academicService.getCacheStats();
      // Backend returns: { success: true, stats: { keys, hits, misses, hitRate, size, ... } }
      setCacheStats(response.stats || response);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  if (settingsLoading) {
    return <LoadingSpinner fullScreen text="Loading settings..." />;
  }

  return (
    <PageContainer>
      {/* Settings Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Session Timeout (minutes)"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                  min="5"
                  max="120"
                />
                <InputField
                  label="Minimum Password Length"
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => setSettings({ ...settings, passwordMinLength: e.target.value })}
                  min="6"
                  max="128"
                  helperText={`Current setting: ${settings.passwordMinLength} characters (affects all registrations)`}
                />
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Security Recommendation</p>
                    <p className="text-sm text-yellow-700">
                      Strong passwords should be at least 8 characters and include numbers and special characters.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Settings */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Performance Settings</h3>
              
              {/* Cache Statistics */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Cache Statistics
                </h4>
                {cacheStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Cached Items</p>
                      <p className="text-2xl font-bold text-blue-600">{cacheStats.keys || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Hit Rate</p>
                      <p className="text-2xl font-bold text-green-600">{cacheStats.hitRate || 0}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Memory Usage</p>
                      <p className="text-2xl font-bold text-purple-600">{formatBytes(cacheStats.size || 0)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <p className="text-sm font-semibold text-green-600 flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Active
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Cached Items</p>
                      <p className="text-2xl font-bold text-blue-600">-</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Hit Rate</p>
                      <p className="text-2xl font-bold text-green-600">-</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Memory Usage</p>
                      <p className="text-2xl font-bold text-purple-600">-</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <p className="text-sm font-semibold text-gray-400 flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        Loading
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleClearCache} icon={RefreshCw} variant="outline">
                  Clear Cache Now
                </Button>
              </div>
            </div>
          )}

          {/* Backup Settings */}
          {activeTab === 'backup' && (
            <BackupTab
              settings={settings}
              setSettings={setSettings}
              refetchSettings={refetchSettings}
            />
          )}

          {/* System Information */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Version</p>
                  <p className="font-medium text-gray-900">{systemInfo.version}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="font-medium text-gray-900">{systemInfo.lastUpdated}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Environment</p>
                  <p className="font-medium text-gray-900">{systemInfo.environment}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Database</p>
                  <p className="font-medium text-gray-900">{systemInfo.database}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Server</p>
                  <p className="font-medium text-gray-900">{systemInfo.server}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Uptime</p>
                  <p className="font-medium text-gray-900">{systemInfo.uptime}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">CPU Usage</p>
                  <p className="font-medium text-gray-900">{systemInfo.cpu}</p>
                </div>
              </div>

              {/* System Status */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">System Status</h4>
                {[
                  { name: 'Authentication Service', status: 'operational' },
                  { name: 'Database Connection', status: 'operational' },
                  { name: 'API Server', status: 'operational' },
                  { name: 'Notification Service', status: 'operational' }
                ].map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{service.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-sm text-green-600 capitalize">{service.status}</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </h4>
                <p className="text-sm text-red-700 mb-4">
                  These actions are irreversible. Please proceed with caution.
                </p>
                <Button
                  variant="danger"
                  onClick={() => setShowResetModal(true)}
                  icon={Trash2}
                >
                  Reset System
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset System Modal */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetSystem}
        title="Reset System"
        message="This will permanently delete all project data including groups, proposals, reports, and defense schedules. User accounts will be preserved. This action cannot be undone. Are you absolutely sure?"
        confirmText="Reset Everything"
        variant="danger"
        loading={loading}
      />
    </PageContainer>
  );
};

// Backup Tab Component
const BackupTab = ({ settings, setSettings, refetchSettings }) => {
  const [backups, setBackups] = useState([]);
  const [backupStats, setBackupStats] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showDeleteBackupModal, setShowDeleteBackupModal] = useState(false);
  const [deleteBackupFile, setDeleteBackupFile] = useState('');
  const [isStoppingBackup, setIsStoppingBackup] = useState(false);

  // Load backups and stats
  const loadBackups = async () => {
    try {
      const [backupsData, statsData, statusData] = await Promise.all([
        academicService.getBackupList(),
        academicService.getBackupStats(),
        academicService.getBackupStatus()
      ]);
      
      if (backupsData.success) {
        setBackups(backupsData.backups || []);
      }
      if (statsData.success) {
        setBackupStats(statsData);
      }
      if (statusData.success) {
        setBackupStatus(statusData.status);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  };

  useEffect(() => {
    loadBackups();
    
    // Refresh backup status every 30 seconds
    const interval = setInterval(async () => {
      try {
        const statusData = await academicService.getBackupStatus();
        if (statusData.success) {
          setBackupStatus(statusData.status);
        }
      } catch (error) {
        console.error('Failed to refresh backup status:', error);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle backup settings save
  const handleSaveBackupSettings = async () => {
    setIsSavingSettings(true);
    try {
      await academicService.updateBackupSettings({
        autoBackup: settings.autoBackup,
        backupFrequency: settings.backupFrequency,
        backupRetention: settings.backupRetention
      });
      
      toast.success('Backup settings saved successfully!');
      await refetchSettings();
      await loadBackups(); // Refresh status
    } catch (error) {
      console.error('Save backup settings error:', error);
      toast.error('Failed to save backup settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle stop backup
  const handleStopBackup = async () => {
    if (!backupStatus?.isRunning) {
      toast.error('No backup is currently running');
      return;
    }

    setIsStoppingBackup(true);
    try {
      await academicService.stopBackup();
      toast.success('Backup process stopped successfully!');
      await loadBackups(); // Refresh status
    } catch (error) {
      console.error('Stop backup error:', error);
      toast.error('Failed to stop backup process');
    } finally {
      setIsStoppingBackup(false);
    }
  };

  // Handle backup delete
  const handleDeleteBackup = async (filename) => {
    try {
      const result = await academicService.deleteBackup(filename);
      if (result.success) {
        toast.success('Backup deleted successfully');
        await loadBackups();
      } else {
        toast.error(result.error || 'Failed to delete backup');
      }
    } catch {
      toast.error('Failed to delete backup');
    } finally {
      setShowDeleteBackupModal(false);
      setDeleteBackupFile('');
    }
  };

  // Handle backup download
  const handleDownloadBackup = (filename) => {
    academicService.downloadBackup(filename);
  };

  return (
    <div className="space-y-6">
      {/* Backup Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Automatic Backup Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoBackup"
              checked={settings.autoBackup}
              onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="autoBackup" className="text-sm font-medium text-gray-700">
              Enable Automatic Backups
            </label>
          </div>
          
          <SelectDropdown
            label="Backup Frequency"
            value={settings.backupFrequency}
            onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
            options={[
              { value: 'hourly', label: 'Every Hour' },
              { value: 'daily', label: 'Daily (2 AM)' },
              { value: 'weekly', label: 'Weekly (Sunday 2 AM)' },
              { value: 'monthly', label: 'Monthly (1st day, 2 AM)' }
            ]}
            disabled={!settings.autoBackup}
          />
          
          <InputField
            label="Retention Period (days)"
            type="number"
            value={settings.backupRetention}
            onChange={(e) => setSettings({ ...settings, backupRetention: e.target.value })}
            min="1"
            max="365"
            helperText="Backups older than this will be auto-deleted"
          />
        </div>
        
        <div className="mt-4 flex items-center gap-4">
          <Button
            onClick={handleSaveBackupSettings}
            icon={Save}
            loading={isSavingSettings}
            disabled={isSavingSettings} // Only disable when actively saving
            variant="primary"
            size="sm"
          >
            Save Backup Settings
          </Button>
          
          {backupStatus && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${backupStatus.isRunning ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">
                {backupStatus.isRunning ? `Backup running (${backupStatus.currentProcess || 'unknown'})` : 'No backup running'}
              </span>
              {backupStatus.isRunning && (
                <Button
                  onClick={handleStopBackup}
                  loading={isStoppingBackup}
                  variant="danger"
                  size="sm"
                  className="ml-2"
                >
                  Stop Backup
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backup Statistics */}
      {backupStats && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Backup Statistics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Backups</p>
              <p className="text-2xl font-bold text-blue-600">{backupStats.totalBackups || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Size</p>
              <p className="text-2xl font-bold text-purple-600">{backupStats.totalSize || '0 MB'}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Auto Backup</p>
              <p className={`text-sm font-semibold ${backupStats.autoBackupEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {backupStats.autoBackupEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Retention</p>
              <p className="text-lg font-bold text-gray-700">{backupStats.retentionDays || 30} days</p>
            </div>
          </div>
        </div>
      )}

      {/* Backup List */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
          <span>Available Backups</span>
          <span className="text-sm text-gray-500">{backups.length} backup(s)</span>
        </h4>
        
        {backups.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No backups available</p>
            <p className="text-sm text-gray-400 mt-1">Create your first backup to get started</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {backups.map((backup, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{backup.filename}</p>
                    <p className="text-xs text-gray-500">{backup.createdAtFormatted || backup.created_at}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {backup.sizeFormatted || backup.size}
                  </span>
                  <button
                    onClick={() => handleDownloadBackup(backup.filename)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteBackupFile(backup.filename);
                      setShowDeleteBackupModal(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Backup Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteBackupModal}
        onClose={() => {
          setShowDeleteBackupModal(false);
          setDeleteBackupFile('');
        }}
        onConfirm={() => handleDeleteBackup(deleteBackupFile)}
        title="Delete Backup"
        message={
          deleteBackupFile
            ? `This action will permanently delete the backup file: ${deleteBackupFile}`
            : 'This action will permanently delete the selected backup file.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 text-sm">Backup Information</p>
            <ul className="text-xs text-blue-700 mt-1 space-y-1">
              <li>• Backups are compressed using ZIP (up to 70% size reduction)</li>
              <li>• Automatic backups run at scheduled times based on your frequency setting</li>
              <li>• Old backups are automatically deleted based on retention period</li>
              <li>• Backups are stored locally in the <code className="bg-blue-100 px-1 rounded">backend/backups/</code> folder</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;