import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Key } from 'lucide-react';
import authService from '../../services/authService';
import toast from 'react-hot-toast';

const ResetPasswordInitiate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await authService.resetPasswordInitiate();

      if (response.success) {
        setSuccess(true);
        toast.success('Password reset link sent! Check your email.', {
          duration: 5000,
          icon: '📧'
        });
      }
    } catch (error) {
      console.error('Reset password initiate error:', error);
      toast.error(error.error || 'Failed to send reset link. Please try again.');
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
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group z-10"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="font-sans">Back</span>
      </button>

      <div className="w-full max-w-xs relative z-10">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-200/50 border border-white p-7">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mb-4">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                <Key className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            <h2
              className="text-lg md:text-xl font-bold text-gray-900 mb-2 uppercase"
              style={{ fontFamily: 'Times New Roman, serif' }}
            >
              Reset Password
            </h2>
            <p className="text-gray-500 text-sm font-sans">
              We'll send a password reset link to your registered email
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-green-800 font-semibold text-sm mb-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                    Email Sent!
                  </h4>
                  <p className="text-green-700 text-sm font-sans">
                    We've sent a password reset link to your registered email address.
                  </p>
                  <p className="text-green-600 text-xs mt-2 font-sans">
                    Didn't receive it? Check your spam folder or try again.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-green-700 text-xs font-semibold mt-3 hover:underline font-sans"
                  >
                    Send another email
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-800 font-semibold text-sm mb-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                      Password Reset
                    </h4>
                    <p className="text-blue-700 text-xs font-sans">
                      Click the button below to receive a password reset link at your registered email address. The link will expire in 1 hour.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-600/40 hover:from-purple-700 hover:via-indigo-700 hover:to-indigo-800 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-sans">Sending...</span>
                  </>
                ) : (
                  <span className="text-lg" style={{ fontFamily: 'Times New Roman, serif' }}>
                    Send Reset Link
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Alternative: Change Password Directly */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 font-sans mb-3">
              Prefer to change it now?
            </p>
            <Link
              to="/auth/change-password"
              className="block w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 text-center font-sans"
            >
              Change Password Directly
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link
              to="/auth/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-sans flex items-center justify-center gap-2"
            >
              <span>Remember your password?</span>
              <span className="font-semibold text-blue-600 underline underline-offset-2">Back to Login</span>
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

export default ResetPasswordInitiate;
