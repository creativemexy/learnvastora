import { useSession } from 'next-auth/react';
import { useCallback, useRef } from 'react';

export const useSessionUpdate = () => {
  const { data: session, update } = useSession();
  const isRefreshing = useRef(false);
  const lastRefreshTime = useRef(0);

  const refreshSession = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;
    
    // Prevent refreshing more than once every 2 seconds
    if (isRefreshing.current || timeSinceLastRefresh < 2000) {
      return;
    }
    
    try {
      isRefreshing.current = true;
      lastRefreshTime.current = now;
      
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update the session with new data
        await update({
          ...session,
          user: {
            ...session?.user,
            ...data.user,
          },
        });
        return data.user;
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, [update]);

  const updateSessionWithUserData = useCallback(async (userData: any) => {
    try {
      await update({
        ...session,
        user: {
          ...session?.user,
          ...userData,
        },
      });
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }, [update]);

  return {
    refreshSession,
    updateSessionWithUserData,
  };
}; 