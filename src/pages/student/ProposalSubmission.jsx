// src/pages/student/ProposalSubmission.jsx
import React, { useState } from 'react';
import { FileText, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import TextArea from '../../components/common/TextArea';
import SelectDropdown from '../../components/common/SelectDropdown';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import SemesterLock from '../../components/common/SemesterLock';

const ProposalSubmission = () => {
  const { user } = useAuth();
  const { getGroupByStudentId, getProposalByGroupId, submitProposal, academicYear, isReadOnly } = useProject();
  
  if (academicYear?.semester === 2) {
    return <SemesterLock message="Project proposal submission is only available in the first semester." />;
  }

  const group = getGroupByStudentId(user?.id);
  const existingProposal = group ? getProposalByGroupId(group.id) : null;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [titles, setTitles] = useState([
    { title: '', domain: '', description: '' },
    { title: '', domain: '', description: '' },
    { title: '', domain: '', description: '' }
  ]);

  const domains = [
    { value: 'Web Development', label: 'Web Development' },
    { value: 'Mobile Application', label: 'Mobile Application' },
    { value: 'Machine Learning', label: 'Machine Learning' },
    { value: 'Data Science', label: 'Data Science' },
    { value: 'Cybersecurity', label: 'Cybersecurity' },
    { value: 'IoT', label: 'Internet of Things (IoT)' },
    { value: 'Cloud Computing', label: 'Cloud Computing' },
    { value: 'Blockchain', label: 'Blockchain' },
    { value: 'Game Development', label: 'Game Development' },
    { value: 'Other', label: 'Other' }
  ];

  const handleTitleChange = (index, field, value) => {
    setTitles(prev => prev.map((t, i) => 
      i === index ? { ...t, [field]: value } : t
    ));
  };

  const validateForm = () => {
    setError(null);
    for (let i = 0; i < titles.length; i++) {
      if (!titles[i].title.trim()) {
        const msg = `Project title ${i + 1} is required`;
        toast.error(msg);
        setError(msg);
        return false;
      }
      if (titles[i].title.length < 10) {
        const msg = `Project title ${i + 1} must be at least 10 characters`;
        toast.error(msg);
        setError(msg);
        return false;
      }
      if (!titles[i].domain) {
        const msg = `Domain for project ${i + 1} is required`;
        toast.error(msg);
        setError(msg);
        return false;
      }
      if (!titles[i].description.trim()) {
        const msg = `Description for project ${i + 1} is required`;
        toast.error(msg);
        setError(msg);
        return false;
      }
      if (titles[i].description.length < 50) {
        const msg = `Description for project ${i + 1} must be at least 50 characters`;
        toast.error(msg);
        setError(msg);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!group) {
      const msg = 'You must be assigned to a group to submit a proposal';
      toast.error(msg);
      setError(msg);
      return;
    }
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));
      
      submitProposal(group.id, { titles });
      toast.success('Proposal submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit proposal');
      setError('Failed to submit proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If no group assigned
  if (!group) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Group Assigned</h2>
          <p className="text-yellow-700">
            You need to be assigned to a group before you can submit a project proposal.
            Please wait for your department head to initiate group formation.
          </p>
        </div>
      </div>
    );
  }

  // If proposal already submitted and approved
  if (existingProposal?.status === 'approved') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Proposal</h1>
        
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-800">Proposal Approved!</h2>
              <p className="text-green-700">Congratulations! Your project proposal has been approved.</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Approved Project</h3>
            <p className="text-xl font-medium text-blue-600">{existingProposal.approvedTitle?.title}</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Domain</p>
                <p className="font-medium">{existingProposal.approvedTitle?.domain}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved On</p>
                <p className="font-medium">
                  {new Date(existingProposal.approvedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Description</p>
              <p className="mt-1 text-gray-700">{existingProposal.approvedTitle?.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If proposal rejected
  if (existingProposal?.status === 'rejected') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Proposal</h1>
        
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
              <h2 className="text-lg font-semibold text-red-800">Proposal Rejected</h2>
              <p className="text-red-700">Please submit a new proposal with different project titles.</p>
            </div>
          </div>
          {existingProposal.feedback && (
            <div className="bg-white rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-500 mb-1">Feedback from Department Head:</p>
              <p className="text-gray-700">{existingProposal.feedback}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Show form for resubmission */}
        <ProposalForm 
          titles={titles}
          domains={domains}
          handleTitleChange={handleTitleChange}
          handleSubmit={handleSubmit}
          loading={loading}
          isReadOnly={isReadOnly}
          isResubmit
        />
      </div>
    );
  }

  // If proposal pending
  if (existingProposal?.status === 'pending') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Proposal</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-yellow-800">Proposal Under Review</h2>
              <p className="text-yellow-700">Your proposal is being reviewed by the department head.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {existingProposal.titles.map((title, index) => (
              <div key={index} className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Option {index + 1}</h4>
                  <StatusBadge status="pending" size="sm" />
                </div>
                <p className="text-blue-600 font-medium">{title.title}</p>
                <p className="text-sm text-gray-500 mt-1">Domain: {title.domain}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Initial submission form
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Submit Project Proposal</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Instructions
        </h3>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Submit exactly 3 different project titles</li>
          <li>Each title must have a domain and detailed description</li>
          <li>The department head will review and approve one of the titles</li>
          <li>If rejected, you will need to submit new titles</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <ProposalForm 
        titles={titles}
        domains={domains}
        handleTitleChange={handleTitleChange}
        handleSubmit={handleSubmit}
        loading={loading}
        isReadOnly={isReadOnly}
      />
    </div>
  );
};

// Separate form component for reuse
const ProposalForm = ({ titles, domains, handleTitleChange, handleSubmit, loading, isResubmit = false, isReadOnly }) => (
  <div className="space-y-6">{titles.map((title, index) => (
      <div key={index} className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Project Option {index + 1}
        </h3>
        
        <div className="space-y-4">
          <InputField
            label="Project Title"
            name={`title-${index}`}
            value={title.title}
            onChange={(e) => handleTitleChange(index, 'title', e.target.value)}
            placeholder="Enter a descriptive project title"
            disabled={isReadOnly}
            required
          />
          
          <SelectDropdown
            label="Project Domain"
            name={`domain-${index}`}
            value={title.domain}
            onChange={(e) => handleTitleChange(index, 'domain', e.target.value)}
            options={domains}
            placeholder="Select project domain"
            disabled={isReadOnly}
            required
          />
          
          <TextArea
            label="Project Description"
            name={`description-${index}`}
            value={title.description}
            onChange={(e) => handleTitleChange(index, 'description', e.target.value)}
            placeholder="Provide a detailed description of the project (minimum 50 characters)"
            rows={4}
            disabled={isReadOnly}
            maxLength={500}
            required
          />
        </div>
      </div>
    ))}

    <div className="flex justify-end">
      <Button
        onClick={handleSubmit}
        loading={loading}
        icon={Send}
        size="lg"
        disabled={isReadOnly}
      >
        {isResubmit ? 'Resubmit Proposal' : 'Submit Proposal'}
      </Button>
    </div>
  </div>
);

export default ProposalSubmission;