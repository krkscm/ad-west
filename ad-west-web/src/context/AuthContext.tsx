import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockDatabase } from '../utils/mockDatabase';
import { verifyPassword, signToken, decodeToken, SessionPayload, verifyTotp, createTotpSecret } from '../utils/mockAuth';
import { Contact } from '../types';

interface AuthContextType {
  // Admin State
  token: string | null;
  adminUser: SessionPayload | null;
  mfaPendingEmail: string | null;
  
  // Member State
  memberUser: Contact | null;
  
  // Authentication Actions
  loginAdmin: (email: string, password: string) => Promise<{ success: boolean; mfaRequired?: boolean; error?: string }>;
  verifyAdminMfa: (code: string) => Promise<{ success: boolean; error?: string }>;
  submitMfaEnrollment: (secret: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  
  // Member Auth Actions
  sendMemberOtp: (emailOrPhone: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyMemberOtp: (emailOrPhone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  
  // Admin Operations
  resetUserMfa: (userId: string) => void;
  refreshAdminSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adwest_token'));
  const [adminUser, setAdminUser] = useState<SessionPayload | null>(null);
  const [mfaPendingEmail, setMfaPendingEmail] = useState<string | null>(null);
  const [memberUser, setMemberUser] = useState<Contact | null>(null);
  
  // Simulated OTP storage for member login
  const [activeOtps, setActiveOtps] = useState<Record<string, { code: string; expires: number }>>({});

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setAdminUser(decoded);
      } else {
        // Token expired
        setToken(null);
        localStorage.removeItem('adwest_token');
      }
    }
    
    // Check if there is a member logged in
    const savedMember = localStorage.getItem('adwest_member');
    if (savedMember) {
      try {
        setMemberUser(JSON.parse(savedMember));
      } catch {
        localStorage.removeItem('adwest_member');
      }
    }
  }, [token]);

  const loginAdmin = async (email: string, password: string) => {
    const admins = mockDatabase.getAdmins();
    const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase().trim());
    
    if (!admin) {
      mockDatabase.addAuditLog({
        actorId: 'anonymous',
        actorName: email,
        action: 'LOGIN_FAILURE',
        entityType: 'AdminUser',
        entityId: 'none',
        oldVal: null,
        newVal: { reason: 'User not found' }
      });
      return { success: false, error: 'Invalid email or password.' };
    }

    const passwordMatch = verifyPassword(password, admin.passwordHash);
    if (!passwordMatch) {
      mockDatabase.addAuditLog({
        actorId: admin.id,
        actorName: admin.name,
        action: 'LOGIN_FAILURE',
        entityType: 'AdminUser',
        entityId: admin.id,
        oldVal: null,
        newVal: { reason: 'Incorrect password' }
      });
      return { success: false, error: 'Invalid email or password.' };
    }

    // Check MFA status
    if (admin.mfaEnabled) {
      setMfaPendingEmail(admin.email);
      return { success: true, mfaRequired: true };
    } else {
      // MFA Not setup yet! Direct to enrollment
      setMfaPendingEmail(admin.email);
      return { success: true, mfaRequired: true }; // Require enrollment step
    }
  };

  const verifyAdminMfa = async (code: string) => {
    if (!mfaPendingEmail) return { success: false, error: 'Session expired. Please log in again.' };
    
    const admins = mockDatabase.getAdmins();
    const admin = admins.find(a => a.email.toLowerCase() === mfaPendingEmail.toLowerCase());
    if (!admin) return { success: false, error: 'User not found.' };

    // If MFA is not yet enabled, they must go through the enrollment flow instead
    if (!admin.mfaEnabled) {
      return { success: false, error: 'MFA setup is required.' };
    }

    const verified = await verifyTotp(admin.totpSecret, code);
    if (!verified) {
      mockDatabase.addAuditLog({
        actorId: admin.id,
        actorName: admin.name,
        action: 'MFA_VERIFICATION_FAILURE',
        entityType: 'AdminUser',
        entityId: admin.id,
        oldVal: null,
        newVal: { reason: 'Invalid TOTP code' }
      });
      return { success: false, error: 'Invalid authenticator code. Please try again.' };
    }

    // Success login!
    const jwtToken = signToken(admin);
    setToken(jwtToken);
    localStorage.setItem('adwest_token', jwtToken);
    setAdminUser(decodeToken(jwtToken));
    setMfaPendingEmail(null);

    mockDatabase.addAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      action: 'LOGIN_SUCCESS',
      entityType: 'AdminUser',
      entityId: admin.id,
      oldVal: null,
      newVal: { roles: admin.roles.map(r => r.role) }
    });

    return { success: true };
  };

  const submitMfaEnrollment = async (secret: string, code: string) => {
    if (!mfaPendingEmail) return { success: false, error: 'Session expired. Please log in again.' };

    const admins = mockDatabase.getAdmins();
    const adminIndex = admins.findIndex(a => a.email.toLowerCase() === mfaPendingEmail.toLowerCase());
    if (adminIndex === -1) return { success: false, error: 'User not found.' };

    const admin = admins[adminIndex];
    
    // Verify standard TOTP
    const verified = await verifyTotp(secret, code);
    if (!verified) {
      return { success: false, error: 'Incorrect code. Please scan the QR code and verify again.' };
    }

    // Update state
    admin.totpSecret = secret;
    admin.mfaEnabled = true;
    mockDatabase.saveAdmin(admin);

    // Complete login directly upon successful enrollment
    const jwtToken = signToken(admin);
    setToken(jwtToken);
    localStorage.setItem('adwest_token', jwtToken);
    setAdminUser(decodeToken(jwtToken));
    setMfaPendingEmail(null);

    mockDatabase.addAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      action: 'MFA_ENROLLED',
      entityType: 'AdminUser',
      entityId: admin.id,
      oldVal: { mfaEnabled: false },
      newVal: { mfaEnabled: true }
    });

    return { success: true };
  };

  const logout = () => {
    if (adminUser) {
      mockDatabase.addAuditLog({
        actorId: adminUser.sub,
        actorName: adminUser.name,
        action: 'LOGOUT',
        entityType: 'AdminUser',
        entityId: adminUser.sub,
        oldVal: null,
        newVal: null
      });
    }
    setToken(null);
    setAdminUser(null);
    setMfaPendingEmail(null);
    setMemberUser(null);
    localStorage.removeItem('adwest_token');
    localStorage.removeItem('adwest_member');
  };

  // Member Login Simulation
  const sendMemberOtp = async (emailOrPhone: string) => {
    const contacts = mockDatabase.getContacts();
    const cleanContact = emailOrPhone.toLowerCase().trim();
    const contact = contacts.find(
      c => c.emailPrimary.toLowerCase() === cleanContact || c.phonePrimary.replace(/[\s-+]/g, '') === cleanContact.replace(/[\s-+]/g, '')
    );

    if (!contact) {
      return { success: false, error: 'Contact details not found in the community list. Please contact helpdesk.' };
    }

    // Generate 6-digit numeric code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in active codes (expire in 10 minutes)
    setActiveOtps(prev => ({
      ...prev,
      [cleanContact]: { code: otpCode, expires: Date.now() + 600000 }
    }));

    // In a real application, this triggers an n8n workflow.
    // For local simulation, we log this code to console and return it directly so the user can easily log in!
    console.log(`[SIMULATED EMAIL OTP] OTP for ${emailOrPhone} is: ${otpCode}`);
    
    return { success: true, otp: otpCode };
  };

  const verifyMemberOtp = async (emailOrPhone: string, code: string) => {
    const cleanContact = emailOrPhone.toLowerCase().trim();
    const record = activeOtps[cleanContact];

    if (!record) {
      return { success: false, error: 'No active OTP request found for this contact.' };
    }

    if (Date.now() > record.expires) {
      return { success: false, error: 'OTP code has expired (10 min limit). Please request a new one.' };
    }

    if (record.code !== code.trim()) {
      return { success: false, error: 'Invalid OTP code. Please verify and try again.' };
    }

    // Clear OTP
    setActiveOtps(prev => {
      const copy = { ...prev };
      delete copy[cleanContact];
      return copy;
    });

    // Login successful
    const contacts = mockDatabase.getContacts();
    const contact = contacts.find(
      c => c.emailPrimary.toLowerCase() === cleanContact || c.phonePrimary.replace(/[\s-+]/g, '') === cleanContact.replace(/[\s-+]/g, '')
    )!;

    setMemberUser(contact);
    localStorage.setItem('adwest_member', JSON.stringify(contact));

    return { success: true };
  };

  const resetUserMfa = (userId: string) => {
    const admins = mockDatabase.getAdmins();
    const admin = admins.find(a => a.id === userId);
    if (!admin) return;

    const oldVal = { mfaEnabled: admin.mfaEnabled, totpSecret: admin.totpSecret };
    admin.mfaEnabled = false;
    admin.totpSecret = createTotpSecret(); // Generate a new one for their next setup
    mockDatabase.saveAdmin(admin);

    if (adminUser) {
      mockDatabase.addAuditLog({
        actorId: adminUser.sub,
        actorName: adminUser.name,
        action: 'MFA_RESET',
        entityType: 'AdminUser',
        entityId: userId,
        oldVal,
        newVal: { mfaEnabled: false }
      });
    }
  };

  const refreshAdminSession = () => {
    if (!adminUser) return;
    const admins = mockDatabase.getAdmins();
    const admin = admins.find(a => a.id === adminUser.sub);
    if (admin) {
      const jwtToken = signToken(admin);
      setToken(jwtToken);
      localStorage.setItem('adwest_token', jwtToken);
      setAdminUser(decodeToken(jwtToken));
    }
  };

  return (
    <AuthContext.Provider value={{
      token,
      adminUser,
      mfaPendingEmail,
      memberUser,
      loginAdmin,
      verifyAdminMfa,
      submitMfaEnrollment,
      logout,
      sendMemberOtp,
      verifyMemberOtp,
      resetUserMfa,
      refreshAdminSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
