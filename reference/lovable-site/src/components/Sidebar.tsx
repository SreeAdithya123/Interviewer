import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Laptop,
  FileText,
  Scan,
  Brain,
  Zap,
  Star,
  Users,
  User,
  Settings,
  LogOut,
  CreditCard,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  onClose?: () => void;
}

const menuItems = [
  {
    section: 'Interview',
    items: [
      { name: 'AI Interviewer', href: '/interview-copilot', icon: Laptop },
      { name: 'AI Resume Builder', href: '/resume-builder', icon: FileText },
      { name: 'Resume Scanner', href: '/resume-scanner', icon: Scan },
    ],
  },
  {
    section: 'Tools',
    items: [
      { name: 'Aptitude Test', href: '/aptitude-test', icon: Brain },
      { name: 'AI Material Generator', href: '/material-generator', icon: Zap },
      { name: 'CareerBot', href: '/career-coach', icon: Star },
      { name: 'Talk to Recruiters', href: '/recruiters', icon: Users },
    ],
  },
];

const Sidebar = ({ onClose }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleManageAccount = () => {
    navigate('/settings');
    onClose?.();
  };

  const userName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Wordmark */}
      <div className="flex items-center justify-between px-5 py-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5"
          aria-label="Vyoman home"
        >
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-ink text-ink-foreground">
            <span className="font-headline text-[13px] font-semibold leading-none">V</span>
            <span className="absolute inset-0 rounded-lg bg-gradient-to-tr from-primary/45 via-transparent to-accent/35 mix-blend-screen" />
          </span>
          <span className="font-headline text-base font-semibold tracking-tight text-foreground">
            Vyoman
          </span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="mx-5 h-px bg-foreground/[0.07]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {menuItems.map((section) => (
          <div key={section.section}>
            <h3 className="px-3 pb-2 font-body text-[10px] font-semibold uppercase tracking-label text-muted-foreground/70">
              {section.section}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm font-medium transition-colors duration-300 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/65 hover:bg-foreground/[0.04] hover:text-foreground'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        }`}
                        strokeWidth={1.5}
                      />
                      <span className="whitespace-nowrap">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      {user && (
        <div className="border-t border-foreground/[0.07] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground">
              <User className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-body text-sm font-medium text-foreground">
                {userName}
              </div>
              <div className="truncate font-body text-xs text-muted-foreground">
                {userEmail}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={handleManageAccount}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 font-body text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.07]"
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              Account
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2 font-body text-xs font-medium text-destructive transition-colors hover:bg-destructive/[0.12]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Logout
            </button>
          </div>

          <NavLink
            to="/payments"
            onClick={onClose}
            className={({ isActive }) =>
              `mt-2 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-body text-xs font-semibold tracking-button transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary hover:bg-primary/15'
              }`
            }
          >
            <CreditCard className="h-3.5 w-3.5" strokeWidth={1.5} />
            Plans &amp; Pricing
          </NavLink>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
