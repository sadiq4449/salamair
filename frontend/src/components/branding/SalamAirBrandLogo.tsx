/**
 * Official SalamAir wordmark (English + mark + Arabic) — static asset in /public.
 */
type SalamAirBrandLogoProps = {
  className?: string;
  /** Tailwind height class; width stays auto to preserve aspect ratio. */
  heightClass?: string;
};

export default function SalamAirBrandLogo({ className = '', heightClass = 'h-9' }: SalamAirBrandLogoProps) {
  return (
    <img
      src="/salam-air-logo.png"
      alt="SalamAir"
      className={`w-auto max-w-full object-contain object-left ${heightClass} ${className}`}
      width={220}
      height={48}
      loading="eager"
      decoding="async"
    />
  );
}
