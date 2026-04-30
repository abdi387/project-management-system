import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [user, navigate]);

  // Check for session expired message on mount
  useEffect(() => {
    const loginMessage = sessionStorage.getItem('loginMessage');
    if (loginMessage) {
      try {
        const { type, message } = JSON.parse(loginMessage);
        if (type === 'warning') {
          toast(message, {
            duration: 5000,
            icon: '⏰',
            style: {
              background: '#f59e0b',
              color: '#fff'
            }
          });
        } else if (type === 'error') {
          toast.error(message, {
            duration: 5000
          });
        }
      } catch (e) {
        console.error('Error parsing login message:', e);
      } finally {
        sessionStorage.removeItem('loginMessage');
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Clear general error when user types
    if (error) setError('');
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Show specific field errors with toast
      if (!formData.email.trim()) {
        toast.error('Please enter your email', {
          icon: '📧',
          duration: 3000
        });
      } else if (!formData.password) {
        toast.error('Please enter your password', {
          icon: '🔒',
          duration: 3000
        });
      } else if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters', {
          icon: '🔑',
          duration: 3000
        });
      }
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Personalized welcome message based on role
        const roleMessages = {
          'admin': 'Welcome back, Administrator!',
          'faculty-head': 'Welcome back, Faculty Head!',
          'dept-head': 'Welcome back, Department Head!',
          'advisor': 'Welcome back, Advisor!',
          'student': 'Welcome back, Student!'
        };

        const welcomeMessage = roleMessages[result.user.role] || 'Welcome back!';

        toast.success(welcomeMessage, {
          icon: '🎉',
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
            fontWeight: 'bold'
          }
        });

        navigate(`/${result.user.role}`);
      } else {
        // Handle different error types with specific messages
        setError(result.error);

        // Show specific error toasts based on error message
        if (result.error && result.error.includes('pending')) {
          toast.error('⏳ Your account is pending approval', {
            duration: 5000,
            style: {
              background: '#f59e0b',
              color: '#fff'
            }
          });
        } else if (result.error && (result.error.includes('inactive') || result.error.includes('not eligible'))) {
          toast.error('🚫 Your account is inactive', {
            duration: 5000,
            style: {
              background: '#ef4444',
              color: '#fff'
            }
          });
        } else if (result.error && result.error.includes('Invalid email or password')) {
          toast.error('❌ Invalid email or password', {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff'
            }
          });
        } else {
          toast.error(result.error || 'Login failed', {
            icon: '❌',
            duration: 4000
          });
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      toast.error('🌐 Network error. Please check your connection.', {
        duration: 5000,
        style: {
          background: '#ef4444',
          color: '#fff'
        }
      });
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Subtle decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl"></div>
      </div>


      <button
        type="button"
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group z-10"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </button>

      <div className="w-full max-w-xs relative z-10">
        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-200/50 border border-white p-7">
          {/* Header with Logo */}
          <div className="text-center mb-6">
            <div className="mb-4">
              <img
                src="/logo.png"
                alt="HU Logo"
                className="w-24 h-24 object-contain mx-auto drop-shadow-lg"
              />
            </div>
            <h2
              className="text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 mb-3 pb-1 uppercase"
              style={{
                fontFamily: 'Times New Roman, serif',
                fontWeight: '950',
                letterSpacing: '0.08em',
                textShadow: '3px 3px 6px rgba(0,0,0,0.15)'
              }}
            >
              Welcome Back
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 mx-auto mb-2 rounded-full"></div>
            <p className="text-gray-500 text-sm">Sign in to access your dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 ml-1 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 ${
                    errors.email ? 'text-red-400' : focusedField === 'email' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className={`w-full pl-11 pr-4 py-2.5 bg-gray-50/80 border ${
                    errors.email
                      ? 'border-red-300 focus:border-red-400'
                      : focusedField === 'email'
                      ? 'border-blue-400'
                      : 'border-gray-200'
                  } rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all outline-none text-sm font-medium placeholder:text-gray-400 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {!errors.email && focusedField === 'email' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 ml-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Password
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 ${
                    errors.password ? 'text-red-400' : focusedField === 'password' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  disabled={loading}
                  className={`w-full pl-11 pr-12 py-2.5 bg-gray-50/80 border ${
                    errors.password
                      ? 'border-red-300 focus:border-red-400'
                      : focusedField === 'password'
                      ? 'border-blue-400'
                      : 'border-gray-200'
                  } rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all outline-none text-sm font-medium placeholder:text-gray-400 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 ml-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-600/40 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              <span className="text-base">Sign In</span>
            </button>
          </form>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-gray-400 mt-8 font-medium">
          &copy; {new Date().getFullYear()} Faculty of Informatics. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
