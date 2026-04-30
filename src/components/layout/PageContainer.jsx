import React from 'react';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import useFeatureAccess from '../../hooks/useFeatureAccess';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import SemesterLock from '../common/SemesterLock';

const PageContainer = ({
  children,
  title,
  subtitle,
  requiredFeature = null,
  loading = false,
  error = null,
  actionButton = null
}) => {
  const { isReadOnly } = useProtectedRoute();
  const { checkAccess, getFeatureMessage } = useFeatureAccess();

  // Check feature access if required
  if (requiredFeature) {
    const access = checkAccess(requiredFeature);
    if (!access.allowed) {
      const message = getFeatureMessage(requiredFeature);
      return <SemesterLock message={message?.message} />;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text={`Loading ${title}...`} />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Header Section */}
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>{title}</h1>
            {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {isReadOnly && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                Read Only Mode
              </span>
            )}
            {actionButton}
          </div>
        </div>
      )}

      {/* Read-only warning */}
      {isReadOnly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ You are in read-only mode. You can view but not modify data.
          </p>
        </div>
      )}

      {/* Main Content */}
      {children}
    </div>
  );
};

export default PageContainer;
