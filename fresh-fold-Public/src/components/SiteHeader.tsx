import { Bell, HelpCircle, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { appAuthUrl } from '../lib/appUrl'

export default function SiteHeader() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="brand" to="/">
          FreshFold
        </Link>
        <nav className="site-nav">
          {isHome ? (
            <>
              <a href="#services">Services</a>
              <a href="#pricing">Pricing</a>
              <a href="#how-it-works">How It Works</a>
            </>
          ) : (
            <>
              <Link to="/#services">Services</Link>
              <Link to="/#pricing">Pricing</Link>
              <Link to="/#how-it-works">How It Works</Link>
            </>
          )}
        </nav>
        <div className="site-actions">
          <button type="button" className="icon-button" aria-label="Search">
            <Search size={18} />
          </button>
          <a className="ghost-button site-auth-link" href={appAuthUrl({ mode: 'login' })}>
            Sign In
          </a>
          <a
            className="secondary-button site-auth-link"
            href={appAuthUrl({ mode: 'register', portal: 'customer' })}
          >
            Sign Up
          </a>
          <Link className="primary-button primary-button--sm" to="/book">
            Book Now
          </Link>
          <div className="site-icons">
            <button type="button" className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button type="button" className="icon-button" aria-label="Help">
              <HelpCircle size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
