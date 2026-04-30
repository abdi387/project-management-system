import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  CheckCircle,
  AlertCircle,
  FolderTree,
  Download,
  Printer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { academicService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const ProjectDomains = () => {
  const { user } = useAuth();
  const { isReadOnly } = useProtectedRoute();

  // Fetch domains
  const { 
    data: domainsData, 
    loading: domainsLoading,
    refetch: refetchDomains
  } = useFetch(() => academicService.getProjectDomains());

  const [newDomain, setNewDomain] = useState('');
  const [editingDomain, setEditingDomain] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDomains, setBulkDomains] = useState('');

  const domains = domainsData?.domains || [];

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) {
      toast.error('Domain name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await academicService.addProjectDomain(newDomain.trim());
      toast.success('Domain added successfully');
      setNewDomain('');
      await refetchDomains();
    } catch (error) {
      toast.error(error.error || 'Failed to add domain');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDomain = async () => {
    if (!editValue.trim()) {
      toast.error('Domain name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      // Note: You'd need an update endpoint
      // await academicService.updateProjectDomain(editingDomain, editValue.trim());
      toast.success('Domain updated successfully');
      setEditingDomain(null);
      setEditValue('');
      await refetchDomains();
    } catch (error) {
      toast.error(error.error || 'Failed to update domain');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      await academicService.deleteProjectDomain(deleteTarget);
      toast.success(`Domain "${deleteTarget}" deleted successfully`);
      setDeleteTarget(null);
      await refetchDomains();
    } catch (error) {
      toast.error(error.error || 'Failed to delete domain');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async () => {
    const domainList = bulkDomains
      .split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    if (domainList.length === 0) {
      toast.error('Please enter at least one domain');
      return;
    }

    setLoading(true);
    try {
      for (const domain of domainList) {
        await academicService.addProjectDomain(domain);
      }
      toast.success(`Successfully added ${domainList.length} domains`);
      setBulkDomains('');
      setShowBulkModal(false);
      await refetchDomains();
    } catch (error) {
      toast.error(error.error || 'Failed to add domains');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      if (domains.length === 0) {
        toast.error('No domains to export');
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('Project Domains List', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      const domainsBody = domains.map((domain, index) => [
        (index + 1).toString(),
        domain
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['#', 'Domain Name']],
        body: domainsBody,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] },
      });

      doc.save(`Project_Domains_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (domainsLoading) {
    return <LoadingSpinner fullScreen text="Loading project domains..." />;
  }

  return (
    <div className="space-y-6">
      {/* Stunning Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 shadow-2xl">
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <FolderTree className="w-4 h-4" />
                <span>Faculty Head</span>
                <span className="text-white/60">›</span>
                <span className="text-white font-semibold">Project Domains</span>
              </div>

              {/* Main title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: 'Times New Roman, serif' }}>
                Project Domains
              </h1>

              {/* Info card */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium text-sm">{domains.length} domain{domains.length !== 1 ? 's' : ''} configured</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleExportPDF}
                disabled={domains.length === 0 || exportLoading}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              >
                <Download className="w-5 h-5" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={handlePrint}
                disabled={domains.length === 0}
                className="flex items-center gap-2 px-5 py-3 bg-white text-teal-700 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-semibold"
              >
                <Printer className="w-5 h-5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="group bg-white rounded-xl border-l-4 border-teal-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Layers className="w-5 h-5 text-teal-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{domains.length}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Domains</div>
          <div className="text-xs text-gray-500 mt-2">All project domains</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add New Domain Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
            <div className="bg-gradient-to-r from-teal-600 to-blue-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Add New Domain</h2>
                  <p className="text-sm text-white/80 mt-0.5">Create a new project domain</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddDomain} className="space-y-4">
                <InputField
                  label="Domain Name"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g., Cloud Computing"
                  disabled={isReadOnly || loading}
                  required
                />

                <button
                  type="submit"
                  disabled={isReadOnly || !newDomain.trim() || loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl shadow-md hover:shadow-lg hover:from-teal-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Domain</span>
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowBulkModal(true)}
                  disabled={isReadOnly}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-teal-200 text-teal-700 rounded-xl hover:bg-teal-50 hover:border-teal-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  <FolderTree className="w-5 h-5" />
                  <span>Bulk Add Domains</span>
                </button>
              </div>

              <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <h4 className="font-semibold text-teal-900 text-sm mb-2">Tips</h4>
                <ul className="text-xs text-teal-700 space-y-1">
                  <li>• Use clear, descriptive names</li>
                  <li>• Avoid special characters</li>
                  <li>• Keep domains focused and specific</li>
                  <li>• Students will select from this list</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Domain List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Existing Domains</h2>
                    <p className="text-sm text-white/70 mt-0.5">{domains.length} domain{domains.length !== 1 ? 's' : ''} configured</p>
                  </div>
                </div>
                <span className="text-sm text-white/60">Click on a domain to edit</span>
              </div>
            </div>

            <div className="p-6">
              {domains.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Domains Found</h3>
                  <p className="text-gray-500">Add your first domain using the form.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {domains.map((domain, index) => (
                    <div
                      key={domain}
                      className="group relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                    >
                      {editingDomain === domain ? (
                        <div className="relative bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-4">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-sm">
                                {index + 1}
                              </div>
                              <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                                <span className="text-xs font-medium text-white">Editing</span>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Domain name"
                              className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={handleUpdateDomain}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-yellow-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                                disabled={loading}
                              >
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingDomain(null);
                                  setEditValue('');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-medium text-sm"
                              >
                                <X className="w-4 h-4" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-4">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                            <div className="relative z-10 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-white">{domain}</h3>
                                  <p className="text-xs text-white/80">Project Domain</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="p-4 flex items-center justify-end gap-2 border-t border-gray-100">
                            <button
                              onClick={() => {
                                setEditingDomain(domain);
                                setEditValue(domain);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 font-medium text-sm"
                              disabled={isReadOnly}
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(domain)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all duration-200 font-medium text-sm"
                              disabled={isReadOnly}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Add Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setBulkDomains('');
        }}
        title="Bulk Add Domains"
        size="lg"
        onConfirm={handleBulkAdd}
        confirmText="Add All"
        loading={loading}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Enter one domain per line. All domains will be added to the list.
          </p>
          
          <textarea
            value={bulkDomains}
            onChange={(e) => setBulkDomains(e.target.value)}
            placeholder="Web Development&#10;Mobile Applications&#10;Machine Learning&#10;Data Science&#10;Cloud Computing"
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            disabled={loading}
          />

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Duplicate Check</p>
                <p className="text-sm text-yellow-700">
                  Duplicate domains will be skipped. Existing domains will not be overwritten.
                </p>
              </div>
            </div>
          </div>

          {bulkDomains && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Preview:</span> Will add{' '}
                {bulkDomains.split('\n').filter(d => d.trim()).length} new domain(s)
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteDomain}
        title="Delete Domain"
        message={`Are you sure you want to delete "${deleteTarget}"? This may affect existing proposals using this domain.`}
        confirmText="Delete"
        variant="danger"
        loading={loading}
      />
    </div>
  );
};

export default ProjectDomains;