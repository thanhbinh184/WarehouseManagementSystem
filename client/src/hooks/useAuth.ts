import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('smartwms_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  return {
    user,
    // Helper boolean để check nhanh
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isStaff: user?.role === 'staff'
  };
};