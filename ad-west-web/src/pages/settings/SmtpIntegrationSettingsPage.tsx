import React, { useEffect, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { SwitchToggle } from '../../components/common/SwitchToggle';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { backendApi, SmtpIntegrationConfigApi } from '../../utils/backendApi';

export const SmtpIntegrationSettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<SmtpIntegrationConfigApi | null>(null);

  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [encryption, setEncryption] = useState('TLS');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [enabled, setEnabled] = useState(true);
  const [clearPassword, setClearPassword] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    backendApi
      .getSmtpIntegrationConfig()
      .then((response) => {
        setConfig(response);
        setHost(response.host || '');
        setPort(response.port || 587);
        setUsername(response.username || '');
        setFromName(response.fromName || '');
        setEncryption(response.encryption || 'TLS');
        setImapHost(response.imapHost || '');
        setImapPort(response.imapPort || 993);
        setEnabled(response.enabled);
      })
      .catch((error: unknown) => {
        addToast(error instanceof Error ? error.message : 'Failed to load email configuration.', 'error');
      })
      .finally(() => setIsLoading(false));
  }, [addToast]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!host.trim() || !username.trim()) {
      addToast('SMTP host and username are required.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await backendApi.updateSmtpIntegrationConfig({
        host: host.trim(),
        port,
        username: username.trim(),
        password: password.trim() || undefined,
        fromName: fromName.trim() || undefined,
        encryption,
        imapHost: imapHost.trim() || undefined,
        imapPort,
        enabled,
        clearPassword,
      });
      setConfig(updated);
      setPassword('');
      setClearPassword(false);
      addToast('Email settings saved successfully.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <PageHeader
        icon="📧"
        title="Email Integration"
        subtitle="Configure SMTP settings for outgoing email. Credentials are stored securely in the database."
      />

      {isLoading ? (
        <div className="loading-state">Loading configuration…</div>
      ) : (
        <form onSubmit={handleSave} style={{ maxWidth: '680px' }}>
          <FormSection title="SMTP Configuration" accent="primary">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">SMTP Host <span style={{ color: 'var(--error)' }}>*</span></label>
                <input
                  className="form-input"
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="e.g. smtp.gmail.com"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Port <span style={{ color: 'var(--error)' }}>*</span></label>
                <input
                  className="form-input"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  min={1}
                  max={65535}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Encryption</label>
              <select
                className="form-input"
                value={encryption}
                onChange={(e) => setEncryption(e.target.value)}
              >
                <option value="TLS">TLS / STARTTLS (recommended, port 587)</option>
                <option value="SSL">SSL (port 465)</option>
                <option value="NONE">None (not recommended)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">IMAP Host</label>
                <input
                  className="form-input"
                  type="text"
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="e.g. imap.gmail.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">IMAP Port</label>
                <input
                  className="form-input"
                  type="number"
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value))}
                  min={1}
                  max={65535}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Username / Email <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. helpdesk@yourdomain.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password / App Password</label>
              <input
                className="form-input"
                type="password"
                placeholder={config?.hasPassword ? 'Stored in DB — leave empty to keep current' : 'Enter SMTP password or app password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <SwitchToggle
                checked={clearPassword}
                onChange={setClearPassword}
                labelOn="Clear stored password"
                labelOff="Keep stored password"
              />
            </div>

            <div className="form-group">
              <label className="form-label">From Name</label>
              <input
                className="form-input"
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="e.g. AD West Helpdesk"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>
                Displayed as the sender name in outgoing emails. Defaults to the username if left empty.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Integration Status</label>
              <SwitchToggle
                checked={enabled}
                onChange={setEnabled}
                labelOn="SMTP email integration enabled"
                labelOff="SMTP email integration disabled"
              />
            </div>

            <FormActions
              hint={config?.updatedAt ? `Last updated: ${new Date(config.updatedAt).toLocaleString()}` : 'Not saved yet'}
            >
              <button className="btn btn-primary" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Configuration'}
              </button>
            </FormActions>
          </FormSection>
        </form>
      )}
    </div>
  );
};
