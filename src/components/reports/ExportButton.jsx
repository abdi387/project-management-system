// src/components/reports/ExportButton.jsx
import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader } from 'lucide-react';
import Button from '../common/Button';

const ExportButton = ({ 
  onExportPDF, 
  onExportExcel,
  label = 'Export Report',
  pdfOnly = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleExport = async (type) => {
    setLoading(true);
    try {
      if (type === 'pdf' && onExportPDF) {
        await onExportPDF();
      } else if (type === 'excel' && onExportExcel) {
        await onExportExcel();
      }
    } finally {
      setLoading(false);
      setShowOptions(false);
    }
  };

  if (pdfOnly) {
    return (
      <Button
        onClick={() => handleExport('pdf')}
        loading={loading}
        icon={Download}
        variant="primary"
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setShowOptions(!showOptions)}
        icon={Download}
        variant="primary"
      >
        {label}
      </Button>

      {showOptions && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
          <button
            onClick={() => handleExport('pdf')}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-red-500" />
            )}
            <span>Export as PDF</span>
          </button>
          {onExportExcel && (
            <button
              onClick={() => handleExport('excel')}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-green-500" />
              )}
              <span>Export as Excel</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportButton;