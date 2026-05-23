import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { mockDatabase } from '../utils/mockDatabase';
import { EditRequest, HelpdeskTicket } from '../types';

interface MemberPortalPageProps {
  onBack: () => void;
}

export const MemberPortalPage: React.FC<MemberPortalPageProps> = ({ onBack }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp'>('credentials');
  
  // Simulated OTP token
  const [simulatedOtp, setSimulatedOtp] = useState('');

  // Dashboard sections: 'profile' | 'programs' | 'tickets'
  const [activeSection, setActiveSection] = useState<'profile' | 'programs' | 'tickets'>('profile');

  // Request Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');

  // New ticket fields
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Profile Edit');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // DB Data
  const [pendingRequest, setPendingRequest] = useState<EditRequest | null>(null);
  const [memberTickets, setMemberTickets] = useState<HelpdeskTicket[]>([]);

  const { sendMemberOtp, verifyMemberOtp, memberUser, logout } = useAuth();
  const { addToast } = useToast();

  const loadMemberDetails = () => {
    if (!memberUser) return;
    const requests = mockDatabase.getEditRequests();
    const pending = requests.find(r => r.contactId === memberUser.id && r.status === 'pending');
    setPendingRequest(pending || null);

    const tickets = mockDatabase.getTickets();
    const filtered = tickets.filter(t => t.contactId === memberUser.id);
    setMemberTickets(filtered);
  };

  useEffect(() => {
    loadMemberDetails();
  }, [memberUser]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      addToast('Please enter your email or phone number.', 'warning');
      return;
    }

    const res = await sendMemberOtp(emailOrPhone);
    if (res.success) {
      setSimulatedOtp(res.otp || '');
      setLoginStep('otp');
      addToast('OTP sent. Please check the reviewer helper block.', 'success');
    } else {
      addToast(res.error || 'Failed to authenticate.', 'error');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      addToast('Please enter a 6-digit OTP code.', 'warning');
      return;
    }

    const res = await verifyMemberOtp(emailOrPhone, otpCode);
    if (res.success) {
      addToast('Logged in successfully.', 'success');
    } else {
      addToast(res.error || 'Verification failed.', 'error');
    }
  };

  const handleRequestEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUser) return;

    const requestedFields: Record<string, string> = {};
    if (editFirstName.trim() && editFirstName !== memberUser.firstName) requestedFields.firstName = editFirstName.trim();
    if (editLastName.trim() && editLastName !== memberUser.lastName) requestedFields.lastName = editLastName.trim();
    if (editPhone.trim() && editPhone !== memberUser.phonePrimary) requestedFields.phonePrimary = editPhone.trim();
    if (editAddress.trim() && editAddress !== memberUser.address) requestedFields.address = editAddress.trim();

    if (Object.keys(requestedFields).length === 0) {
      addToast('No changes were made to submit.', 'info');
      setIsEditing(false);
      return;
    }

    const newReq = mockDatabase.createEditRequest({
      contactId: memberUser.id,
      contactName: `${memberUser.firstName} ${memberUser.lastName}`,
      requestedFields
    });

    setPendingRequest(newReq);
    setIsEditing(false);
    addToast('Profile edit request submitted for administrator review.', 'success');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUser) return;

    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      addToast('Please fill in both subject and description.', 'warning');
      return;
    }

    mockDatabase.createTicket({
      contactId: memberUser.id,
      contactName: `${memberUser.firstName} ${memberUser.lastName}`,
      zoneId: memberUser.zoneId,
      category: ticketCategory,
      subject: ticketSubject.trim(),
      description: ticketDescription.trim(),
      priority: ticketPriority
    });

    addToast('Helpdesk ticket raised successfully.', 'success');
    setTicketSubject('');
    setTicketDescription('');
    loadMemberDetails();
  };

  const handleOpenEditForm = () => {
    if (!memberUser) return;
    setEditFirstName(memberUser.firstName);
    setEditLastName(memberUser.lastName);
    setEditPhone(memberUser.phonePrimary);
    setEditAddress(memberUser.address);
    setIsEditing(true);
  };

  // Render Login
  if (!memberUser) {
    return (
      <div 
        className="flex-center animate-fade-in" 
        style={{ 
          minHeight: '100vh', 
          width: '100vw', 
          backgroundColor: '#f1f5f9', 
          padding: '24px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
        }}
      >
        <div 
          className="glass-panel-light animate-slide-up"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '40px',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <button 
              onClick={onBack}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary-light)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>←</span> Portals
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Member Access
            </span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary-light)' }}>Member Portal</h2>
            <p style={{ color: 'var(--text-secondary-light)', fontSize: '0.875rem', marginTop: '6px' }}>
              Log in with your registered contact details
            </p>
          </div>

          {loginStep === 'credentials' ? (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Email or Phone Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. john.doe@email.com"
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Request OTP Code
              </button>

              <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-secondary-light)', textAlign: 'center', padding: '12px', border: '1px dashed var(--border-light)', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-primary-light)' }}>Demo Account Details:</strong><br />
                Enter: <code style={{ color: 'var(--primary)', fontWeight: 600 }}>john.doe@email.com</code>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>✉️</span>
                <p style={{ color: 'var(--text-secondary-light)', fontSize: '0.85rem' }}>
                  A verification code has been dispatched. Enter the 6-digit code below to enter your workspace.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Verification OTP</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.2em', fontWeight: 700 }}
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Verify & Continue
              </button>

              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '12px' }}
                onClick={() => setLoginStep('credentials')}
              >
                Back
              </button>

              {/* Reviewer code display */}
              <div 
                style={{ 
                  marginTop: '28px', 
                  padding: '16px', 
                  backgroundColor: 'var(--info-light)', 
                  border: '1px dashed #bfdbfe',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  color: '#1e40af',
                  textAlign: 'center'
                }}
              >
                <strong style={{ display: 'block', marginBottom: '4px' }}>🔧 Reviewer Verification Helper:</strong>
                <p style={{ fontSize: '0.8rem', marginBottom: '8px' }}>Simulated email dispatch complete. Use passcode:</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                  <code style={{ fontSize: '1.4rem', fontWeight: 850, color: 'var(--primary)' }}>{simulatedOtp}</code>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                    onClick={() => {
                      setOtpCode(simulatedOtp);
                      addToast('OTP copied!', 'success');
                    }}
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const profileName = `${memberUser.firstName} ${memberUser.lastName}`;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header bar */}
      <header 
        style={{
          height: '72px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem'
            }}
          >
            {memberUser.firstName[0]}
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary-light)' }}>{profileName}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)' }}>Member Portal Workspace</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span className="badge badge-success">✓ Active Member</span>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={logout}
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main layout grid: sidebar + content */}
      <div 
        style={{ 
          flex: 1, 
          display: 'grid', 
          gridTemplateColumns: '240px 1fr', 
          maxWidth: '1200px', 
          width: '100%', 
          margin: '0 auto', 
          padding: '32px'
        }}
      >
        
        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '24px' }}>
          <button 
            onClick={() => setActiveSection('profile')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              fontSize: '0.9rem',
              backgroundColor: activeSection === 'profile' ? 'var(--primary-light)' : 'transparent',
              color: activeSection === 'profile' ? 'var(--primary)' : 'var(--text-secondary-light)'
            }}
          >
            👤 My Profile
          </button>
          
          <button 
            onClick={() => setActiveSection('programs')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              fontSize: '0.9rem',
              backgroundColor: activeSection === 'programs' ? 'var(--primary-light)' : 'transparent',
              color: activeSection === 'programs' ? 'var(--primary)' : 'var(--text-secondary-light)'
            }}
          >
            📅 Event History
          </button>

          <button 
            onClick={() => setActiveSection('tickets')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              fontSize: '0.9rem',
              backgroundColor: activeSection === 'tickets' ? 'var(--primary-light)' : 'transparent',
              color: activeSection === 'tickets' ? 'var(--primary)' : 'var(--text-secondary-light)',
              position: 'relative'
            }}
          >
            🎫 Helpdesk
            {memberTickets.length > 0 && (
              <span 
                style={{ 
                  position: 'absolute', 
                  right: '16px', 
                  backgroundColor: 'var(--primary)', 
                  color: 'white', 
                  fontSize: '0.7rem', 
                  padding: '2px 6px', 
                  borderRadius: '10px'
                }}
              >
                {memberTickets.length}
              </span>
            )}
          </button>
        </aside>

        {/* Content Workspace */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '32px', boxShadow: 'var(--shadow-md)' }}>
          
          {/* SECTION 1: PROFILE SUMMARY */}
          {activeSection === 'profile' && (
            <div className="animate-slide-up">
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '18px',
                  marginBottom: '28px'
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Profile Directory Card</h2>
                  <p style={{ color: 'var(--text-secondary-light)', fontSize: '0.85rem', marginTop: '2px' }}>
                    View Sreny credentials, contact detail links, and submit change requests.
                  </p>
                </div>
                {!isEditing && (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleOpenEditForm}
                    disabled={!!pendingRequest}
                  >
                    ✏️ Request Profile Edits
                  </button>
                )}
              </div>

              {pendingRequest && (
                <div 
                  className="helper-box" 
                  style={{ 
                    marginBottom: '24px', 
                    backgroundColor: 'var(--warning-light)', 
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    color: '#92400e'
                  }}
                >
                  <strong>🕒 Pending Administrator Approval:</strong>
                  <p style={{ marginTop: '4px', fontSize: '0.825rem' }}>
                    You submitted a request to modify some details on your card. Further edits are disabled until this is processed.
                  </p>
                  <div style={{ marginTop: '8px', fontSize: '0.825rem', fontFamily: 'monospace' }}>
                    {JSON.stringify(pendingRequest.requestedFields)}
                  </div>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleRequestEdit}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Request Contact Changes</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>First Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editFirstName} 
                        onChange={e => setEditFirstName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Last Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editLastName} 
                        onChange={e => setEditLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Primary Phone Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editPhone} 
                      onChange={e => setEditPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Physical Address</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editAddress} 
                      onChange={e => setEditAddress(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Submit Review Request
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
                  
                  {/* Left Column: Personal details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-light)' }}>EMAIL ADDRESS</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>{memberUser.emailPrimary}</p>
                    </div>
                    
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-light)' }}>PRIMARY PHONE</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>{memberUser.phonePrimary}</p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-light)' }}>PHYSICAL ADDRESS</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>{memberUser.address}</p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-light)' }}>DATE OF BIRTH</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>{memberUser.dob}</p>
                    </div>
                  </div>

                  {/* Right Column: Sreny Memberships */}
                  <div 
                    style={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: '12px', 
                      padding: '24px' 
                    }}
                  >
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '14px' }}>Linked Sreny Associations</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {memberUser.memberships.map((membership, idx) => (
                        <div 
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)'
                          }}
                        >
                          <div>
                            <h5 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{membership.srenyName}</h5>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary-light)' }}>Joined: {membership.joinedDate}</span>
                          </div>
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{membership.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* SECTION 2: PROGRAMS & ATTENDANCE */}
          {activeSection === 'programs' && (
            <div className="animate-slide-up">
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '18px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attendance & Programs Record</h2>
                <p style={{ color: 'var(--text-secondary-light)', fontSize: '0.85rem', marginTop: '2px' }}>
                  Review Sreny events you have registered for and your verified check-in history.
                </p>
              </div>

              <div className="table-container" style={{ borderColor: 'var(--border-light)' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Event Program Name</th>
                      <th>Date</th>
                      <th>Registered Sreny</th>
                      <th>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Youth Development Seminar 2026</td>
                      <td>2026-05-10</td>
                      <td>Silicon Valley Sreny</td>
                      <td><span className="badge badge-success">🟢 Present</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Community Outreach Core Meeting</td>
                      <td>2026-04-18</td>
                      <td>Silicon Valley Sreny</td>
                      <td><span className="badge badge-success">🟢 Present</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Sreny Clean Drive</td>
                      <td>2026-03-05</td>
                      <td>Silicon Valley Sreny</td>
                      <td><span className="badge badge-warning">🟡 Late (Excused)</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: HELPDESK TICKETS */}
          {activeSection === 'tickets' && (
            <div className="animate-slide-up">
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '18px', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Helpdesk Tickets</h2>
                <p style={{ color: 'var(--text-secondary-light)', fontSize: '0.85rem', marginTop: '2px' }}>
                  Raise directory issues, sreny linking queries, or technical bugs to operators.
                </p>
              </div>

              {/* Grid: Create Ticket Form + Tickets List */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '32px' }}>
                
                {/* Form Column */}
                <form onSubmit={handleCreateTicket}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>Submit a Ticket</h3>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Category</label>
                    <select 
                      className="form-input"
                      value={ticketCategory}
                      onChange={e => setTicketCategory(e.target.value)}
                    >
                      <option value="Profile Edit">Profile Error</option>
                      <option value="Sreny Linking">Sreny Linking Request</option>
                      <option value="Technical Issue">Technical Problem</option>
                      <option value="Other">Other Query</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Subject</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Summary of issue"
                      value={ticketSubject}
                      onChange={e => setTicketSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Detailed Description</label>
                    <textarea 
                      className="form-input" 
                      placeholder="Please describe in detail what you need assistance with..."
                      rows={4}
                      value={ticketDescription}
                      onChange={e => setTicketDescription(e.target.value)}
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--text-primary-light)' }}>Priority</label>
                    <select 
                      className="form-input"
                      value={ticketPriority}
                      onChange={e => setTicketPriority(e.target.value as any)}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical (Blocking)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                    Submit Helpdesk Ticket
                  </button>
                </form>

                {/* List Column */}
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>Your Ticket Inbox</h3>
                  
                  {memberTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', border: '1px dashed var(--border-light)', borderRadius: '12px', color: 'var(--text-secondary-light)' }}>
                      No active tickets submitted.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {memberTickets.map(ticket => {
                        let badgeClass = 'badge-info';
                        if (ticket.status === 'resolved') badgeClass = 'badge-success';
                        if (ticket.status === 'new') badgeClass = 'badge-warning';

                        return (
                          <div 
                            key={ticket.id}
                            style={{
                              border: '1px solid var(--border-light)',
                              borderRadius: '10px',
                              padding: '16px',
                              backgroundColor: '#f8fafc'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <span className={`badge ${badgeClass}`} style={{ fontSize: '0.65rem' }}>
                                  {ticket.status.replace('_', ' ')}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)', marginLeft: '8px' }}>#{ticket.id}</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)' }}>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary-light)' }}>{ticket.subject}</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary-light)', marginTop: '4px', lineHeight: 1.4 }}>
                              {ticket.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
