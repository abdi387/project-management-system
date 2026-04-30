const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const buildProgressReportFileLink = (fileUrl) => {
  if (!fileUrl) return '';
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }
  if (fileUrl.startsWith('/uploads/')) {
    return `${API_HOST}${fileUrl}`;
  }
  return `${API_HOST}/uploads/progress-reports/${fileUrl}`;
};
