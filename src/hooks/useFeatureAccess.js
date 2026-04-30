import { useProtectedRoute } from '../context/ProtectedRouteContext';

const useFeatureAccess = () => {
  const { isReadOnly, isFeatureAvailable, academicYear } = useProtectedRoute();

  const checkAccess = (feature) => {
    return {
      allowed: isFeatureAvailable(feature) && !isReadOnly,
      isReadOnly,
      isAvailable: isFeatureAvailable(feature)
    };
  };

  const getFeatureMessage = (feature) => {
    if (isReadOnly) {
      return {
        type: 'warning',
        title: 'Read Only Mode',
        message: 'You are in read-only mode. You can view but not modify data.'
      };
    }
    if (!isFeatureAvailable(feature)) {
      return {
        type: 'info',
        title: 'Feature Unavailable',
        message: `This feature is not available in Semester ${academicYear?.semester}.`
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