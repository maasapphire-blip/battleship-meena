export type IconName = 'anchor' | 'dice' | 'rotate' | 'fire' | 'trophy' | 'burst'

const PATHS: Record<IconName, string> = {
  anchor:
    'M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-1 7v11.9A8 8 0 0 1 4.1 14H6l-3-3-3 3h2.07A10 10 0 0 0 12 22a10 10 0 0 0 9.93-8H24l-3-3-3 3h1.9A8 8 0 0 1 13 20.9V9h-2z',
  dice:
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 3.5A1.5 1.5 0 1 0 8 9.5 1.5 1.5 0 0 0 8 6.5zm8 0A1.5 1.5 0 1 0 16 9.5 1.5 1.5 0 0 0 16 6.5zm-4 4A1.5 1.5 0 1 0 12 13.5 1.5 1.5 0 0 0 12 10.5zm-4 4A1.5 1.5 0 1 0 8 17.5 1.5 1.5 0 0 0 8 14.5zm8 0A1.5 1.5 0 1 0 16 17.5 1.5 1.5 0 0 0 16 14.5z',
  rotate:
    'M12 4a8 8 0 0 0-7.4 5H2l3.5 4L9 9H6.8A6 6 0 1 1 6 15.2l-1.6 1.2A8 8 0 1 0 12 4z',
  fire:
    'M12 2s1 3 4 6c2.3 2.3 3 4.3 3 6.5A7 7 0 0 1 5 14.5c0-2.4 1.2-4 2.5-5.5.2 1.6 1 2.5 2 3-.3-3 .7-6.6 2.5-10zm0 11c-1.5 1.3-2.5 2.5-2.5 4A2.5 2.5 0 0 0 12 19.5 2.5 2.5 0 0 0 14.5 17c0-1.5-1-2.7-2.5-4z',
  trophy:
    'M6 2h12v2h3v3a5 5 0 0 1-4.3 4.9A7 7 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1a7 7 0 0 1-3.7-4A5 5 0 0 1 3 7V4h3V2zm0 4H5v1a3 3 0 0 0 1.6 2.6A7.1 7.1 0 0 1 6 7V6zm12 0v1c0 .9-.2 1.8-.6 2.6A3 3 0 0 0 19 7V6h-1z',
  burst:
    'M12 1l2.2 5.4L20 4.5l-1.9 5.8L23 12l-4.9 1.7 1.9 5.8-5.8-1.9L12 23l-2.2-5.4L4 19.5l1.9-5.8L1 12l4.9-1.7L4 4.5l5.8 1.9L12 1z',
}

interface Props {
  name: IconName
  className?: string
}

export function Icon({ name, className }: Props) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
