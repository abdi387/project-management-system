// src/pages/student/StudentEvaluators.jsx

import React from 'react';
import { Shield, Mail, Building, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';

const StudentEvaluators = () => {
  const { user, users } = useAuth();
  const { getGroupByStudentId } = useProject();

  const group = getGroupByStudentId(user?.id);
  
  // Get full evaluator details including email from users list
  const evaluators = (group?.evaluators || []).map(evaluator => {
    const fullDetails = users.find(u => u.id === evaluator.id);
    return fullDetails || evaluator;
  });

  if (!group) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Group Found</h3>
        <p className="text-gray-500 mt-2">You are not currently assigned to a project group.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assigned Evaluators</h1>
          <p className="text-sm text-gray-500">
            Faculty members assigned to evaluate your group's project and defense.
          </p>
        </div>
      </div>

      {evaluators.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No Evaluators Assigned Yet</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            The Faculty Head has not yet assigned evaluators to your group. You will be notified once assignments are made.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evaluators.map((evaluator) => (
            <div 
              key={evaluator.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-bold">
                    {evaluator.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{evaluator.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      Evaluator
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <Building className="w-5 h-5 text-gray-400" />
                    <span className="text-sm">{evaluator.department || 'Department N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-sm">{evaluator.email}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentEvaluators;