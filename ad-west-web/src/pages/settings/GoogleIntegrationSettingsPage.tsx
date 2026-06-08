import React, { useEffect, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { SwitchToggle } from '../../components/common/SwitchToggle';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
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
  const [showClientSecret, setShowClientSecret] = useState(false);

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

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <PageHeader
        icon="🔐"
        title="Google Integration"
        subtitle="Configure Google OAuth and Gmail API credentials stored in the database."
      />

      {isLoading ? (
        <div className="loading-state">Loading configuration…</div>
      ) : (
        <form onSubmit={handleSave} style={{ maxWidth: '680px' }}>
          <FormSection title="Configuration" accent="primary">
            <div className="form-group">
              <label className="form-label">Google Client ID <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 123456789.apps.googleusercontent.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Google Client Secret</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showClientSecret ? 'text' : 'password'}
                  placeholder={config?.hasClientSecret ? 'Stored in DB — leave empty to keep current' : 'Enter client secret'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(p => !p)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: 'var(--text-secondary-dark)', fontSize: '1rem', lineHeight: 1,
                  }}
                  aria-label={showClientSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showClientSecret ? '🙈' : '👁️'}
                </button>
              </div>
              <SwitchToggle
                checked={clearClientSecret}
                onChange={setClearClientSecret}
                labelOn="Clear stored client secret"
                labelOff="Keep stored client secret"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Redirect URI <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                type="text"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                placeholder="e.g. https://yourapp.com/auth/google/callback"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">OAuth Scopes <span style={{ color: 'var(--error)' }}>*</span></label>
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

            <div className="form-group">
              <label className="form-label">Web App Origin <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                type="text"
                value={webAppOrigin}
                onChange={(e) => setWebAppOrigin(e.target.value)}
                placeholder="e.g. https://yourapp.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Integration Status</label>
              <SwitchToggle
                checked={enabled}
                onChange={setEnabled}
                labelOn="Google OAuth / Gmail integration enabled"
                labelOff="Google OAuth / Gmail integration disabled"
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
