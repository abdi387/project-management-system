import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { proposalService, groupService, academicService, aiSuggestionService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import TextArea from '../../components/common/TextArea';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import AISuggestionModal from '../../components/common/AISuggestionModal';
import {
  FileText,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  Layers,
  ChevronDown,
  Sparkles,
  Lightbulb,
  Globe,
  Database,
  Cloud,
  Shield,
  Cpu,
  Smartphone,
  Link as LinkIcon,
  Gamepad,
  Zap,
  Brain,
  Info,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

// Domain icons mapping for visual variety
const domainIcons = {
  'Web Development': Globe,
  'Mobile Applications': Smartphone,
  'Artificial Intelligence': Brain,
  'Machine Learning': Brain,
  'Data Science': Database,
  'Cloud Computing': Cloud,
  'Cybersecurity': Shield,
  'Internet of Things': Cpu,
  'Blockchain': LinkIcon,
  'Game Development': Gamepad,
  'default': Layers
};

// Helper function to get icon for domain
const getDomainIcon = (domainName) => {
  const Icon = domainIcons[domainName] || domainIcons.default;
  return Icon;
};

const ProposalSubmission = () => {
  const { user } = useAuth();
  const { academicYear, isReadOnly } = useProtectedRoute();
  const [userGroup, setUserGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestionIndex, setAiSuggestionIndex] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Fetch domains
  const { 
    data: domainsData, 
    loading: domainsLoading 
  } = useFetch(() => academicService.getProjectDomains());

  const domains = domainsData?.domains || [];

  const [formData, setFormData] = useState({
    title1: '',
    title2: '',
    title3: '',
    description1: '',
    description2: '',
    description3: '',
    domain1: '',
    domain2: '',
    domain3: ''
  });

  // Fetch user's group – silently handle 404
  useEffect(() => {
    const fetchUserGroup = async () => {
      try {
        setLoading(true);
        const response = await groupService.getGroupByStudentId(user.id);
        if (response?.group) {
          setUserGroup(response.group);
        }
      } catch (error) {
        // Only log non-404 errors
        if (error.response?.status !== 404) {
          console.error('Failed to fetch user group:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchUserGroup();
    }
  }, [user?.id]);

  // Fetch existing proposal – 404 is expected if no proposal exists
  const { 
    data: proposalData, 
    loading: proposalLoading,
    refetch: refetchProposal
  } = useFetch(
    () => userGroup ? proposalService.getProposalByGroupId(userGroup.id) : Promise.reject('No group'),
    [userGroup?.id],
    !!userGroup // Only fetch if userGroup exists
  );

  const existingProposal = proposalData?.proposal;

  // Reset showForm when proposal changes
  useEffect(() => {
    if (existingProposal?.status === 'rejected') {
      setShowForm(false);
    } else {
      setShowForm(false);
    }
  }, [existingProposal]);

  // Validation helper
  const validateField = (field, value, minLength) => {
    if (!value || value.trim().length < minLength) {
      return `Must be at least ${minLength} characters`;
    }
    return null;
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate titles (min 10 chars)
    if (!formData.title1 || formData.title1.trim().length < 10) {
      errors.title1 = 'Title must be at least 10 characters';
    }
    if (!formData.title2 || formData.title2.trim().length < 10) {
      errors.title2 = 'Title must be at least 10 characters';
    }
    if (!formData.title3 || formData.title3.trim().length < 10) {
      errors.title3 = 'Title must be at least 10 characters';
    }
    
    // Validate descriptions (min 50 chars)
    if (!formData.description1 || formData.description1.trim().length < 50) {
      errors.description1 = 'Description must be at least 50 characters';
    }
    if (!formData.description2 || formData.description2.trim().length < 50) {
      errors.description2 = 'Description must be at least 50 characters';
    }
    if (!formData.description3 || formData.description3.trim().length < 50) {
      errors.description3 = 'Description must be at least 50 characters';
    }
    
    // Validate domains
    if (!formData.domain1) {
      errors.domain1 = 'Please select a domain';
    }
    if (!formData.domain2) {
      errors.domain2 = 'Please select a domain';
    }
    if (!formData.domain3) {
      errors.domain3 = 'Please select a domain';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleDomainChange = (index, value) => {
    setFormData(prev => ({ ...prev, [`domain${index}`]: value }));
    if (validationErrors[`domain${index}`]) {
      setValidationErrors(prev => ({ ...prev, [`domain${index}`]: null }));
    }
  };

  const handleOpenAISuggestions = (index) => {
    setAiSuggestionIndex(index);
    setShowAISuggestions(true);
  };

  const handleUseAISuggestion = (suggestion) => {
    const index = aiSuggestionIndex;
    setFormData(prev => ({
      ...prev,
      [`title${index}`]: suggestion.title,
      [`description${index}`]: suggestion.description || '',
      [`domain${index}`]: suggestion.domain || prev[`domain${index}`]
    }));
    toast.success('Title suggestion applied!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSubmitting(true);
    
    try {
      const proposalData = {
        groupId: userGroup.id,
        titles: [
          { 
            title: formData.title1.trim(), 
            description: formData.description1.trim(), 
            domain: formData.domain1 
          },
          { 
            title: formData.title2.trim(), 
            description: formData.description2.trim(), 
            domain: formData.domain2 
          },
          { 
            title: formData.title3.trim(), 
            description: formData.description3.trim(), 
            domain: formData.domain3 
          }
        ]
      };

      const response = await proposalService.submitProposal(proposalData);

      if (response?.success) {
        toast.success('Proposal submitted successfully!');
        await refetchProposal();
        // Clear form after successful submission
        setFormData({
          title1: '',
          title2: '',
          title3: '',
          description1: '',
          description2: '',
          description3: '',
          domain1: '',
          domain2: '',
          domain3: ''
        });
        setShowForm(false);
        setValidationErrors({});
      } else {
        toast.error(response?.error || 'Failed to submit proposal');
      }
    } catch (error) {
      console.error('Submit proposal error details:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (Array.isArray(errors)) {
          errors.forEach(err => toast.error(err.msg || err.message));
        } else {
          toast.error('Validation failed');
        }
      } else if (error.error) {
        toast.error(error.error);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to submit proposal');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = () => {
    // Start fresh with empty form
    setFormData({
      title1: '',
      title2: '',
      title3: '',
      description1: '',
      description2: '',
      description3: '',
      domain1: '',
      domain2: '',
      domain3: ''
    });
    setShowForm(true);
  };

  const getCharacterCount = (text) => text?.length || 0;

  if (loading || proposalLoading || domainsLoading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (!userGroup) {
    return (
      <PageContainer title="Proposal Submission" subtitle="Submit your project proposal">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Group Found</h2>
          <p className="text-yellow-700">
            You need to be in a group before submitting a proposal.
          </p>
        </div>
      </PageContainer>
    );
  }

  // If proposal exists and is approved/pending, show status view (no form)
  if (existingProposal && existingProposal.status !== 'rejected') {
    const status = existingProposal.status;
    const isPending = status === 'pending';
    const isApproved = status === 'approved';

    return (
      <PageContainer title="Proposal Submission" subtitle="View your proposal">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${
              isApproved ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {isApproved ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Proposal Status</h2>
              <p className="text-sm text-gray-500">
                Your proposal has been submitted and is currently{' '}
                <StatusBadge status={status} size="sm" />
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Submitted Titles</h3>
            {existingProposal.Titles?.map((title, index) => {
              const DomainIcon = getDomainIcon(title.Domain?.name);
              return (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{title.title}</p>
                      {title.description && (
                        <p className="text-sm text-gray-600 mt-1">{title.description}</p>
                      )}
                      {title.Domain && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                            <DomainIcon className="w-3 h-3" />
                            <span>{title.Domain.name}</span>
                          </div>
                          {index === existingProposal.approvedTitleIndex && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md">
                              ✓ Selected
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PageContainer>
    );
  }

  // If proposal exists and is rejected, show rejection view with resubmit button
  if (existingProposal && existingProposal.status === 'rejected' && !showForm) {
    return (
      <PageContainer title="Proposal Submission" subtitle="Your proposal was rejected">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Proposal Rejected</h2>
              <p className="text-sm text-gray-500">
                Your proposal was not approved. Please review the feedback and resubmit.
              </p>
            </div>
          </div>

          {existingProposal.feedback && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Feedback from Department Head</h3>
              <p className="text-red-700">{existingProposal.feedback}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-gray-900">Previously Submitted Titles</h3>
            {existingProposal.Titles?.map((title, index) => {
              const DomainIcon = getDomainIcon(title.Domain?.name);
              return (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{title.title}</p>
                      {title.description && (
                        <p className="text-sm text-gray-600 mt-1">{title.description}</p>
                      )}
                      {title.Domain && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                            <DomainIcon className="w-3 h-3" />
                            <span>{title.Domain.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isReadOnly && (
            <div className="flex justify-center">
              <Button
                onClick={handleResubmit}
                icon={RefreshCw}
                variant="primary"
                size="lg"
              >
                Resubmit Proposal
              </Button>
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  // No proposal exists, or user clicked resubmit after rejection
  if (domains.length === 0 && !existingProposal) {
    return (
      <PageContainer title="Proposal Submission" subtitle="Submit your project proposal">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Layers className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Domains Available</h2>
          <p className="text-yellow-700">
            Project domains have not been set up yet. Please contact the faculty head.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Show submission form (either first time or resubmit)
  return (
    <PageContainer 
      title={existingProposal ? "Resubmit Proposal" : ""}
      subtitle={existingProposal ? "Submit a new proposal after rejection" : ""}
    >
      {/* Requirements Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">Submission Requirements</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Each title must be at least <strong>10 characters</strong></li>
              <li>• Each description must be at least <strong>50 characters</strong></li>
              <li>• Select a domain for each title from the available options</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Domain Stats Banner */}
      {domains.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 mb-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Layers className="w-6 h-6 opacity-80" />
              <div>
                <p className="text-indigo-100 text-sm">Available Project Domains</p>
                <p className="text-xl font-bold">{domains.length} domains</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {domains.slice(0, 4).map(domain => {
                const Icon = getDomainIcon(domain);
                return (
                  <div key={domain} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    {domain}
                  </div>
                );
              })}
              {domains.length > 4 && (
                <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  +{domains.length - 4} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            {existingProposal ? "New Project Ideas" : "Project Ideas"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            You must submit three potential project titles. Select a domain for each from the available categories.
          </p>

          {/* Title 1 */}
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
              <h3 className="font-medium text-gray-900">First Choice</h3>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Primary</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenAISuggestions(1)}
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    Get AI Suggestions
                  </button>
                </div>
                <InputField
                  label=""
                  name="title1"
                  value={formData.title1}
                  onChange={handleChange}
                  required
                  placeholder="e.g., AI-Powered Student Performance Prediction System"
                  disabled={isReadOnly}
                  error={validationErrors.title1}
                />
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Min: 10 chars</span>
                  <span className={getCharacterCount(formData.title1) < 10 && formData.title1 ? 'text-red-500' : 'text-green-500'}>
                    {getCharacterCount(formData.title1)}/10
                  </span>
                </div>
              </div>
              
              <div>
                <TextArea
                  label="Description"
                  name="description1"
                  value={formData.description1}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe your project idea, its objectives, and expected outcomes..."
                  disabled={isReadOnly}
                  required
                  error={validationErrors.description1}
                />
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Min: 50 chars</span>
                  <span className={getCharacterCount(formData.description1) < 50 && formData.description1 ? 'text-red-500' : 'text-green-500'}>
                    {getCharacterCount(formData.description1)}/50
                  </span>
                </div>
              </div>
              
              {/* Domain Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.domain1}
                    onChange={(e) => handleDomainChange(1, e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
                      validationErrors.domain1 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isReadOnly}
                    required
                  >
                    <option value="">Select a domain</option>
                    {domains.map(domain => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {validationErrors.domain1 && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.domain1}</p>
                )}
              </div>
            </div>
          </div>

          {/* Title 2 */}
          <div className="mb-6 p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">2</div>
              <h3 className="font-medium text-gray-900">Second Choice</h3>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Alternative</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenAISuggestions(2)}
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    Get AI Suggestions
                  </button>
                </div>
                <InputField
                  label=""
                  name="title2"
                  value={formData.title2}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Blockchain-Based Academic Credential Verification"
                  disabled={isReadOnly}
                  error={validationErrors.title2}
                />
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Min: 10 chars</span>
                  <span className={getCharacterCount(formData.title2) < 10 && formData.title2 ? 'text-red-500' : 'text-green-500'}>
                    {getCharacterCount(formData.title2)}/10
                  </span>
                </div>
              </div>
              
              <div>
                <TextArea
                  label="Description"
                  name="description2"
                  value={formData.description2}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe your project idea, its objectives, and expected outcomes..."
                  disabled={isReadOnly}
                  required
                  error={validationErrors.description2}
                />
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Min: 50 chars</span>
                  <span className={getCharacterCount(formData.description2) < 50 && formData.description2 ? 'text-red-500' : 'text-green-500'}>
                    {getCharacterCount(formData.description2)}/50
                  </span>
                </div>
              </div>
              
              {/* Domain Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.domain2}
                    onChange={(e) => handleDomainChange(2, e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white ${
                      validationErrors.domain2 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isReadOnly}
                    required
                  >
                    <option value="">Select a domain</option>
                    {domains.map(domain => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {validationErrors.domain2 && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.domain2}</p>
                )}
              </div>
            </div>
          </div>

          {/* Title 3 */}
          <div className="p-5 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">3</div>
              <h3 className="font-medium text-gray-900">Third Choice</h3>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Backup</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenAISuggestions(3)}
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    Get AI Suggestions
                  </button>
                </div>
                <InputField
                  label=""
                  name="title3"
                  value={formData.title3}
                  onChange={handleChange}
                  required
                  placeholder="e.g., IoT-Based Smart Campus Management System"
                  disabled={isReadOnly}
                  error={validationErrors.title3}
                />
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Min: 10 chars</span>
                  <span className={getCharacterCount(formData.title3) < 10 && formData.title3 ? 'text-red-500' : 'text-green-500'}>
                    {getCharacterCount(formData.title3)}/10
                  </span>
                </div>
              </div>
              
              <div>
                <TextArea
                  label="Description"
                  name="description3"
                  value={formData.description3}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe your project idea, its objectives, and expected outcomes..."
                  disabled={isReadOnly}
                  required
                  error={validationErrors.description3}
                />
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Min: 50 chars</span>
                  <span className={getCharacterCount(formData.description3) < 50 && formData.description3 ? 'text-red-500' : 'text-green-500'}>
                    {getCharacterCount(formData.description3)}/50
                  </span>
                </div>
              </div>
              
              {/* Domain Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.domain3}
                    onChange={(e) => handleDomainChange(3, e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white ${
                      validationErrors.domain3 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isReadOnly}
                    required
                  >
                    <option value="">Select a domain</option>
                    {domains.map(domain => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {validationErrors.domain3 && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.domain3}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
              All domains are managed by Faculty Head
            </div>
            <Button
              type="submit"
              icon={Send}
              disabled={isReadOnly || submitting}
              loading={submitting}
              size="lg"
            >
              {existingProposal ? 'Resubmit Proposal' : 'Submit Proposal'}
            </Button>
          </div>
        </div>
      </form>

      {/* Domain Showcase */}
      {domains.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Available Domains
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {domains.map(domain => {
              const Icon = getDomainIcon(domain);
              return (
                <div key={domain} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <Icon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{domain}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Suggestion Modal */}
      <AISuggestionModal
        isOpen={showAISuggestions}
        onClose={() => setShowAISuggestions(false)}
        onUseSuggestion={handleUseAISuggestion}
        prefillData={{
          domain: formData[`domain${aiSuggestionIndex}`] || ''
        }}
        domains={domains}
      />
    </PageContainer>
  );
};

export default ProposalSubmission;