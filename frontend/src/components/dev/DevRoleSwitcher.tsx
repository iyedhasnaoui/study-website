
import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.tsx';
import type { AppRole } from '../../auth/types';

export const DevRoleSwitcher: React.FC = () => {
    const { role, isReady, isAuthenticated, roleError, overrideRole } = useAuth();
    const [isSwitching, setIsSwitching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // STRICT CHECK: Vite safely strips this entirely out of production builds
    if (!import.meta.env.DEV) return null;

    if (!isReady || !isAuthenticated) return null;

    const selectRole = async (nextRole: AppRole | null) => {
        if (isSwitching) return;
        setIsSwitching(true);
        setError(null);
        try {
            await overrideRole(nextRole);
        } catch (switchError) {
            setError(switchError instanceof Error ? switchError.message : 'Unable to confirm the selected role.');
        } finally {
            setIsSwitching(false);
        }
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: '4px 8px',
        cursor: isSwitching ? 'not-allowed' : 'pointer',
        backgroundColor: active ? '#3b82f6' : '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        opacity: isSwitching ? 0.6 : 1,
    });

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
            <span style={{ color: '#aaa' }}>Backend-confirmed role: <span style={{ color: '#fff' }}>{role ?? 'Unavailable'}</span></span>
            {error || roleError ? <span role="alert" style={{ color: '#fca5a5' }}>{error || roleError}</span> : null}
            <div style={{ display: 'flex', gap: '8px' }}>
                {(['VIEWER', 'CONTRIBUTOR', 'ADMIN'] as const).map((nextRole) => (
                    <button
                        key={nextRole}
                        disabled={isSwitching}
                        onClick={() => void selectRole(nextRole)}
                        style={buttonStyle(role === nextRole)}
                    >
                        {nextRole[0] + nextRole.slice(1).toLowerCase()}
                    </button>
                ))}
                <button
                    disabled={isSwitching}
                    onClick={() => void selectRole(null)}
                    style={buttonStyle(false)}
                >
                    Actual role
                </button>
            </div>
        </div>
    );
};