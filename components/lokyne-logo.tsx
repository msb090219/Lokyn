export function LokynLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      width="120"
      height="40"
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <text
        x="0"
        y="32"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="28"
        fontWeight="600"
        letterSpacing="-0.5"
        className="fill-foreground"
      >
        Lokyn
      </text>
      <text
        x="57"
        y="32"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="28"
        fontWeight="600"
        className="fill-primary"
      >
        .
      </text>
    </svg>
  )
}
