// src/pages/faculty-head/ProjectDomains.jsx

import React, { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import toast from 'react-hot-toast';

const ProjectDomains = () => {
  const { projectDomains, addProjectDomain, removeProjectDomain, updateProjectDomain } = useProject();
  const [newDomain, setNewDomain] = useState('');
  const [editingDomain, setEditingDomain] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    
    const result = addProjectDomain(newDomain.trim());
    if (result.success) {
      toast.success('Domain added successfully');
      setNewDomain('');
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdate = () => {
    if (!editValue.trim()) return;
    
    const result = updateProjectDomain(editingDomain, editValue.trim());
    if (result.success) {
      toast.success('Domain updated successfully');
      setEditingDomain(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      removeProjectDomain(deleteTarget);
      toast.success('Domain removed successfully');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Project Domains</h1>
        <p className="text-gray-500">Manage the list of project domains available for student proposals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add New Domain */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Domain
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <InputField
                label="Domain Name"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g. Cloud Computing"
                required
              />
              <Button type="submit" fullWidth disabled={!newDomain.trim()}>
                Add Domain
              </Button>
            </form>
          </div>
        </div>

        {/* Domain List */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5" /> Existing Domains ({projectDomains.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {projectDomains.map((domain) => (
                <div key={domain} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  {editingDomain === domain ? (
                    <div className="flex items-center gap-2 flex-1 mr-4">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        autoFocus
                      />
                      <button onClick={handleUpdate} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingDomain(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-medium text-gray-700">{domain}</span>
                  )}
                  
                  {editingDomain !== domain && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setEditingDomain(domain); setEditValue(domain); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteTarget(domain)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {projectDomains.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No domains defined yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Domain"
        message={`Are you sure you want to delete "${deleteTarget}"? This might affect existing proposals using this domain.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ProjectDomains;