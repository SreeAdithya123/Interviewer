import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const EASE = [0.22, 1, 0.36, 1] as const;

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, signIn, user } = useAuth();

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp) {
      if (!fullName.trim()) {
        toast({ title: 'Error', description: 'Please enter your full name', variant: 'destructive' });
        return;
      }

      if (password !== confirmPassword) {
        toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
        return;
      }
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: 'Account exists',
              description:
                'An account with this email already exists. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({
            title: 'Check your email',
            description: "We've sent you a confirmation link to complete your registration.",
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Invalid credentials',
              description: 'Please check your email and password and try again.',
              variant: 'destructive',
            });
          } else {
            toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });

      if (error) {
        toast({ title: 'Google sign in failed', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect with Google. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink px-14 py-12 text-ink-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="aurora left-[-12%] top-[-10%] h-[34rem] w-[34rem] animate-aurora"
            style={{ background: 'radial-gradient(circle at 30% 30%, hsl(244 80% 60% / 0.5), transparent 60%)' }}
          />
          <div
            className="aurora bottom-[-18%] right-[-14%] h-[32rem] w-[32rem] animate-aurora"
            style={{ background: 'radial-gradient(circle at 60% 40%, hsl(315 80% 62% / 0.4), transparent 62%)', animationDelay: '-10s' }}
          />
        </div>

        <button
          onClick={() => navigate('/')}
          className="relative flex w-max items-center gap-2.5"
          aria-label="Vyoman home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-foreground text-ink">
            <span className="font-headline text-sm font-semibold leading-none">V</span>
          </span>
          <span className="font-headline text-lg font-semibold tracking-tight">Vyoman</span>
        </button>

        <div className="relative">
          <h2 className="max-w-[18ch] font-headline text-4xl font-semibold tracking-headline">
            Preparation, <span className="text-spectrum">engineered</span>.
          </h2>
          <p className="mt-5 max-w-sm font-body text-body leading-body text-ink-muted">
            Rehearse real interviews, get precise feedback, and walk in with genuine
            confidence — one structured session at a time.
          </p>
        </div>

        <p className="relative font-body text-xs text-ink-muted">
          Vyoman — sky in Sanskrit. The foundation, not the limit.
        </p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="w-full max-w-sm"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-8 -ml-3 h-9 px-3 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Back to home
          </Button>

          <span className="eyebrow bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
            <span className="h-1 w-1 rounded-full bg-current" />
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </span>

          <h1 className="mt-5 font-headline text-3xl font-semibold tracking-headline text-foreground">
            {isSignUp ? 'Start your journey' : 'Sign in to Vyoman'}
          </h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            {isSignUp
              ? 'A few details and your first session is ready.'
              : 'Pick up right where you left off.'}
          </p>

          <div className="mt-8 space-y-5">
            <Button
              onClick={handleGoogleAuth}
              variant="outline"
              className="h-11 w-full"
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-foreground/[0.08]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 font-body text-[10px] uppercase tracking-label text-muted-foreground/70">
                  or with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <Input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              )}

              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-11"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                </button>
              </div>

              {isSignUp && (
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-11"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                  </button>
                </div>
              )}

              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
              disabled={isLoading}
            >
              {isSignUp ? (
                <>Already have an account? <span className="text-primary">Sign in</span></>
              ) : (
                <>New here? <span className="text-primary">Create an account</span></>
              )}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
