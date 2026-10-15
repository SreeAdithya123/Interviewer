import React, { useState } from 'react';
import { Menu, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  fullSize?: boolean;
}

const Layout = ({ children, fullSize = false }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const isNotDashboard = location.pathname !== '/dashboard';
  const toggleSidebar = () => setSidebarOpen((v) => !v);

  if (fullSize) {
    return <div className="flex min-h-screen flex-col bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform border-r border-foreground/[0.07] bg-card transition-all duration-500 ease-out-quint
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'}
          lg:static lg:transform-none ${sidebarOpen ? 'lg:w-64' : 'lg:w-0'}`}
      >
        {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className={`fixed top-1/2 z-50 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-foreground/10 bg-card text-muted-foreground shadow-soft transition-all duration-500 ease-out-quint hover:text-foreground
          ${sidebarOpen ? 'left-[15rem] lg:left-[15rem]' : 'left-3 lg:left-3'}`}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>

      {/* Main */}
      <div className="flex flex-1 flex-col transition-all duration-500 ease-out-quint">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-foreground/[0.07] bg-card px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <span className="font-headline text-base font-semibold tracking-tight text-foreground">
            Vyoman
          </span>
          {isNotDashboard ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
              aria-label="Dashboard"
            >
              <Home className="h-5 w-5" strokeWidth={1.75} />
            </button>
          ) : (
            <span className="w-9" />
          )}
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
