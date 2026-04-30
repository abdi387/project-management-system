import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import authService from '../../services/authService';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (loading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.forgotPassword(trimmedEmail);

      if (response.success) {
        setSubmittedEmail(trimmedEmail);
        setSuccess(true);
        setEmail('');
        toast.success('Password reset link sent! Check your email.', {
          duration: 5000,
          icon: '📧'
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
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

      <div className="w-full max-w-xs relative z-10">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-200/50 border border-white p-7">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mb-4">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <Mail className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            <h2 
              className="text-lg md:text-xl font-bold text-gray-900 mb-2 uppercase"
              style={{ fontFamily: 'Times New Roman, serif' }}
            >
              Forgot Password?
            </h2>
            <p className="text-gray-500 text-sm font-sans">
              No worries! Enter your email and we'll send you reset instructions.
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
                    We've sent a password reset link to <strong>{submittedEmail}</strong>
                  </p>
                  <p className="text-green-600 text-xs mt-2 font-sans">
                    This link will expire in <strong>1 hour</strong>. Didn't receive it? Check your spam folder or try again.
                  </p>
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setSubmittedEmail('');
                    }}
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
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 ml-1 uppercase tracking-wide font-sans">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
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

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-600 font-sans mb-3">
              Remember your password?
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 mx-auto rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-900 transition-all duration-200 shadow-sm shadow-blue-100"
              style={{ fontFamily: 'Times New Roman, serif' }}
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

export default ForgotPassword;
