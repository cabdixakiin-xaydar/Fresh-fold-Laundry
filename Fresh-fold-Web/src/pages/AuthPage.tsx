import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Shirt } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import * as z from 'zod'

import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { homePathForRole } from '@/auth/roles'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

type Portal = 'staff' | 'customer'
type AuthMode = 'login' | 'register'

const inputClass =
  'w-full rounded border border-[#c1c6d7] bg-[#f7f9fb] py-3 pl-11 pr-10 text-base text-[#191c1e] placeholder:text-[#414755] focus:border-[#0058bc] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/10'

export function AuthPage() {
  const { user, login, register: registerAccount } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [portal, setPortal] = useState<Portal>(
    searchParams.get('portal') === 'customer' ? 'customer' : 'staff',
  )
  const [mode, setMode] = useState<AuthMode>(searchParams.get('mode') === 'register' ? 'register' : 'login')

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    const next = new URLSearchParams()
    next.set('portal', portal)
    next.set('mode', mode)
    setSearchParams(next, { replace: true })
  }, [portal, mode, setSearchParams])

  if (user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  async function onLogin(values: LoginValues) {
    try {
      const signedIn = await login(values.email, values.password)
      navigate(homePathForRole(signedIn.role), { replace: true })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Sign in failed'
      loginForm.setError('root', { message: msg })
    }
  }

  async function onRegister(values: RegisterValues) {
    try {
      const created = await registerAccount({
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        account_type: portal === 'customer' ? 'customer' : 'staff',
      })
      navigate(homePathForRole(created.role), { replace: true })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Registration failed'
      registerForm.setError('root', { message: msg })
    }
  }

  const headline = mode === 'login' ? 'Welcome Back' : 'Create Account'
  const subline =
    portal === 'customer'
      ? mode === 'login'
        ? 'Sign in to view your orders and loyalty rewards.'
        : 'Join Fresh-Fold to track orders and earn loyalty points.'
      : mode === 'login'
        ? 'Sign in to manage your operations.'
        : 'Register as staff — you will access order workflows for your role.'

  const cta =
    mode === 'login'
      ? portal === 'customer'
        ? 'View My Account'
        : 'Access Dashboard'
      : portal === 'customer'
        ? 'Create Customer Account'
        : 'Create Staff Account'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] p-4 md:p-10">
      <main className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-[#e0e3e5] bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.05)] md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0070eb] p-8 md:flex">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: "url('/auth-branding.jpg')" }}
            aria-hidden
          />
          <div className="relative z-10 flex items-center gap-2 text-white">
            <Shirt className="size-8" strokeWidth={2.25} />
            <h1 className="text-2xl font-semibold tracking-tight">Fresh-Fold</h1>
          </div>
          <div className="relative z-10 mt-auto">
            <h2 className="mb-4 text-4xl font-bold leading-tight text-white">Operational Excellence.</h2>
            <p className="max-w-sm text-lg text-white/80">
              Secure access to your laundry management hub. Ensure precision in every order.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-[#191c1e]">{headline}</h2>
            <p className="mt-1 text-base text-[#414755]">{subline}</p>
          </div>

          <div className="mb-6 flex w-full max-w-sm rounded border border-[#c1c6d7] bg-[#eceef0] p-1">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-sm px-4 py-2 text-sm font-semibold transition-all',
                portal === 'staff'
                  ? 'border border-[#c1c6d7] bg-white text-[#0058bc] shadow-sm'
                  : 'text-[#414755] hover:bg-[#f2f4f6]',
              )}
              onClick={() => setPortal('staff')}
            >
              Staff / Admin
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-sm px-4 py-2 text-sm font-semibold transition-all',
                portal === 'customer'
                  ? 'border border-[#c1c6d7] bg-white text-[#0058bc] shadow-sm'
                  : 'text-[#414755] hover:bg-[#f2f4f6]',
              )}
              onClick={() => setPortal('customer')}
            >
              Customer
            </button>
          </div>

          <div className="mb-8 flex gap-6 border-b border-[#c1c6d7]">
            <button
              type="button"
              className={cn(
                'pb-2 text-sm font-semibold transition-colors',
                mode === 'login'
                  ? 'border-b-2 border-[#0058bc] text-[#0058bc]'
                  : 'text-[#414755] hover:text-[#191c1e]',
              )}
              onClick={() => setMode('login')}
            >
              Log In
            </button>
            <button
              type="button"
              className={cn(
                'pb-2 text-sm font-semibold transition-colors',
                mode === 'register'
                  ? 'border-b-2 border-[#0058bc] text-[#0058bc]'
                  : 'text-[#414755] hover:text-[#191c1e]',
              )}
              onClick={() => setMode('register')}
            >
              Create Account
            </button>
          </div>

          {mode === 'login' ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e: FormEvent) => {
                void loginForm.handleSubmit(onLogin)(e)
              }}
            >
              <AuthField
                id="login-email"
                label="Email Address"
                icon={<Mail className="size-5 text-[#717786]" />}
                type="email"
                placeholder={portal === 'staff' ? 'operator@freshfold.com' : 'you@email.com'}
                autoComplete="email"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-medium text-[#191c1e]">
                    Password
                  </label>
                  <button type="button" className="text-xs font-medium text-[#0058bc] hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#717786]" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={inputClass}
                    {...loginForm.register('password')}
                  />
                  <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                </div>
                {loginForm.formState.errors.password ? (
                  <p className="text-xs text-red-600">{loginForm.formState.errors.password.message}</p>
                ) : null}
              </div>
              {loginForm.formState.errors.root ? (
                <p className="text-sm text-red-600">{loginForm.formState.errors.root.message}</p>
              ) : null}
              <SubmitButton loading={loginForm.formState.isSubmitting} label={cta} />
            </form>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e: FormEvent) => {
                void registerForm.handleSubmit(onRegister)(e)
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <AuthField
                  id="reg-first"
                  label="First Name"
                  error={registerForm.formState.errors.first_name?.message}
                  className="[&_input]:pl-3"
                  {...registerForm.register('first_name')}
                />
                <AuthField
                  id="reg-last"
                  label="Last Name"
                  error={registerForm.formState.errors.last_name?.message}
                  className="[&_input]:pl-3"
                  {...registerForm.register('last_name')}
                />
              </div>
              <AuthField
                id="reg-email"
                label="Email Address"
                icon={<Mail className="size-5 text-[#717786]" />}
                type="email"
                autoComplete="email"
                error={registerForm.formState.errors.email?.message}
                {...registerForm.register('email')}
              />
              <AuthField
                id="reg-phone"
                label="Phone (optional)"
                type="tel"
                className="[&_input]:pl-3"
                error={registerForm.formState.errors.phone?.message}
                {...registerForm.register('phone')}
              />
              <AuthField
                id="reg-password"
                label="Password"
                icon={<Lock className="size-5 text-[#717786]" />}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={registerForm.formState.errors.password?.message}
                trailing={<PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
                {...registerForm.register('password')}
              />
              <AuthField
                id="reg-confirm"
                label="Confirm Password"
                icon={<Lock className="size-5 text-[#717786]" />}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={registerForm.formState.errors.confirmPassword?.message}
                {...registerForm.register('confirmPassword')}
              />
              {registerForm.formState.errors.root ? (
                <p className="text-sm text-red-600">{registerForm.formState.errors.root.message}</p>
              ) : null}
              <SubmitButton loading={registerForm.formState.isSubmitting} label={cta} />
            </form>
          )}

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#c1c6d7]" />
            <span className="text-xs font-medium text-[#717786]">or continue with</span>
            <div className="h-px flex-1 bg-[#c1c6d7]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SocialButton icon="/google-icon.png" label="Google" />
            <SocialButton icon="/microsoft-icon.png" label="Microsoft" />
          </div>
        </div>
      </main>
    </div>
  )
}

function AuthField({
  id,
  label,
  icon,
  trailing,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon?: React.ReactNode
  trailing?: React.ReactNode
  error?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-medium text-[#191c1e]">
        {label}
      </label>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span> : null}
        <input id={id} className={cn(inputClass, !icon && 'pl-3')} {...props} />
        {trailing}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717786] hover:text-[#191c1e]"
      onClick={onToggle}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  )
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-[#0058bc] py-3 text-sm font-semibold text-white transition hover:bg-[#005bc1] active:scale-[0.98] disabled:opacity-70"
    >
      {loading ? 'Please wait…' : label}
      <ArrowRight className="size-4" />
    </button>
  )
}

function SocialButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="flex items-center justify-center gap-2 rounded border border-[#c1c6d7] py-2 text-sm font-semibold text-[#191c1e] opacity-60"
    >
      <img src={icon} alt="" className="size-5" />
      {label}
    </button>
  )
}
