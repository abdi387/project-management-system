// src/components/common/SemesterLock.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

const SemesterLock = ({ message }) => (
  <div className="max-w-4xl mx-auto">
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-yellow-800 mb-2">Functionality Restricted</h2>
      <p className="text-yellow-700">
        {message || 'This feature is not available in the current semester.'}
      </p>
    </div>
  </div>
);

export default SemesterLock;