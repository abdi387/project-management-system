import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import authService from '../../services/authService';
import { academicService } from '../../services';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [passwordMinLength, setPasswordMinLength] = useState(8);

  // Fetch password minimum length
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

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await authService.verifyResetToken(token);

        if (response.valid) {
          setValidToken(true);
        } else {
          setValidToken(false);
          toast.error('Invalid or expired reset token');
        }
      } catch (error) {
        setValidToken(false);
        toast.error('Invalid or expired reset link. Please request a new one.');
      } finally {
        setValidating(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.password.length < passwordMinLength) {
      toast.error(`Password must be at least ${passwordMinLength} characters`);
      return;
    }

    if (!/\d/.test(formData.password)) {
      toast.error('Password must contain at least one number');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(token, formData.password);

      if (response.success) {
        // Clear any existing session data since password has changed
        localStorage.removeItem('fypToken');
        localStorage.removeItem('fypUser');

        toast.success('Password reset successfully! Redirecting to login...', {
          duration: 3000,
          icon: '🎉'
        });

        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(error.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-sans">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-200/50 border border-white p-10 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 
              className="text-3xl font-bold text-gray-900 mb-3"
              style={{ fontFamily: 'Times New Roman, serif' }}
            >
              Invalid Link
            </h2>
            <p className="text-gray-500 text-sm font-sans mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/auth/forgot-password"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 font-sans"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-xs relative z-10">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-200/50 border border-white p-7">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mb-4">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                <Lock className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <h2 
              className="text-lg md:text-xl font-bold text-gray-900 mb-2 uppercase"
              style={{ fontFamily: 'Times New Roman, serif' }}
            >
              Reset Password
            </h2>
            <p className="text-gray-500 text-sm font-sans">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 ml-1 uppercase tracking-wide font-sans">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={`At least ${passwordMinLength} characters`}
                  disabled={loading}
                  style={{ fontFamily: 'Times New Roman, serif' }}
                  className="w-full pl-11 pr-12 py-2.5 bg-gray-50/80 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 transition-all outline-none text-sm font-medium placeholder:text-gray-400 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 ml-1 font-sans">
                Must be at least {passwordMinLength} characters with at least one number
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 ml-1 uppercase tracking-wide font-sans">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{ fontFamily: 'Times New Roman, serif' }}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 transition-all outline-none text-sm font-medium placeholder:text-gray-400 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-600/40 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-sans">Resetting...</span>
                </>
              ) : (
                <span className="text-lg" style={{ fontFamily: 'Times New Roman, serif' }}>
                  Reset Password
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-600 font-sans mb-3">
              Remember your password?
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 mx-auto rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-900 transition-all duration-200 shadow-sm shadow-blue-100"
            >
              <span className="text-blue-500">←</span>
              <span>Back to Login</span>
            </Link>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-gray-400 mt-8 font-medium font-sans">
          &copy; {new Date().getFullYear()} Faculty of Informatics. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
