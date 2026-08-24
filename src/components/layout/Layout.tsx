import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  activeView: NavItemKey;
  onNavigate: (view: NavItemKey, filterParam?: string) => void;
  onQuickSearch: (query: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeView,
  onNavigate,
  onQuickSearch,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar Fixa no Desktop / Drawer no Mobile */}
      <Sidebar
        activeView={activeView}
        onNavigate={onNavigate}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <Header
          activeView={activeView}
          onNavigate={onNavigate}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onQuickSearch={onQuickSearch}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
