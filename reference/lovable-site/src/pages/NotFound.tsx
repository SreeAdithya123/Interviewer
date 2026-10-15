import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6 text-ink-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="aurora left-[10%] top-[-10%] h-[36rem] w-[36rem] animate-aurora"
          style={{ background: 'radial-gradient(circle at 40% 40%, hsl(244 80% 60% / 0.45), transparent 62%)' }}
        />
        <div
          className="aurora bottom-[-20%] right-[0%] h-[34rem] w-[34rem] animate-aurora"
          style={{ background: 'radial-gradient(circle at 60% 50%, hsl(315 80% 62% / 0.38), transparent 64%)', animationDelay: '-9s' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative text-center"
      >
        <p className="font-metric text-[clamp(5rem,18vw,10rem)] font-semibold leading-none tracking-tight text-ink-foreground/15">
          404
        </p>
        <h1 className="mt-2 font-headline text-3xl font-semibold tracking-headline">
          This page isn&apos;t on the <span className="text-spectrum">map</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-sm font-body text-sm leading-body text-ink-muted">
          The route <code className="rounded bg-white/10 px-1.5 py-0.5 text-ink-foreground/80">{location.pathname}</code> doesn&apos;t exist — but everything else still does.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => navigate('/')}>Back to home</Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="border-white/15 bg-white/[0.04] text-ink-foreground hover:bg-white/[0.08]">
            Go to dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
