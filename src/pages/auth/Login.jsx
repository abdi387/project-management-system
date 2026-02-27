// src/pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
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
  const [errors, setErrors] = useState({});
  const controls = useAnimation();

  // If a user is already logged in when they visit this page,
  // redirect them to their dashboard. This prevents logged-in users
  // from seeing the login form and fixes the redirect loop.
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      controls.start({
        x: [0, -10, 10, -10, 10, 0], 
        transition: { duration: 0.4 }
      });
      return;
    }
    
    setLoading(true);
    try {
      // Simulate network delay for effect
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const result = login(formData.email, formData.password);
      
      if (result.success) {
        toast.success('Welcome back!');
        navigate(`/${result.user.role}`);
      } else {
        toast.error(result.error);
        controls.start({
          x: [0, -10, 10, -10, 10, 0],
          transition: { duration: 0.4 }
        });
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Style to hide browser's default password reveal icon */}
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
        input[type="password"]::-webkit-reveal,
        input[type="password"]::-webkit-clear-button {
          display: none;
        }
      `}</style>
      
      {/* Advanced Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-violet-100 via-slate-50 to-white opacity-70"></div>
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,var(--tw-gradient-stops))] from-fuchsia-100 via-transparent to-transparent opacity-60"></div>
        
        {/* Animated Shapes */}
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-72 h-72 bg-violet-300/30 rounded-full blur-3xl mix-blend-multiply"
        />
        <motion.div 
          animate={{ 
            y: [0, 30, 0],
            rotate: [0, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-fuchsia-300/30 rounded-full blur-3xl mix-blend-multiply"
        />
      </div>

      {/* Back Button */}
      <motion.button 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-violet-600 font-medium transition-all z-20 group"
      >
        <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all border border-slate-100">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </div>
        <span className="hidden sm:inline">Back to Home</span>
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Glass Card */}
        <motion.div 
          animate={controls}
          className="bg-white/50 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-violet-500/10 border border-white/30 p-8 md:p-10 relative overflow-hidden"
        >
          {/* Decorative top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-violet-500 via-fuchsia-500 to-violet-500"></div>

          {/* Header */}
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="relative w-40 h-40 mx-auto mb-6"
            >
              <div className="absolute inset-0 bg-violet-400/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-full h-full bg-white rounded-2xl shadow-lg flex items-center justify-center border border-slate-100 p-4">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 text-sm">Sign in to manage your projects</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 transition-colors ${errors.email ? 'text-red-400' : 'text-slate-400 group-focus-within:text-violet-500'}`} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:border-violet-500 focus:ring-violet-200'} rounded-xl focus:bg-white focus:ring-4 transition-all outline-none text-sm font-medium placeholder:text-slate-400`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 ml-1 font-medium">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</label> 
                <a href="#" className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors">Forgot?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-colors ${errors.password ? 'text-red-400' : 'text-slate-400 group-focus-within:text-violet-500'}`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3.5 bg-slate-50/50 border ${errors.password ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:border-violet-500 focus:ring-violet-200'} rounded-xl focus:bg-white focus:ring-4 transition-all outline-none text-sm font-medium placeholder:text-slate-400`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 ml-1 font-medium">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button onClick={() => navigate('/')} className="font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                Register
              </button>
            </p>
          </div>
        </motion.div>
        
        {/* Decorative footer text */}
        <p className="text-center text-xs text-slate-400 mt-8 font-medium">
          &copy; {new Date().getFullYear()} Faculty of Informatics. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;