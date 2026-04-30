// src/components/common/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showFooter = true,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  disabled = false
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md w-full',
    md: 'max-w-lg w-full',
    lg: 'max-w-2xl w-full',
    xl: 'max-w-4xl w-full',
    '2xl': 'max-w-5xl w-full',
    full: 'max-w-full mx-4'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`
            relative bg-white rounded-xl shadow-xl w-full ${sizes[size]}
            transform transition-all fade-in
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {showFooter && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button 
                variant="secondary" 
                onClick={onClose}
                disabled={loading || disabled}
              >
                {cancelText}
              </Button>
              {onConfirm && (
                <Button
                  variant={confirmVariant}
                  onClick={onConfirm}
                  loading={loading}
                  disabled={disabled}
                >
                  {confirmText}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;