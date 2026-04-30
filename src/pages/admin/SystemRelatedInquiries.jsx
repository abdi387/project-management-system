import React, { useState } from 'react';
import {
  Mail,
  Search,
  CheckCircle,
  Trash2,
  MessageSquare,
  AlertCircle,
  Filter,
  Download,
  Eye,
  Clock,
  User,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { inquiryService } from '../../services';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const SystemRelatedInquiries = () => {
  const { user } = useAuth();
  const { isReadOnly } = useProtectedRoute();

  // Fetch inquiries
  const { 
    data: inquiriesData, 
    loading: inquiriesLoading,
    refetch: refetchInquiries
  } = useFetch(() => inquiryService.getInquiries());

  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const inquiries = inquiriesData?.inquiries || [];

  // Filter inquiries
  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch = 
      inquiry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingCount = inquiries.filter(i => i.status === 'pending').length;
  const resolvedCount = inquiries.filter(i => i.status === 'resolved').length;

  const handleMarkAsResolved = async (id, newStatus) => {
    setLoading(true);
    try {
      await inquiryService.resolveInquiry(id, null, newStatus);
      toast.success(`Inquiry marked as ${newStatus}`);
      setShowViewModal(false);
      await refetchInquiries();
    } catch (error) {
      toast.error(error.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await inquiryService.deleteInquiry(selectedInquiry.id);
      toast.success('Inquiry deleted successfully');
      setShowDeleteModal(false);
      setSelectedInquiry(null);
      await refetchInquiries();
    } catch (error) {
      toast.error(error.error || 'Failed to delete inquiry');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setLoading(true);
    try {
      await inquiryService.resolveInquiry(selectedInquiry.id, replyMessage, 'resolved');
      toast.success('Reply sent successfully');
      setShowReplyModal(false);
      setReplyMessage('');
      setSelectedInquiry(null);
      await refetchInquiries();
    } catch (error) {
      toast.error(error.error || 'Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (inquiry, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
    setLoading(true);
    try {
      await inquiryService.resolveInquiry(inquiry.id, null, newStatus);
      toast.success(`Inquiry marked as ${newStatus}`);
      await refetchInquiries();
    } catch (error) {
      toast.error(error.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Sender',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
            {row.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'message',
      label: 'Message',
      render: (msg) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-600 line-clamp-2">{msg}</p>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Received',
      render: (_, row) => (
        <div className="text-sm text-gray-600">
          {formatDateTime(row.createdAt)}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (status, row) => (
        <button
          onClick={() => handleToggleStatus(row, status)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80 ${
            status === 'resolved'
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
          title={`Click to mark as ${status === 'pending' ? 'resolved' : 'pending'}`}
        >
          {status === 'resolved' ? '✓ Resolved' : '⏳ Pending'}
        </button>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedInquiry(row);
              setShowViewModal(true);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status === 'pending' && (
            <button
              onClick={() => {
                setSelectedInquiry(row);
                setShowReplyModal(true);
              }}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Reply"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setSelectedInquiry(row);
              setShowDeleteModal(true);
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (inquiriesLoading) {
    return <LoadingSpinner fullScreen text="Loading inquiries..." />;
  }

  return (
    <PageContainer>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Inquiries</p>
              <p className="text-3xl font-bold">{inquiries.length}</p>
            </div>
            <Mail className="w-12 h-12 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unique Senders</p>
              <p className="text-2xl font-bold text-blue-600">
                {new Set(inquiries.map(i => i.email)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <InputField
              placeholder="Search by name, email, or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'resolved', label: 'Resolved' }
            ]}
          />
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredInquiries}
          searchable={false}
          pageSize={10}
          emptyMessage="No inquiries found."
        />
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedInquiry(null);
        }}
        title="Inquiry Details"
        size="lg"
        showFooter={false}
      >
        {selectedInquiry && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl">
                {selectedInquiry.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{selectedInquiry.name}</h3>
                <p className="text-gray-500 text-sm">{selectedInquiry.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {formatDateTime(selectedInquiry.createdAt)}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedInquiry.status === 'resolved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedInquiry.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Message</h4>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                {selectedInquiry.message}
              </p>
            </div>

            {selectedInquiry.response && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-700 mb-2">Admin Response</h4>
                <p className="text-blue-900 whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.response}
                </p>
              </div>
            )}

            {selectedInquiry.resolvedAt && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Resolved on {formatDateTime(selectedInquiry.resolvedAt)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                <button
                  onClick={() => handleToggleStatus(selectedInquiry, selectedInquiry.status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedInquiry.status === 'resolved'
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                  title={`Click to mark as ${selectedInquiry.status === 'pending' ? 'resolved' : 'pending'}`}
                >
                  {selectedInquiry.status === 'resolved' ? '✓ Resolved' : '⏳ Pending'}
                </button>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                  Close
                </Button>
                {selectedInquiry.status === 'pending' && (
                  <Button
                    variant="success"
                    onClick={() => {
                      setShowViewModal(false);
                      setShowReplyModal(true);
                    }}
                    icon={MessageSquare}
                  >
                    Reply
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reply Modal */}
      <Modal
        isOpen={showReplyModal}
        onClose={() => {
          setShowReplyModal(false);
          setSelectedInquiry(null);
          setReplyMessage('');
        }}
        title="Reply to Inquiry"
        size="lg"
        onConfirm={handleReply}
        confirmText="Send Reply"
        loading={loading}
      >
        {selectedInquiry && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">To:</p>
              <p className="font-medium text-gray-900">{selectedInquiry.email}</p>
              <p className="text-xs text-gray-500 mt-2">Original Message:</p>
              <p className="text-sm text-gray-600 italic">"{selectedInquiry.message}"</p>
            </div>

            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply here..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Your reply will be sent to the user's email address.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedInquiry(null);
        }}
        onConfirm={handleDelete}
        title="Delete Inquiry"
        message={`Are you sure you want to delete this inquiry from ${selectedInquiry?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={loading}
      />
    </PageContainer>
  );
};

export default SystemRelatedInquiries;