// src/pages/auth/Unauthorized.jsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldX, LogOut, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const message = location.state?.message || "You don't have permission to access this page.";
  const title = location.state?.message ? "System Unavailable" : "Access Denied";

  // If the user is NOT logged in, they shouldn't be on the unauthorized page, send them to login.
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-lg w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {title}
          </h1>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleGoHome} className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors">
              <Home className="w-4 h-4" /> Back to Home
            </button>
            {user && (
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;