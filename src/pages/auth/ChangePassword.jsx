import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Key, AlertCircle, ArrowLeft } from 'lucide-react';
import authService from '../../services/authService';
import { academicService } from '../../services';
import toast from 'react-hot-toast';

const ChangePassword = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordMinLength, setPasswordMinLength] = useState(8);

  // Fetch system settings for password minimum length
  useEffect(() => {
    const fetchPasswordMinLength = async () => {
      try {
        const response = await academicService.getPasswordMinLength();
        if (response?.password_min_length !== undefined) {
          setPasswordMinLength(parseInt(response.password_min_length, 10));
        }
      } catch {
        console.log('Using default password minimum length (8)');
      }
    };

    fetchPasswordMinLength();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < passwordMinLength) {
      newErrors.newPassword = `Password must be at least ${passwordMinLength} characters`;
    } else if (!/\d/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Show first error as toast
      const firstError = Object.values(errors)[0];
      if (firstError) {
        toast.error(firstError, {
          duration: 3000
        });
      }
      return;
    }

    setLoading(true);

    try {
      const response = await authService.changePassword(formData.currentPassword, formData.newPassword);

      if (response.success) {
        toast.success('Password changed successfully!', {
          duration: 3000,
          icon: '🎉'
        });

        setTimeout(() => {
          navigate(-1); // Go back to previous page
        }, 2000);
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error.error || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl"></div>
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group z-10"
        style={{ fontFamily: 'Times New Roman, serif' }}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>

      <div className="w-full max-w-xs relative z-10">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/50 border border-white p-6">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="mb-3">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                <Lock className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <h2
              className="text-4xl font-extrabold text-gray-900 mb-1"
              style={{ fontFamily: 'Times New Roman, serif' }}
            >
              Change Password
            </h2>
            <p className="text-gray-500 text-xs" style={{ fontFamily: 'Times New Roman, serif' }}>
              Enter your current password and set a new one
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1 uppercase tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`w-4 h-4 ${errors.currentPassword ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{ fontFamily: 'Times New Roman, serif' }}
                  className={`w-full pl-10 pr-11 py-3 bg-gray-50/80 border ${
                    errors.currentPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
                  } rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all outline-none text-sm font-medium placeholder:text-gray-400 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500 ml-1 font-medium flex items-center gap-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                  <AlertCircle className="w-3 h-3" />
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1 uppercase tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className={`w-4 h-4 ${errors.newPassword ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder={`At least ${passwordMinLength} characters`}
                  disabled={loading}
                  style={{ fontFamily: 'Times New Roman, serif' }}
                  className={`w-full pl-10 pr-11 py-3 bg-gray-50/80 border ${
                    errors.newPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
                  } rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all outline-none text-sm font-medium placeholder:text-gray-400 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 ml-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                Must be at least {passwordMinLength} characters with at least one number
              </p>
              {errors.newPassword && (
                <p className="text-xs text-red-500 ml-1 font-medium flex items-center gap-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                  <AlertCircle className="w-3 h-3" />
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1 uppercase tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`w-4 h-4 ${errors.confirmPassword ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{ fontFamily: 'Times New Roman, serif' }}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50/80 border ${
                    errors.confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
                  } rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all outline-none text-sm font-medium placeholder:text-gray-400 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 ml-1 font-medium flex items-center gap-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                  <AlertCircle className="w-3 h-3" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-green-600 via-emerald-700 to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-600/40 hover:from-green-700 hover:via-emerald-800 hover:to-teal-800 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span style={{ fontFamily: 'Times New Roman, serif' }}>Changing...</span>
                </>
              ) : (
                <span style={{ fontFamily: 'Times New Roman, serif' }}>
                  Change Password
                </span>
              )}
            </button>
          </form>

        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-gray-400 mt-4 font-medium" style={{ fontFamily: 'Times New Roman, serif' }}>
          &copy; {new Date().getFullYear()} Faculty of Informatics. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ChangePassword;
