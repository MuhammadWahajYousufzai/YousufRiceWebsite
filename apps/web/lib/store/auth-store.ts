import { create } from 'zustand';
import { account, tablesDB, DATABASE_ID, CUSTOMERS_TABLE_ID } from '../appwrite';
import { Models, Query } from 'appwrite';
import { Customer } from '../types';
import { clearSessionCookie } from '@/app/actions/session';

// Define permission levels for admin access
export enum AdminPermission {
  NONE = 'none',
  READ_ONLY = 'readonly',
  FULL_ACCESS = 'admin'
}

interface AuthStore {
  user: Models.User<Models.Preferences> | null;
  customer: Customer | null;
  isAdmin: boolean;
  isReadOnly: boolean;
  adminPermission: AdminPermission;
  loading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setCustomer: (customer: Customer | null) => void;
  hasWritePermission: () => boolean;
  hasReadPermission: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  customer: null,
  isAdmin: false,
  isReadOnly: false,
  adminPermission: AdminPermission.NONE,
  loading: true,
  
  checkAuth: async () => {
    try {
      const user = await account.get();

      // Note: We can't sync the session secret here because account.getSession('current')
      // doesn't return the secret (web SDK hides it for security). The secret is only
      // available when the session is first created via createEmailPasswordSession.
      // The cookie is set during login/registration in the respective form handlers.

      // Check for admin labels (secure approach)
      console.log('User labels:', user.labels);
      const hasAdminLabel = user.labels && user.labels.includes('admin');
      const hasReadOnlyLabel = user.labels && user.labels.includes('readonly');
      
      console.log('Label detection:', { hasAdminLabel, hasReadOnlyLabel, userLabels: user.labels });
      
      let adminPermission = AdminPermission.NONE;
      if (hasAdminLabel) {
        adminPermission = AdminPermission.FULL_ACCESS;
      } else if (hasReadOnlyLabel) {
        adminPermission = AdminPermission.READ_ONLY;
      }
      
      console.log('Determined admin permission:', adminPermission);
      
      // Fetch customer record linked to this user
      let customer: Customer | null = null;
      try {
        const customerResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal('user_id', user.$id)] });
        if (customerResponse.rows.length > 0) {
          customer = customerResponse.rows[0] as unknown as Customer;
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
      }
      
      set({ 
        user, 
        customer,
        isAdmin: hasAdminLabel,
        isReadOnly: hasReadOnlyLabel,
        adminPermission,
        loading: false 
      });
    } catch (error: any) {
      console.log('[checkAuth] Not logged in:', error?.message || error);
      set({ 
        user: null, 
        customer: null, 
        isAdmin: false, 
        isReadOnly: false,
        adminPermission: AdminPermission.NONE,
        loading: false 
      });
    }
  },
  
  logout: async () => {
    try {
      await account.deleteSession({ sessionId: 'current' });
      await clearSessionCookie();
      set({ 
        user: null, 
        customer: null, 
        isAdmin: false,
        isReadOnly: false,
        adminPermission: AdminPermission.NONE,
        loading: false 
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },
  
  setCustomer: (customer: Customer | null) => {
    set({ customer });
  },
  
  // Utility methods for permission checking
  hasWritePermission: () => get().adminPermission === AdminPermission.FULL_ACCESS,
  hasReadPermission: () => get().adminPermission !== AdminPermission.NONE,
}));
