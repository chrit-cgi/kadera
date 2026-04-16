import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { tokens } from '../design-system/tokens.js'

// ── Tab definition ────────────────────────────────────────────────────────────

export interface TabDef {
  path: string
  label: string
  icon: React.ReactNode
}

interface MobileShellProps {
  tabs: TabDef[]
  isAdmin: boolean
}

// ── Admin tab ─────────────────────────────────────────────────────────────────

const AdminTab: TabDef = {
  path: '/admin',
  label: 'Admin',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function MobileShell({ tabs, isAdmin }: MobileShellProps) {
  const location = useLocation()
  const allTabs = isAdmin ? [...tabs, AdminTab] : tabs

  // Hide navigation during onboarding
  const showNav = !location.pathname.startsWith('/onboarding')

  const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.space[1],
    padding: `${tokens.space[2]} ${tokens.space[3]}`,
    color: isActive ? tokens.color.brand.primary : tokens.color.text.secondary,
    textDecoration: 'none',
    fontSize: tokens.font.size.xs,
    fontFamily: tokens.font.family.body,
    fontWeight: isActive ? tokens.font.weight.medium : tokens.font.weight.regular,
    minWidth: '44px',
    minHeight: '44px',
    justifyContent: 'center',
    transition: `color ${tokens.transition.fast}`,
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: tokens.color.surface.base,
        color: tokens.color.text.primary,
        fontFamily: tokens.font.family.body,
      }}
    >
      {/* Desktop sidebar (≥768px) */}
      {showNav && (
        <nav
          style={{
            display: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            width: tokens.layout.sidebarWidth,
            height: '100dvh',
            background: tokens.color.surface.raised,
            borderRight: `1px solid ${tokens.color.text.disabled}20`,
            flexDirection: 'column',
            padding: `${tokens.space[6]} 0`,
            zIndex: 50,
          }}
          className="kadera-sidebar"
          aria-label="Main navigation"
        >
          <div style={{ padding: `0 ${tokens.space[4]} ${tokens.space[6]}` }}>
            <span
              style={{
                fontSize: tokens.font.size.xl,
                fontWeight: tokens.font.weight.bold,
                color: tokens.color.brand.primary,
              }}
            >
              Kadera
            </span>
          </div>
          {allTabs.map((tab) => (
            <NavLink key={tab.path} to={tab.path} style={navLinkStyle}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Main content */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          paddingBottom: showNav ? tokens.layout.tabBarHeight : '0',
        }}
        className="kadera-main"
      >
        <Outlet />
      </main>

      {/* Mobile tab bar (<768px) */}
      {showNav && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: tokens.layout.tabBarHeight,
            background: tokens.color.surface.raised,
            borderTop: `1px solid ${tokens.color.text.disabled}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 50,
          }}
          className="kadera-tabbar"
          aria-label="Main navigation"
        >
          {allTabs.map((tab) => (
            <NavLink key={tab.path} to={tab.path} style={navLinkStyle}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Responsive style — show sidebar on desktop, hide tab bar */}
      <style>{`
        @media (min-width: 768px) {
          .kadera-sidebar { display: flex !important; }
          .kadera-tabbar { display: none !important; }
          .kadera-main { margin-left: ${tokens.layout.sidebarWidth}; padding-bottom: 0 !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  )
}
