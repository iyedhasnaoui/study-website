
import React from 'react';
import { useAuth } from '../../auth/AuthContext.tsx';
import type { AppRole } from '../../auth/types';

export const DevRoleSwitcher: React.FC = () => {
    // STRICT CHECK: Vite safely strips this entirely out of production builds
    if (!import.meta.env.DEV) {
        return null;
    }

    const { role, isReady, overrideRole, session } = useAuth();

    // Do not render if context isn't ready, user isn't logged in, or override function is missing
    if (!isReady || !session || !overrideRole) return null;

    const currentRole = role || 'USER';

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '16px',
                right: '16px',
                backgroundColor: '#1e1e1e',
                color: '#f5f5f5',
                padding: '12px',
                borderRadius: '8px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                border: '1px solid #444'
            }}
        >
            <strong style={{ margin: 0 }}>🛠️ Dev Role Switcher</strong>
            <span style={{ color: '#aaa' }}>Current: <span style={{ color: '#fff' }}>{currentRole}</span></span>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => overrideRole('USER' as AppRole)}
                    style={{
                        padding: '4px 8px',
                        cursor: 'pointer',
                        backgroundColor: currentRole === 'USER' ? '#3b82f6' : '#333',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    User
                </button>
                <button
                    onClick={() => overrideRole('ADMIN' as AppRole)}
                    style={{
                        padding: '4px 8px',
                        cursor: 'pointer',
                        backgroundColor: currentRole === 'ADMIN' ? '#ef4444' : '#333',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    Admin
                </button>
            </div>
        </div>
    );
};