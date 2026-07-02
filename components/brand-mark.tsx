/** Logo da Sentinela: ícone (sentinela dentro de um cubo). */
export function BrandMark({
  size = 42,
  className = "",
  variant = "solid",
}: {
  size?: number;
  className?: string;
  variant?: "solid" | "outline";
}) {
  const front = variant === "outline" ? "#15123A" : "#1E1B4B";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M24 3 6 13v22l18 10 18-10V13L24 3Z"
        fill={front}
        stroke={variant === "outline" ? "#7C3AED" : undefined}
        strokeWidth={variant === "outline" ? 1.3 : undefined}
      />
      <path d="M24 3 6 13l18 10 18-10L24 3Z" fill="#5B21B6" />
      <path d="M24 23v22l18-10V13L24 23Z" fill="#241F5C" />
      <circle cx="24" cy="20" r="5.4" fill="none" stroke="#FF6600" strokeWidth="2.5" />
      <path d="M24 25.4V33" stroke="#FF6600" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
