import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dumbbell, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    if (mode !== 'forgot') {
      if (!password) return toast.error('Please fill in all fields');
      if (password.length < 6) return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
        navigate('/');
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success('Account created! You can now use the app.');
        navigate('/');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Check your email for a password reset link.');
        setMode('login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'forgot' ? 'Reset Password' : 'FitPlan AI';
  const subtitle =
    mode === 'forgot'
      ? "Enter your email and we'll send you a link"
      : 'Your personal fitness coach';
  const cta =
    mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link';
  const ctaLoading =
    mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending...';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 safe-top safe-bottom">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-fire flex items-center justify-center mx-auto mb-4 shadow-glow">
          <Dumbbell className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-secondary rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-secondary rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-primary text-sm font-medium"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-fire rounded-xl font-display font-semibold text-primary-foreground shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {ctaLoading}
              </>
            ) : (
              cta
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          {mode === 'forgot' ? (
            <button
              onClick={() => setMode('login')}
              className="text-muted-foreground text-sm inline-flex items-center gap-1"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </button>
          ) : (
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-muted-foreground text-sm"
              disabled={loading}
            >
              {mode === 'login' ? (
                <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
              ) : (
                <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
