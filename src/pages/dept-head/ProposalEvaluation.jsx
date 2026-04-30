import React, { useMemo, useState } from 'react';
import { FileText, CheckCircle, XCircle, AlertCircle, Eye, Clock, TrendingUp, Users, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { proposalService, sectionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import TextArea from '../../components/common/TextArea';
import StatusBadge from '../../components/common/StatusBadge';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildSectionNameMap, formatGroupDisplayName, getMemberSectionName } from '../../utils/sectionDisplay';

const ProposalEvaluation = () => {
  const { user } = useAuth();
  const { isReadOnly, academicYear } = useProtectedRoute();
  const department = user?.department;

  // Fetch proposals
  const { 
    data: proposalsData, 
    loading: proposalsLoading,
    refetch: refetchProposals 
  } = useFetch(() => proposalService.getProposalsByDepartment(department));

  const { data: sectionsData } = useFetch(
    () => sectionService.getSectionsByDepartment(department, true),
    [department],
    !!department
  );

  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const proposals = proposalsData?.proposals || [];
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const reviewedProposals = proposals.filter(p => p.status !== 'pending');
  const sectionNameMap = useMemo(
    () => buildSectionNameMap(sectionsData?.sections || []),
    [sectionsData]
  );

  const handleApprove = async () => {
    if (selectedTitleIndex === null) {
      toast.error('Please select a title to approve');
      return;
    }

    setLoading(true);
    try {
      await proposalService.approveProposal(selectedProposal.id, selectedTitleIndex);
      toast.success('Proposal approved successfully!');
      setShowApproveModal(false);
      setSelectedProposal(null);
      setSelectedTitleIndex(null);
      await refetchProposals();
    } catch (error) {
      toast.error(error.error || 'Failed to approve proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback for rejection');
      return;
    }

    setLoading(true);
    try {
      await proposalService.rejectProposal(selectedProposal.id, feedback);
      toast.success('Proposal rejected');
      setShowRejectModal(false);
      setSelectedProposal(null);
      setFeedback('');
      await refetchProposals();
    } catch (error) {
      toast.error(error.error || 'Failed to reject proposal');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get group section from members or leader
  const getGroupSection = (proposal) => {
    const members = proposal.Group?.Members;
    if (members && members.length > 0) {
      // All members should have same section, take the first
      return getMemberSectionName(members[0], sectionNameMap);
    }
    // Fallback to leader's section if available
    return getMemberSectionName(proposal.Group?.Leader, sectionNameMap);
  };

  const columns = [
    {
      key: 'group',
      label: 'Group',
      render: (_, row) => (
          <div>
          <div className="font-medium text-gray-900">{formatGroupDisplayName(row.Group, sectionNameMap)}</div>
          <div className="text-xs text-gray-500">{row.Group?.department}</div>
        </div>
      )
    },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => {
        const section = getGroupSection(row);
        return <span className="text-sm text-gray-700">{section}</span>;
      }
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (value) => formatDate(value)
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProposal(row);
              setShowDetailsModal(true);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status === 'pending' && !isReadOnly && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProposal(row);
                  setShowApproveModal(true);
                }}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                title="Approve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProposal(row);
                  setShowRejectModal(true);
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  if (proposalsLoading) {
    return <LoadingSpinner fullScreen text="Loading proposals..." />;
  }

  return (
    <PageContainer>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl mb-8 p-8 md:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full translate-y-36 -translate-x-36"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Proposal Evaluation
            </h1>
          </div>
          <p className="text-purple-100 text-lg ml-14">
            Review and evaluate project proposals submitted by your department
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Total Proposals */}
        <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Proposals</p>
            <p className="text-3xl font-bold text-gray-900">{proposals.length}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-amber-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Pending Review</p>
            <p className="text-3xl font-bold text-amber-600">{pendingProposals.length}</p>
          </div>
        </div>

        {/* Approved */}
        <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-500"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Approved</p>
            <p className="text-3xl font-bold text-emerald-600">
              {proposals.filter(p => p.status === 'approved').length}
            </p>
          </div>
        </div>

        {/* Rejected */}
        <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-500"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <XCircle className="w-6 h-6 text-rose-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-rose-400 group-hover:text-rose-600 transition-colors" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Rejected</p>
            <p className="text-3xl font-bold text-rose-600">
              {proposals.filter(p => p.status === 'rejected').length}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Proposals Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100">
        <div className="relative p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Proposals Waiting for Review</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {pendingProposals.length} proposal{pendingProposals.length !== 1 ? 's' : ''} requiring your attention
              </p>
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={pendingProposals}
          searchable
          pageSize={10}
          emptyMessage="No pending proposals. Great job!"
        />
      </div>

      {/* Reviewed Proposals */}
      {reviewedProposals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="relative p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Reviewed Proposals</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {reviewedProposals.length} proposal{reviewedProposals.length !== 1 ? 's' : ''} already evaluated
                </p>
              </div>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={reviewedProposals}
            searchable
            pageSize={10}
          />
        </div>
      )}

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedProposal(null);
        }}
        title="Proposal Details"
        size="lg"
        showFooter={false}
      >
        {selectedProposal && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Group Information</h3>
              <p><span className="text-gray-500">Group:</span> {formatGroupDisplayName(selectedProposal.Group, sectionNameMap)}</p>
              <p><span className="text-gray-500">Department:</span> {selectedProposal.Group?.department}</p>
              <p><span className="text-gray-500">Section:</span> {getGroupSection(selectedProposal)}</p>
              <p><span className="text-gray-500">Submitted:</span> {formatDate(selectedProposal.submittedAt)}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Project Titles</h3>
              <div className="space-y-4">
                {selectedProposal.Titles?.map((title, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">Option {index + 1}</h4>
                      {selectedProposal.status === 'approved' && selectedProposal.approvedTitleIndex === index && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Approved
                        </span>
                      )}
                    </div>
                    <p className="text-blue-600 font-medium">{title.title}</p>
                    <p className="text-sm text-gray-500 mt-1">Domain: {title.Domain?.name}</p>
                    <p className="text-sm text-gray-600 mt-2">{title.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedProposal.feedback && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-1">Feedback</h4>
                <p className="text-sm text-yellow-700">{selectedProposal.feedback}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedProposal(null);
          setSelectedTitleIndex(null);
        }}
        title="Approve Proposal"
        onConfirm={handleApprove}
        confirmText="Approve Selected"
        loading={loading}
      >
        {selectedProposal && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Select which project title to approve for <strong>{formatGroupDisplayName(selectedProposal.Group, sectionNameMap)}</strong> (Section {getGroupSection(selectedProposal)}):
            </p>
            <div className="space-y-3">
              {selectedProposal.Titles?.map((title, index) => (
                <label
                  key={index}
                  className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTitleIndex === index
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="titleOption"
                      value={index}
                      checked={selectedTitleIndex === index}
                      onChange={() => setSelectedTitleIndex(index)}
                      className="mt-1"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">Option {index + 1}</h4>
                      <p className="text-blue-600">{title.title}</p>
                      <p className="text-sm text-gray-500 mt-1">Domain: {title.Domain?.name}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedProposal(null);
          setFeedback('');
        }}
        title="Reject Proposal"
        onConfirm={handleReject}
        confirmText="Reject with Feedback"
        confirmVariant="danger"
        loading={loading}
      >
        {selectedProposal && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Provide feedback for <strong>{formatGroupDisplayName(selectedProposal.Group, sectionNameMap)}</strong> (Section {getGroupSection(selectedProposal)}):
            </p>
            <TextArea
              label="Feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Explain why the proposal is being rejected and what needs to be improved..."
              rows={5}
              required
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default ProposalEvaluation;
