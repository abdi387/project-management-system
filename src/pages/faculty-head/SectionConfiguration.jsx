// SectionConfiguration.jsx - v2.1.0 - Custom Delete Modal (NO window.confirm)
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Layers,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  RefreshCw,
  ChevronRight,
  Edit2
} from 'lucide-react';
import { sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const SectionConfiguration = () => {
  // Fetch all sections
  const {
    data: sectionsData,
    loading: sectionsLoading,
    refetch: refetchSections
  } = useFetch(() => sectionService.getSectionsGroupedByDepartment());

  const [selectedDepartment, setSelectedDepartment] = useState('Computer Science');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: ''
  });

  // Edit and Delete modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '' });

  const departments = [
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Information Systems', label: 'Information Systems' }
  ];

  // Initialize sections from fetched data
  useEffect(() => {
    if (sectionsData?.sections) {
      const deptSections = sectionsData.sections[selectedDepartment] || [];
      setSections(deptSections);
    }
  }, [sectionsData, selectedDepartment]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: ''
    });
    setShowAddForm(false);
  };

  const validateSection = (section) => {
    if (!section.name || !section.name.trim()) {
      toast.error('Section name is required');
      return false;
    }

    return true;
  };

  const handleAddSection = async () => {
    if (!validateSection(formData)) return;

    setLoading(true);
    try {
      const newSection = {
        name: formData.name.trim().toUpperCase(),
        department: selectedDepartment,
        isActive: true
      };

      await sectionService.upsertSection(newSection);
      toast.success('Section added successfully!');
      resetForm();
      await refetchSections();
    } catch (error) {
      toast.error(error.error || 'Failed to add section');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (section) => {
    setLoading(true);
    try {
      await sectionService.upsertSection({
        name: section.name,
        department: section.department || selectedDepartment,
        isActive: !section.isActive
      });
      toast.success(`Section ${section.isActive ? 'deactivated' : 'activated'} successfully!`);
      await refetchSections();
    } catch (error) {
      toast.error(error.error || 'Failed to update section');
    } finally {
      setLoading(false);
    }
  };

  // Delete handler - OPENS CUSTOM MODAL (NO window.confirm)
  const handleDeleteSection = (section) => {
    console.log('🗑️ Opening delete modal for section:', section.name);
    setSelectedSection(section);
    setShowDeleteModal(true);
  };

  // Confirm delete - EXECUTES DELETION
  const confirmDeleteSection = async () => {
    console.log('✅ Confirming deletion of:', selectedSection.name);
    setLoading(true);
    try {
      await sectionService.deleteSection(selectedSection.id);
      toast.success(`Section "${selectedSection.name}" has been permanently removed`);
      setShowDeleteModal(false);
      setSelectedSection(null);
      await refetchSections();
    } catch (error) {
      toast.error(error.error || 'Failed to delete section');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSection = (section) => {
    setSelectedSection(section);
    setEditFormData({ name: section.name });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.name.trim()) {
      toast.error('Section name is required');
      return;
    }

    setLoading(true);
    try {
      const updatedSection = {
        name: editFormData.name.trim().toUpperCase(),
        department: selectedSection.department || selectedDepartment,
        isActive: selectedSection.isActive
      };

      await sectionService.upsertSection(updatedSection);
      toast.success(`Section "${selectedSection.name}" updated to "${updatedSection.name}"`);
      setShowEditModal(false);
      setSelectedSection(null);
      setEditFormData({ name: '' });
      await refetchSections();
    } catch (error) {
      toast.error(error.error || 'Failed to update section');
    } finally {
      setLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedSection(null);
    setEditFormData({ name: '' });
  };

  if (sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading sections..." />;
  }

  const currentSections = sections || [];
  const activeCount = currentSections.filter(s => s.isActive).length;
  const inactiveCount = currentSections.filter(s => !s.isActive).length;

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
                <Layers className="w-4 h-4" />
                <span>Faculty Head</span>
                <span className="text-white/60">›</span>
                <span className="text-white font-semibold">Section Configuration</span>
              </div>

              {/* Main title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'Times New Roman, serif' }}>
                Section Configuration
              </h1>
            </div>

            {/* Action Button */}
            <button
              onClick={refetchSections}
              disabled={sectionsLoading}
              className="flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${sectionsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group bg-white rounded-xl border-l-4 border-blue-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{currentSections.length}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Sections</div>
          <div className="text-xs text-gray-500 mt-2">For {selectedDepartment}</div>
        </div>
        <div className="group bg-white rounded-xl border-l-4 border-green-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{activeCount}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Active</div>
          <div className="text-xs text-gray-500 mt-2">Currently active</div>
        </div>
        <div className="group bg-white rounded-xl border-l-4 border-gray-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gray-50 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{inactiveCount}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Inactive</div>
          <div className="text-xs text-gray-500 mt-2">Deactivated</div>
        </div>
      </div>

      {/* Department Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Select Department</h2>
                <p className="text-sm text-white/70 mt-0.5">Choose department to manage sections</p>
              </div>
            </div>
            <SelectDropdown
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              options={departments}
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      {/* Add New Section Button */}
      {!showAddForm ? (
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-base font-bold">Add New Section</div>
                <div className="text-xs text-blue-100 font-medium">Create a custom section for this department</div>
              </div>
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </button>
        </div>
      ) : (
        <div className="mb-6 bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-xl border-2 border-blue-300 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Add New Section</h3>
                <p className="text-xs text-blue-100">Create a custom section for {selectedDepartment}</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <div className="max-w-md">
              <InputField
                label="Section Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., G, H, Special"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleAddSection}
                disabled={loading}
                className="group flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:-translate-y-0.5"
              >
                <div className="p-1.5 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <Save className="w-4 h-4" />
                </div>
                <span>Add & Save Section</span>
              </button>

              <button
                onClick={refetchSections}
                disabled={loading}
                className="group flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-1.5 bg-gray-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </div>
                <span>Refresh</span>
              </button>

              <button
                onClick={resetForm}
                disabled={loading}
                className="group flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-1.5 bg-gray-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <XCircle className="w-4 h-4 text-gray-600" />
                </div>
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Sections for {selectedDepartment}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentSections.length} section{currentSections.length !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>
        </div>

        {currentSections.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 shadow-lg">
              <Layers className="w-20 h-20 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Sections Yet</h3>
            <p className="text-gray-500 mb-2">No sections configured for this department</p>
            <p className="text-sm text-gray-400">Click the "Add New Section" button above to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {currentSections.map((section) => (
              <div
                key={section.id}
                className="group p-5 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                      {section.name}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-gray-900 text-lg">Section {section.name}</h4>
                        <StatusBadge status={section.isActive ? 'active' : 'inactive'} size="sm" />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {section.isActive ? 'Active' : 'Inactive'} • Last updated {new Date(section.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditSection(section)}
                      disabled={loading}
                      className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Edit Section"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(section)}
                      disabled={loading}
                      className={`p-2.5 rounded-xl transition-all duration-300 ${
                        section.isActive
                          ? 'text-green-600 hover:bg-green-100 hover:shadow-md'
                          : 'text-gray-400 hover:bg-gray-100 hover:shadow-md'
                      }`}
                      title={section.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {section.isActive ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section)}
                      disabled={loading}
                      className="p-2.5 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Section"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Section Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={closeEditModal}
        title="Edit Section"
        size="sm"
      >
        <div className="space-y-4">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Edit2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Editing Section</h4>
                <p className="text-xs text-gray-600">Update the name for this section</p>
              </div>
            </div>
          </div>

          {/* Current Section Info */}
          {selectedSection && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {selectedSection.name}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current Section</p>
                  <p className="text-xs font-medium text-gray-900">{selectedSection.department}</p>
                </div>
              </div>
            </div>
          )}

          {/* Edit Form */}
          <div>
            <InputField
              label="New Section Name"
              name="name"
              value={editFormData.name}
              onChange={handleEditInputChange}
              placeholder="Enter new section name"
              required
            />
          </div>

          {/* Info Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-900 mb-0.5">Important</p>
                <p className="text-xs text-amber-700">
                  Changing the section name will update it across the system.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={handleSaveEdit}
              disabled={loading}
              className="flex-1 group flex items-center justify-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium px-4 py-2.5 rounded-lg shadow hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
            <button
              onClick={closeEditModal}
              disabled={loading}
              className="flex-1 group flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg border-2 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedSection(null);
        }}
        title="Delete Section"
        showFooter={false}
        size="sm"
      >
        <div className="space-y-4">
          {/* Warning Header */}
          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 border border-red-200 text-center">
            <div className="inline-flex p-3 bg-red-100 rounded-full mb-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete Section</h3>
            <p className="text-xs text-gray-600">This action cannot be undone</p>
          </div>

          {/* Section Info */}
          {selectedSection && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow">
                  {selectedSection.name}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Section to be deleted</p>
                  <h4 className="text-sm font-bold text-gray-900">Section {selectedSection.name}</h4>
                  <p className="text-xs text-gray-600">{selectedSection.department}</p>
                  <StatusBadge status={selectedSection.isActive ? 'active' : 'inactive'} size="sm" />
                </div>
              </div>
            </div>
          )}

          {/* Warning Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-900 mb-1">⚠️ Warning</p>
                <ul className="text-xs text-amber-800 space-y-0.5">
                  <li>• This section will be permanently removed</li>
                  <li>• Students will need to be reassigned</li>
                  <li>• This action cannot be reversed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={confirmDeleteSection}
              disabled={loading}
              className="flex-1 group flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-medium px-4 py-2.5 rounded-lg shadow hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Yes, Delete</span>
            </button>
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedSection(null);
              }}
              disabled={loading}
              className="flex-1 group flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg border-2 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SectionConfiguration;
