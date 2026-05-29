import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { backendApi, MenuItemApi } from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

export const MenuManagementPage: React.FC = () => {
  const { addToast } = useToast();
  const [menus, setMenus] = useState<MenuItemApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMenus = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await backendApi.listMenuItems();
      setMenus(items.slice().sort((a, b) => {
        if (!a.parentKey && b.parentKey) return -1;
        if (a.parentKey && !b.parentKey) return 1;
        if (a.parentKey !== b.parentKey) return (a.parentKey ?? '').localeCompare(b.parentKey ?? '');
        return a.sortOrder - b.sortOrder;
      }));
    } catch (err) {
      addToast(toUiError(err, 'Failed to load menus.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void loadMenus(); }, [loadMenus]);

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Menu Structure</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
          Application menu items defined in the database. Managed via DB scripts. Assign menus to admins through Admin Management.
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>Loading…</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Key</th>
                <th>Parent</th>
                <th style={{ textAlign: 'center' }}>Order</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {menus.map(item => (
                <tr key={item.id} style={{ opacity: item.active ? 1 : 0.55 }}>
                  <td style={{ fontWeight: item.parentKey ? 400 : 600, paddingLeft: item.parentKey ? '32px' : undefined }}>
                    {item.parentKey && <span style={{ color: 'var(--text-secondary-dark)', marginRight: '6px' }}>↳</span>}
                    {item.icon && <span style={{ marginRight: '6px' }}>{item.icon}</span>}
                    {item.label}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem', background: 'var(--panel-soft-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                      {item.key}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
                    {item.parentKey ?? '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.sortOrder}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${item.active ? 'badge-success' : 'badge-error'}`}>
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {menus.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary-dark)' }}>
                    No menu items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
