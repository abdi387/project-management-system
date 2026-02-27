// src/pages/admin/SystemRelatedInquiries.jsx
import React, { useState, useEffect } from 'react';
import { Mail, Search, CheckCircle, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const SystemRelatedInquiries = () => {
  const [inquiries, setInquiries] = useState(() => {
    const saved = localStorage.getItem('fypInquiries');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('fypInquiries', JSON.stringify(inquiries));
  }, [inquiries]);

  const handleMarkAsResolved = (id) => {
    setInquiries(prev => prev.map(inq => 
      inq.id === id ? { ...inq, status: 'resolved' } : inq
    ));
    toast.success('Inquiry marked as resolved');
    setShowViewModal(false);
  };

  const handleDelete = () => {
    setInquiries(prev => prev.filter(inq => inq.id !== selectedInquiry.id));
    toast.success('Inquiry deleted successfully');
    setShowDeleteModal(false);
    setSelectedInquiry(null);
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { 
      key: 'message', 
      label: 'Message', 
      render: (msg) => <span className="truncate max-w-xs block">{msg}</span> 
    },
    { 
      key: 'date', 
      label: 'Date',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {status === 'resolved' ? 'Resolved' : 'Pending'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedInquiry(row); setShowViewModal(true); }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="View Details"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setSelectedInquiry(row); setShowDeleteModal(true); }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Inquiries</h1>
          <p className="text-gray-500">Manage support messages from the landing page</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={inquiries}
          searchable
          pageSize={10}
          emptyMessage="No inquiries found."
        />
      </div>

      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Inquiry Details"
        showFooter={false}
      >
        {selectedInquiry && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                {selectedInquiry.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{selectedInquiry.name}</h3>
                <p className="text-gray-500 text-sm">{selectedInquiry.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Sent on {new Date(selectedInquiry.date).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Message</h4>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                {selectedInquiry.message}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
              {selectedInquiry.status === 'pending' && (
                <Button 
                  variant="success" 
                  icon={CheckCircle}
                  onClick={() => handleMarkAsResolved(selectedInquiry.id)}
                >
                  Mark as Resolved
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Inquiry"
        onConfirm={handleDelete}
        confirmText="Delete"
        confirmVariant="danger"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Are you sure?</p>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone. This message will be permanently removed.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SystemRelatedInquiries;