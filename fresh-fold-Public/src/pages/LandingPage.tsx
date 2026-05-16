import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Shirt,
  Sparkles,
  Truck,
  WashingMachine,
  Search,
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import SiteHeader from '../components/SiteHeader'
import { appAuthUrl } from '../lib/appUrl'
import { normalizeOrderNumber } from '../lib/orderId'

type ServiceCard = {
  title: string
  description: string
  price: string
  icon: typeof WashingMachine
  wide?: boolean
  accent?: boolean
}

const services: ServiceCard[] = [
  {
    title: 'Wash & Fold',
    description:
      'Our core service. Everyday garments are sorted, washed with premium detergents, dried to perfection, and meticulously folded for immediate storage.',
    price: 'From $1.50 / lb',
    icon: WashingMachine,
    wide: true,
  },
  {
    title: 'Dry Cleaning',
    description:
      'Expert stain removal and pressing for suits, dresses, and delicate fabrics. Returned in protective garment bags.',
    price: 'Per Item Pricing',
    icon: Sparkles,
  },
  {
    title: 'Ironing & Pressing',
    description:
      'Crisp, professional pressing for shirts and slacks. We ensure sharp creases and a flawless finish.',
    price: 'From $3.00 / item',
    icon: Shirt,
  },
  {
    title: 'Commercial Accounts',
    description:
      'High-volume solutions for hotels, spas, and corporate offices. Specialized pricing and priority scheduling.',
    price: 'Request a Quote',
    icon: Shirt,
    wide: true,
    accent: true,
  },
]

const steps = [
  {
    title: '1. Schedule Pickup',
    body: 'Book online or by phone, then leave your bags at the door and our fleet will collect them promptly.',
    icon: Truck,
    complete: true,
  },
  {
    title: '2. We Clean & Inspect',
    body: 'Garments are processed in our modern facility with your care instructions followed on every order.',
    icon: Sparkles,
  },
  {
    title: '3. Fresh Delivery',
    body: 'Your clothes come back crisply folded or pressed on hangers, ready to wear immediately.',
    icon: CheckSquare,
  },
]

function Hero() {
  const navigate = useNavigate()
  const [trackingCode, setTrackingCode] = useState('')
  const [trackingMessage, setTrackingMessage] = useState('')

  const trimmedCode = useMemo(() => trackingCode.trim(), [trackingCode])

  function onTrackSubmit(event: FormEvent) {
    event.preventDefault()
    if (!trimmedCode) {
      setTrackingMessage('Enter an order ID to begin tracking.')
      return
    }
    const id = normalizeOrderNumber(trimmedCode)
    if (!id) {
      setTrackingMessage('Enter an order ID to begin tracking.')
      return
    }
    setTrackingMessage('')
    navigate(`/track/${encodeURIComponent(id)}`)
  }

  return (
    <section className="hero">
      <div className="shell hero__grid">
        <div className="hero__copy">
          <div className="eyebrow">
            <Shirt size={14} />
            <span>Professional Care</span>
          </div>
          <h1>Crisp, clean, and ready when you are.</h1>
          <p>
            Experience clinical precision and operational efficiency for your wardrobe. We handle the wash, dry, and
            fold, so you can focus on what matters. Track your order seamlessly from hamper to hanger.
          </p>

          <div className="hero__buttons">
            <Link className="primary-button" to="/book">
              Book Your Pickup
              <ArrowRight size={18} />
            </Link>
            <a className="secondary-button" href={appAuthUrl({ mode: 'login' })}>
              Sign In
            </a>
            <a className="ghost-button" href={appAuthUrl({ mode: 'register', portal: 'customer' })}>
              Sign Up
            </a>
            <a className="ghost-button" href="#pricing">
              <Sparkles size={18} />
              View Pricing
            </a>
          </div>

          <form className="tracking-card" onSubmit={onTrackSubmit}>
            <label htmlFor="tracking-code">Track My Order</label>
            <div className="tracking-card__row">
              <div className="tracking-input">
                <Search size={16} />
                <input
                  id="tracking-code"
                  value={trackingCode}
                  onChange={(event) => setTrackingCode(event.target.value)}
                  placeholder="Enter Order ID (e.g. FF-20260513-00001)"
                />
              </div>
              <button type="submit" className="ghost-button">
                Track
              </button>
            </div>
            {trackingMessage ? <p className="tracking-card__message">{trackingMessage}</p> : null}
          </form>
        </div>

        <div className="hero__media">
          <img src="/fresh-fold-hero.jpg" alt="Stacks of folded white laundry in a clean modern laundry room." />
          <div className="assurance-card">
            <div className="assurance-card__icon">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p>Quality Assured</p>
              <strong>100% Satisfaction Guarantee</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Services() {
  return (
    <section className="section" id="services">
      <div className="shell">
        <div className="section-heading">
          <h2>Our Services</h2>
          <p>
            Comprehensive garment care tailored for professionals. Every item is treated with clinical precision.
          </p>
        </div>

        <div className="services-grid" id="pricing">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <article
                key={service.title}
                className={`service-card${service.wide ? ' service-card--wide' : ''}${service.accent ? ' service-card--accent' : ''}`}
              >
                <div className="service-card__icon">
                  <Icon size={22} />
                </div>
                <div className="service-card__content">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
                <div className="service-card__footer">
                  <span>{service.price}</span>
                  {!service.accent ? <ArrowRight size={16} /> : null}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="section section--alt" id="how-it-works">
      <div className="shell">
        <div className="section-heading section-heading--left">
          <h2>How It Works</h2>
          <p>A streamlined, trackable process designed for maximum convenience and reliability.</p>
        </div>

        <div className="steps">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <article key={step.title} className="step-card">
                <div className="step-card__icon">
                  <Icon size={28} />
                  {step.complete ? <span className="step-card__dot" /> : null}
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <span className="brand">FreshFold</span>
        <p>© 2026 Fresh-Fold Laundry Management. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="page" id="top">
      <SiteHeader />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
