import {
  Bell,
  FileText,
  Headphones,
  HelpCircle,
  Home,
  MapPin,
  Package,
  Sparkles,
  Truck,
  UserCircle2,
  WashingMachine,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { apiGet, pdfUrlForOrder } from '../api/client'

type TimelineStep = {
  key: string
  label: string
  state: string
  detail: string
}

type TrackingPayload = {
  order_number: string
  status: string
  subtotal: string
  discount_amount: string
  tax_amount: string
  total: string
  special_instructions: string
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_address: string
  items: Array<{
    category: string
    service_label: string
    quantity_label: string
    line_total: string
    delicate?: boolean
  }>
  invoice: { id: number; invoice_number: string; payment_status: string } | null
  estimated_completion: { headline: string; detail: string }
  tax_percent_display: string | null
  timeline: { steps: TimelineStep[] }
}

const STEP_ICONS: Record<string, typeof Package> = {
  received: Package,
  processing: Sparkles,
  ready: WashingMachine,
  out_for_delivery: Truck,
  delivered: Home,
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export default function TrackOrderPage() {
  const { orderNumber: rawParam } = useParams()
  const orderNumber = rawParam ? decodeURIComponent(rawParam) : ''

  const [data, setData] = useState<TrackingPayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false)
      setError('Missing order ID.')
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const track = await apiGet<TrackingPayload>(
          `/api/v1/orders/track/?order=${encodeURIComponent(orderNumber)}`
        )
        if (!cancelled) {
          setData(track)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load this order.')
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderNumber])

  const invoiceUrl = useMemo(() => (data ? pdfUrlForOrder(data.order_number) : ''), [data])

  return (
    <div className="page track-page" id="top">
      <header className="track-topbar">
        <div className="shell track-topbar__inner">
          <Link className="brand" to="/">
            FreshFold
          </Link>
          <div className="track-topbar__icons">
            <button type="button" className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button type="button" className="icon-button" aria-label="Help">
              <HelpCircle size={18} />
            </button>
            <button type="button" className="icon-button" aria-label="Account">
              <UserCircle2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="track-main shell">
        {loading ? <p className="track-state">Loading order…</p> : null}
        {!loading && error ? <p className="track-state track-state--error">{error}</p> : null}
        {!loading && !error && data ? (
          <>
            <div className="track-title-row">
              <div>
                <h1 className="track-h1">Order Tracking</h1>
                <p className="track-order-id">Order ID: #{data.order_number}</p>
              </div>
              <div className="track-title-actions">
                {data.invoice ? (
                  <a
                    className="secondary-button track-btn-icon"
                    href={invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={18} /> View Invoice
                  </a>
                ) : (
                  <button type="button" className="secondary-button track-btn-icon" disabled title="Not available yet">
                    <FileText size={18} /> View Invoice
                  </button>
                )}
                <a
                  className="primary-button track-btn-icon"
                  href={`mailto:support@freshfold.local?subject=${encodeURIComponent(`Order ${data.order_number}`)}`}
                >
                  <Headphones size={18} /> Contact Support
                </a>
              </div>
            </div>

            <section className="track-card track-card--status">
              <p className="track-eta-line">
                <span className="track-eta-head">{data.estimated_completion.headline}</span>
                {data.estimated_completion.detail ? (
                  <span className="track-eta-time"> · {data.estimated_completion.detail}</span>
                ) : null}
              </p>
              <div className="track-timeline" role="list">
                {data.timeline.steps.map((step) => {
                  const Icon = STEP_ICONS[step.key] ?? Package
                  const mod =
                    step.state === 'complete'
                      ? 'track-step--complete'
                      : step.state === 'current'
                        ? 'track-step--current'
                        : 'track-step--pending'
                  return (
                    <div key={step.key} className={`track-step ${mod}`} role="listitem">
                      <div className="track-step__icon" aria-hidden>
                        <Icon size={22} />
                      </div>
                      <div className="track-step__text">
                        <span className="track-step__label">{step.label}</span>
                        <span className="track-step__detail">{step.detail}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="track-columns">
              <section className="track-card">
                <h2 className="track-section-title">Order summary</h2>
                <div className="track-table-wrap">
                  <table className="track-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Service</th>
                        <th>Quantity</th>
                        <th className="track-table__num">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((row, idx) => (
                        <tr key={`${idx}-${row.category}-${row.quantity_label}`}>
                          <td>
                            <span className="track-item-name">
                              {row.category}
                              {row.delicate ? <span className="track-badge">Delicate</span> : null}
                            </span>
                          </td>
                          <td>{row.service_label}</td>
                          <td>{row.quantity_label}</td>
                          <td className="track-table__num">${row.line_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="track-totals">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>${data.subtotal}</dd>
                  </div>
                  <div>
                    <dt>{data.tax_percent_display ? `Tax (${data.tax_percent_display})` : 'Tax'}</dt>
                    <dd>${data.tax_amount}</dd>
                  </div>
                  <div className="track-totals__grand">
                    <dt>Total amount</dt>
                    <dd>${data.total}</dd>
                  </div>
                </dl>
              </section>

              <aside className="track-aside">
                <section className="track-card">
                  <h2 className="track-section-title">Customer details</h2>
                  <div className="track-customer">
                    <div className="track-avatar" aria-hidden>
                      {initials(data.customer_name)}
                    </div>
                    <div>
                      <p className="track-customer-name">{data.customer_name}</p>
                      <p className="track-customer-phone">{data.customer_phone}</p>
                      {data.customer_email ? <p className="track-muted">Email: {data.customer_email}</p> : null}
                    </div>
                  </div>
                </section>

                <section className="track-card">
                  <h2 className="track-section-title track-with-icon">
                    <MapPin size={18} /> Delivery address
                  </h2>
                  <p className="track-address">{data.customer_address || '—'}</p>
                  {data.special_instructions ? (
                    <div className="track-callout">
                      <p>
                        <strong>Special instructions:</strong> {data.special_instructions}
                      </p>
                    </div>
                  ) : null}
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="shell site-footer__inner">
          <Link className="brand" to="/">
            FreshFold
          </Link>
          <p>© 2026 Fresh-Fold Laundry Management. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
