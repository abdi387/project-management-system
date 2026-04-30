import React from 'react';
import { Users, Award, UserCheck } from 'lucide-react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import Button from './Button';

const GroupDetailsModal = ({ isOpen, onClose, group, formatCGPA }) => {
  if (!group) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Group Details: ${group.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Group Information Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Group Info</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Department:</span>
                <span className="text-sm font-medium">{group.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Section:</span>
                <span className="text-sm font-medium">
                  {group.Members?.[0]?.section || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Members:</span>
                <span className="text-sm font-medium">{group.Members?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 mb-2">
              <Award className="w-4 h-4" />
              <span className="text-sm font-medium">Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Proposal:</span>
                <StatusBadge status={group.proposalStatus || 'not-submitted'} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progress:</span>
                <StatusBadge status={group.progressStatus || 'not-started'} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Final Draft:</span>
                <StatusBadge status={group.finalDraftStatus || 'not-submitted'} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Advisor Information */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <UserCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Advisor</span>
          </div>
          {group.Advisor ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                <span className="text-green-700 font-medium">
                  {group.Advisor.name.charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{group.Advisor.name}</div>
                <div className="text-sm text-gray-600">{group.Advisor.email}</div>
                <div className="text-xs text-gray-500">{group.Advisor.department}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No advisor assigned yet</p>
          )}
        </div>

        {/* Group Members */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Group Members ({group.Members?.length || 0})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {group.Members?.map((member, index) => (
              <div 
                key={member.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  member.id === group.leaderId 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    member.id === group.leaderId 
                      ? 'bg-yellow-200 text-yellow-700' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      {member.id === group.leaderId && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {member.studentId} | Section: {member.section || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${
                    member.cgpa >= 3.5 ? 'text-green-600' :
                    member.cgpa >= 3.0 ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    CGPA: {formatCGPA ? formatCGPA(member.cgpa) : member.cgpa}
                  </div>
                  <div className="text-xs text-gray-500">
                    {member.gender || 'Gender N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GroupDetailsModal;