
import { UserSession, UserRole } from '../types';

const SESSION_KEY = 'rf_session';

export const authService = {
  getSession: (): UserSession | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  loginAsSuper: () => {
    const session: UserSession = { role: UserRole.SUPER };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  loginAsAdmin: (businessId: string) => {
    const session: UserSession = { role: UserRole.ADMIN, businessId };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  impersonate: (businessId: string) => {
    const current = authService.getSession();
    if (current?.role === UserRole.SUPER) {
      const session: UserSession = { 
        role: UserRole.ADMIN, 
        businessId, 
        impersonating: true 
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  },

  exitImpersonation: () => {
    authService.loginAsSuper();
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated: () => {
    return authService.getSession() !== null;
  }
};
