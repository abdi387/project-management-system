// src/pages/advisor/EvaluationDetails.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Users, BookOpen, Shield, UserCheck, Building, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';

const EvaluationDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, users } = useAuth();
  const { groups } = useProject();

  const group = groups.find(g => g.id === groupId);
  
  if (!group) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} icon={ArrowLeft}>
          Back to Evaluations
        </Button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-700">Group not found or you are not authorized to view this evaluation.</p>
        </div>
      </div>
    );
  }

  const members = group.members.map(id => users.find(u => u.id === id)).filter(Boolean);
  const section = members.length > 0 ? members[0].section : null;
  const advisor = users.find(u => u.id === group.advisorId);
  const evaluators = group.evaluators || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} icon={ArrowLeft}>
        Back to Evaluations
      </Button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-gray-500">
              <Building className="w-4 h-4" />
              <span>{group.department ? `${group.department} Department` : 'Department N/A'}</span>
              {section && (
                <>
                  <span className="mx-1">•</span>
                  <span>Section {section}</span>
                </>
              )}
            </div>
          </div>
          <StatusBadge status={group.finalDraftStatus === 'fully-approved' ? 'Ready for Defense' : group.finalDraftStatus} />
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-indigo-900">Project Title</h3>
              <p className="text-indigo-800 mt-1 font-medium">{group.approvedTitle || 'No title approved yet'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Committee */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Evaluation Committee
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          The following faculty members are assigned to evaluate this group jointly.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluators.map((evaluator) => (
            <div 
              key={evaluator.id} 
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                evaluator.id === user.id 
                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                evaluator.id === user.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {evaluator.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {evaluator.name} {evaluator.id === user.id && <span className="text-indigo-600 text-xs ml-1">(You)</span>}
                </p>
                <p className="text-sm text-gray-500">{evaluator.department}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Advisor Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-gray-600" />
            Project Advisor
          </h2>
          {advisor ? (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                {advisor.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{advisor.name}</p>
                <p className="text-sm text-gray-500">{advisor.department}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <Mail className="w-3 h-3" /> {advisor.email}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">No advisor assigned</p>
          )}
        </div>

        {/* Students Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            Group Members
          </h2>
          <ul className="space-y-3">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.studentId}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EvaluationDetails;