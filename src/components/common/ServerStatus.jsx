import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Server, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Database,
  Terminal,
  Wifi,
  WifiOff,
  Clock,
  HelpCircle
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const ServerStatus = () => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [pingTime, setPingTime] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkServer = async () => {
    setStatus('checking');
    const startTime = Date.now();
    
    try {
      const response = await axios.get('http://localhost:5001/api/test', { 
        timeout: 5000 
      });
      
      const endTime = Date.now();
      setPingTime(endTime - startTime);
      
      if (response.data.success) {
        setStatus('online');
        setMessage('Backend server is running');
        // Auto-hide after 5 seconds if online
        setTimeout(() => setIsVisible(false), 5000);
      } else {
        setStatus('error');
        setMessage('Server responded but with an error');
        setIsVisible(true);
      }
    } catch (error) {
      setStatus('offline');
      setIsVisible(true);
      setPingTime(null);
      
      if (error.code === 'ECONNABORTED') {
        setMessage('Connection timeout - server not responding');
      } else if (error.message === 'Network Error') {
        setMessage('Cannot connect to backend server');
      } else if (error.response) {
        setMessage(`Server error: ${error.response.status}`);
      } else {
        setMessage('Server connection failed');
      }
    }
  };

  useEffect(() => {
    checkServer();
    // Check every 30 seconds
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    checkServer();
  };

  const getStatusIcon = () => {
    switch(status) {
      case 'online':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />;
      default:
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColors = () => {
    switch(status) {
      case 'online':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800';
      case 'checking':
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800';
    }
  };

  const getStatusText = () => {
    switch(status) {
      case 'online':
        return '🚀 Server Online';
      case 'checking':
        return '🔄 Checking Server...';
      default:
        return '⚠️ Server Offline';
    }
  };

  const getStatusBadge = () => {
    switch(status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Connected
          </span>
        );
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Checking
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <WifiOff className="w-3 h-3" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 right-4 z-50 max-w-sm w-full sm:w-96"
        >
          <div className={`rounded-xl shadow-xl overflow-hidden border ${getStatusColors()}`}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-white/20">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                <span className="font-medium text-sm">Backend Connection</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {getStatusText()}
                    </h3>
                  </div>
                  <p className="text-sm mt-1 opacity-90">{message}</p>
                  
                  {/* Connection Details */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Wifi className="w-3 h-3 opacity-70" />
                      <span className="opacity-70">localhost:5001</span>
                      {pingTime && (
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {pingTime}ms
                        </span>
                      )}
                    </div>

                    {/* Expandable Details */}
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <HelpCircle className="w-3 h-3" />
                      {expanded ? 'Hide details' : 'Show troubleshooting'}
                    </button>

                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 p-3 bg-black/5 rounded-lg space-y-2">
                            <p className="text-xs font-mono">
                              <span className="font-bold block mb-1">📋 Quick Fix:</span>
                              <span className="block pl-2">1. Open XAMPP and start MySQL</span>
                              <span className="block pl-2">2. Open terminal and run:</span>
                              <code className="block bg-black/10 p-1.5 rounded mt-1 font-mono text-[10px]">
                                cd backend && npm run dev
                              </code>
                            </p>
                            
                            <div className="pt-2 border-t border-black/10">
                              <p className="text-xs font-medium mb-1">🔍 Check if backend is running:</p>
                              <a 
                                href="http://localhost:5001/api/test" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Terminal className="w-3 h-3" />
                                http://localhost:5001/api/test
                              </a>
                            </div>

                            <div className="pt-2 border-t border-black/10">
                              <p className="text-xs font-medium mb-1">📊 System Status:</p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span>Backend Server:</span>
                                  {status === 'online' ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> Running
                                    </span>
                                  ) : (
                                    <span className="text-red-600 flex items-center gap-1">
                                      <XCircle className="w-3 h-3" /> Stopped
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span>Database (MySQL):</span>
                                  {status === 'online' ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <Database className="w-3 h-3" /> Connected
                                    </span>
                                  ) : (
                                    <span className="text-red-600 flex items-center gap-1">
                                      <Database className="w-3 h-3" /> Unknown
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleRetry}
                      className="text-xs px-3 py-1.5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 border border-gray-200"
                    >
                      <RefreshCw className={`w-3 h-3 ${status === 'checking' ? 'animate-spin' : ''}`} />
                      Retry Connection
                    </button>
                    {status === 'offline' && (
                      <button
                        onClick={() => window.open('http://localhost:5001/api/test', '_blank')}
                        className="text-xs px-3 py-1.5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
                      >
                        Test Manually
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-white/30 backdrop-blur-sm border-t border-white/20 text-[10px] text-gray-600 flex items-center justify-between">
              <span>Last checked: {new Date().toLocaleTimeString()}</span>
              <span className="font-mono">v1.0.0</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ServerStatus;