import React, { useEffect } from 'react';

const INTERCOM_APP_ID = 'kpfdpai7'; // Replace with your Intercom App ID

interface IntercomInitializerProps {
  user?: {
    name?: string;
    email?: string;
    user_id?: string;
    created_at?: number;
    [key: string]: any;
  };
}

const IntercomInitializer = ({ user = {} }: IntercomInitializerProps): null => {
  useEffect(() => {
    // Check if Intercom is already loaded
    if (typeof window.Intercom === 'function') {
      // If already loaded, just update settings
      window.Intercom('update', {
        app_id: INTERCOM_APP_ID,
        ...user,
      });
    } else {
      // Load Intercom script if not present
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = `https://widget.intercom.io/widget/${INTERCOM_APP_ID}`;
      document.head.appendChild(script);

      script.onload = () => {
        // Initialize Intercom once the script is loaded
        window.Intercom('boot', {
          app_id: INTERCOM_APP_ID,
          ...user,
          // hide_default_launcher: true, // Uncomment if you want to hide the default bubble
        });
      };

      // Cleanup function for unmounting (important for SPAs)
      return () => {
        if (typeof window.Intercom === 'function') {
          window.Intercom('shutdown'); // Shuts down the messenger
          // Optionally remove the script tag if needed, though Intercom handles most cleanup
          const intercomScript = document.querySelector(`script[src*="${INTERCOM_APP_ID}"]`);
          if (intercomScript) {
            intercomScript.remove();
          }
          const intercomContainer = document.getElementById('intercom-container');
          if (intercomContainer) {
            intercomContainer.remove();
          }
        }
      };
    }
  }, [user]); // Re-run effect if user data changes

  return null; // This component doesn't render any UI
};

export default IntercomInitializer;