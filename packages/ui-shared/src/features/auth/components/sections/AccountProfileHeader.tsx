import React from 'react';

interface AccountProfileHeaderProps {
  user: {
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null;
  customPhoto?: string | null;
  accentFrom?: string;
}

export function AccountProfileHeader({
  user,
  customPhoto,
  accentFrom = 'var(--studio-accent-from, #ffffff)',
}: AccountProfileHeaderProps) {
  const photo = customPhoto || user?.photoURL;
  const name = user?.displayName || 'Studio User';
  const email = user?.email || 'No email attached';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          padding: 2,
          background: `linear-gradient(135deg, ${accentFrom} 0%, rgba(255, 255, 255, 0.4) 100%)`,
          boxShadow: `0 4px 16px ${accentFrom}30, inset 0 1px 1px rgba(255, 255, 255, 0.40)`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: 'var(--c-surface-mid, #111115)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              fontFamily: 'var(--studio-font-display)',
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: 'var(--c-text-primary)',
            fontFamily: 'var(--studio-font-display)',
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--c-text-secondary)',
            fontFamily: 'Inter, sans-serif',
            opacity: 0.85,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </span>
      </div>
    </div>
  );
}
