// src/hooks/useSessionHeartbeat.js
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/apiConfig';

/**
 * Hook to send periodic heartbeat to update user's lastLogin time
 * Only sends heartbeat if user has been active (mouse movement, clicks, etc.)
 */
const useSessionHeartbeat = () => {
  const { user } = useAuth();
  const isActiveRef = useRef(false);
  const heartbeatIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);

  useEffect(() => {
    // Only run if user is logged in
    if (!user) return;

    // Mark user as active on any interaction
    const markActive = () => {
      isActiveRef.current = true;
      
      // Clear existing inactivity timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      
      // Set new inactivity timeout (30 seconds after last activity)
      inactivityTimeoutRef.current = setTimeout(() => {
        isActiveRef.current = false;
      }, 30000);
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, markActive);
    });

    // Send heartbeat every 20 seconds if user is active
    heartbeatIntervalRef.current = setInterval(async () => {
      if (isActiveRef.current) {
        try {
          // Send heartbeat to update lastLogin
          await api.post('/auth/heartbeat');
          console.log('[Heartbeat] Sent successfully');
        } catch {
          // Don't log heartbeat errors (might fail if session expired)
        }
      }
    }, 20000);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, markActive);
      });
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [user]);
};

export default useSessionHeartbeat;
