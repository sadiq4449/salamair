import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import SalamAirBrandLogo from '../components/branding/SalamAirBrandLogo';

const inputGlass =
  'bg-white/95 backdrop-blur-[2px] border-gray-200/90 shadow-sm dark:bg-white dark:border-gray-200 dark:text-gray-900';

const bullet =
  'inline-block h-1.5 w-1.5 rounded-full bg-[#7CE3D0] shadow-[0_0_8px_rgba(124,227,208,0.6)]';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch {
      // error is set in the store
    }
  };

  return (
    <div className="relative min-h-[100dvh] min-h-screen overflow-hidden bg-[#0B2A38]">
      {/* Full-viewport hero — SalamAir cityscape with built-in left scrim */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <img
          src="/images/salam-air-login-hero.png"
          alt=""
          className="h-full w-full object-cover object-[60%_30%] sm:object-[55%_center] lg:object-[62%_32%]"
          decoding="async"
          fetchPriority="high"
        />
        {/* Strengthen the left scrim so light copy reads cleanly at all viewport widths */}
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(8,32,46,0.78)_0%,rgba(8,32,46,0.55)_28%,rgba(8,32,46,0.18)_54%,transparent_72%)] sm:bg-[linear-gradient(105deg,rgba(8,32,46,0.74)_0%,rgba(8,32,46,0.45)_32%,rgba(8,32,46,0.12)_58%,transparent_78%)]" />
        {/* Subtle vignette to ground the form card on the bright cityscape */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03161E]/40 via-transparent to-[#03161E]/15" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-[1600px] grid-cols-1 gap-10 px-5 py-12 sm:px-10 lg:min-h-screen lg:grid-cols-[1.05fr_minmax(420px,460px)] lg:items-stretch lg:gap-16 lg:px-16 xl:px-24">
        {/* LEFT: brand + marketing copy — stays vertically centred */}
        <div className="flex flex-col justify-center">
          <SalamAirBrandLogo
            heightClass="h-12 sm:h-14"
            className="drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] brightness-[1.05]"
          />
          <p className="mt-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#7CE3D0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            SmartDeal Platform
          </p>

          <h1 className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] sm:mt-9 sm:text-[2.5rem] lg:text-[2.875rem]">
            Smarter deals.
            <br />
            Better journeys.
          </h1>
          <p className="mt-5 max-w-[34rem] text-[15px] leading-relaxed text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:text-base">
            SalamAir's SmartDeal portal gives travel teams real-time corporate
            fares, transparent pricing, and a single workspace for every
            booking — across the GCC and beyond.
          </p>

          <ul className="mt-7 hidden max-w-[34rem] flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] lg:flex">
            <li className="flex items-center gap-2">
              <span className={bullet} />
              Negotiated corporate fares
            </li>
            <li className="flex items-center gap-2">
              <span className={bullet} />
              Live availability
            </li>
            <li className="flex items-center gap-2">
              <span className={bullet} />
              Centralised reporting
            </li>
          </ul>
        </div>

        {/* RIGHT: form card — bottom-aligned on large screens so the hero plane stays visible above */}
        <div className="flex w-full max-w-[460px] flex-col justify-end lg:ml-auto lg:pb-8">
          <div
            className="rounded-2xl border border-white/60 bg-white/90 p-8 shadow-[0_30px_60px_-12px_rgba(3,22,30,0.5)] backdrop-blur-xl backdrop-saturate-150 sm:p-9 dark:bg-white/95 dark:backdrop-blur-xl"
            style={{ WebkitBackdropFilter: 'blur(16px)' }}
          >
            <div className="mb-7">
              <h2 className="text-[1.375rem] font-semibold tracking-tight text-[#003B3F] dark:text-[#003B3F]">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-700 backdrop-blur-sm dark:bg-red-50 dark:text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
                icon={<Mail className="h-4 w-4 text-[#00A99D]/90" />}
                required
                autoComplete="email"
                className={inputGlass}
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                icon={<Lock className="h-4 w-4 text-[#00A99D]/90" />}
                suffix={
                  <button
                    type="button"
                    className="view rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]/35 dark:hover:bg-gray-100 dark:hover:text-gray-700"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                }
                required
                autoComplete="current-password"
                className={inputGlass}
              />

              <div className="pt-1">
                <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                  Sign In
                </Button>
              </div>
            </form>
          </div>

          <p className="mt-8 text-center text-[13px] text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)] sm:text-right">
            &copy; {new Date().getFullYear()} Salam Air. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
