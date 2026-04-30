import { useProtectedRoute } from '../context/ProtectedRouteContext';

const useFeatureAccess = () => {
  const { isReadOnly, isFeatureAvailable, academicYear } = useProtectedRoute();

  const checkAccess = (feature, requiredRole = null) => {
    // Check if feature is available in current semester
    if (!isFeatureAvailable(feature)) {
      return {
        allowed: false,
        reason: `This feature is not available in Semester ${academicYear?.semester}`,
        action: null
      };
    }

    // Check if system is in read-only mode
    if (isReadOnly) {
      return {
        allowed: false,
        reason: 'The system is in read-only mode',
        action: 'view'
      };
    }

    return {
      allowed: true,
      reason: null,
      action: 'full'
    };
  };

  const getFeatureMessage = (feature) => {
    const access = checkAccess(feature);
    
    if (access.allowed) return null;
    
    if (access.reason) {
      return {
        type: 'warning',
        title: 'Feature Unavailable',
        message: access.reason,
        action: access.action === 'view' ? 'You can only view existing data.' : null
      };
    }
    
    return null;
  };

  return {
    checkAccess,
    getFeatureMessage,
    isReadOnly,
    currentSemester: academicYear?.semester,
    academicYear: academicYear?.current,
    status: academicYear?.status
  };
};

export default useFeatureAccess;