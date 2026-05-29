import React, { useEffect, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { SwitchToggle } from '../../components/common/SwitchToggle';
import { backendApi, GoogleIntegrationConfigApi } from '../../utils/backendApi';

export const GoogleIntegrationSettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<GoogleIntegrationConfigApi | null>(null);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [oauthScopes, setOauthScopes] = useState('');
  const [webAppOrigin, setWebAppOrigin] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [clearClientSecret, setClearClientSecret] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    backendApi
      .getGoogleIntegrationConfig()
      .then((response) => {
        setConfig(response);
        setClientId(response.clientId || '');
        setRedirectUri(response.redirectUri || '');
        setOauthScopes(response.oauthScopes || '');
        setWebAppOrigin(response.webAppOrigin || '');
        setEnabled(response.enabled);
      })
      .catch((error: unknown) => {
        addToast(error instanceof Error ? error.message : 'Failed to load Google integration config.', 'error');
      })
      .finally(() => setIsLoading(false));
  }, [addToast]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId.trim() || !redirectUri.trim() || !oauthScopes.trim() || !webAppOrigin.trim()) {
      addToast('Client ID, redirect URI, scopes, and web app origin are required.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await backendApi.updateGoogleIntegrationConfig({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim() || undefined,
        redirectUri: redirectUri.trim(),
        oauthScopes: oauthScopes.trim(),
        webAppOrigin: webAppOrigin.trim(),
        enabled,
        clearClientSecret,
      });
      setConfig(updated);
      setClientSecret('');
      setClearClientSecret(false);
      addToast('Google integration settings saved.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.82rem', fontWeight: 600,
    color: 'var(--text-secondary-dark)', marginBottom: '4px',
  };

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Google Integration</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>
            Configure Google OAuth and Gmail API credentials stored in the database.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading configuration…</div>
      ) : (
        <form onSubmit={handleSave} style={{ maxWidth: '680px' }}>
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={labelStyle}>Google Client ID <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 123456789.apps.googleusercontent.com"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Google Client Secret</label>
              <input
                className="form-input"
                type="password"
                placeholder={config?.hasClientSecret ? 'Stored in DB — leave empty to keep current' : 'Enter client secret'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
              <div style={{ marginTop: '8px' }}>
                <SwitchToggle
                  checked={clearClientSecret}
                  onChange={setClearClientSecret}
                  labelOn="Clear stored client secret"
                  labelOff="Keep stored client secret"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Redirect URI <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                type="text"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                placeholder="e.g. https://yourapp.com/auth/google/callback"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>OAuth Scopes <span style={{ color: 'var(--error)' }}>*</span></label>
              <textarea
                className="form-input"
                rows={3}
                value={oauthScopes}
                onChange={(e) => setOauthScopes(e.target.value)}
                placeholder="e.g. openid email profile https://mail.google.com/"
                style={{ resize: 'vertical' }}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Web App Origin <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                type="text"
                value={webAppOrigin}
                onChange={(e) => setWebAppOrigin(e.target.value)}
                placeholder="e.g. https://yourapp.com"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Integration Status</label>
              <SwitchToggle
                checked={enabled}
                onChange={setEnabled}
                labelOn="Google OAuth / Gmail integration enabled"
                labelOff="Google OAuth / Gmail integration disabled"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                {config?.updatedAt ? `Last updated: ${new Date(config.updatedAt).toLocaleString()}` : 'Not saved yet'}
              </span>
              <button className="btn btn-primary" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
