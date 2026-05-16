interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, size = 40, className = "" }: AvatarProps) {
  const url = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
  return (
    <img
      src={url}
      alt="avatar"
      width={size}
      height={size}
      className={`rounded-full bg-brand-100 ${className}`}
    />
  );
}
