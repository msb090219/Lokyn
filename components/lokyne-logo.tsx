import Image from 'next/image'
import Link from 'next/link'

export function LokynLogo({ className = "", link = true }: { className?: string; link?: boolean }) {
  const logo = (
    <Image
      src="/logo.png"
      alt="Lokyn"
      width={240}
      height={90}
      className={className}
      style={{ width: 'auto', height: '60px' }}
      priority
    />
  )

  if (link) {
    return <Link href="/">{logo}</Link>
  }

  return logo
}
