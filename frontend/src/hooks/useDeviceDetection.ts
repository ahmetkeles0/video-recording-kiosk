import { useState, useEffect } from 'react';

export type DeviceType = 'tablet' | 'phone' | 'desktop';

export const useDeviceDetection = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      const width = window.innerWidth;
      
      // Check for mobile devices
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTabletDevice = /iPad|Android(?=.*\bMobile\b)/i.test(userAgent) || 
                            (width >= 768 && width <= 1024 && isMobileDevice);
      
      // Check for touch capability
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (isTabletDevice || (width >= 768 && isTouchDevice)) {
        setDeviceType('tablet');
        setIsTablet(true);
        setIsMobile(false);
      } else if (isMobileDevice || width < 768) {
        setDeviceType('phone');
        setIsMobile(true);
        setIsTablet(false);
      } else {
        setDeviceType('desktop');
        setIsMobile(false);
        setIsTablet(false);
      }
    };

    detectDevice();
    
    // Listen for resize events
    window.addEventListener('resize', detectDevice);
    
    return () => {
      window.removeEventListener('resize', detectDevice);
    };
  }, []);

  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop: deviceType === 'desktop'
  };
};
