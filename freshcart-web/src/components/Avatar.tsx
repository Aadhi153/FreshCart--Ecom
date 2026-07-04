import Image from 'next/image';

function getInitials(name: string, email?: string) {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }
  return (email?.[0] || '?').toUpperCase();
}

interface AvatarProps {
  name: string;
  email?: string;
  avatarUrl?: string | null;
  size?: number;
}

export function Avatar({ name, email, avatarUrl, size = 44 }: AvatarProps) {
  if (avatarUrl) {
    return (
      <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--accent)' }}>
        <Image src={avatarUrl} alt={name || 'Profile photo'} fill sizes={`${size}px`} style={{ objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gradient-primary)',
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.4,
      }}
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </div>
  );
}
