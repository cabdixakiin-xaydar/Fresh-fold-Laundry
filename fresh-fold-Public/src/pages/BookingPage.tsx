import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { apiGet, apiPost } from '../api/client'
import SiteHeader from '../components/SiteHeader'

type ServiceTypeRow = {
  id: number
  name: string
  code: string
  base_price: string
  pricing_unit: 'item' | 'kg'
  active: boolean
}

type Line = {
  service_type: number | ''
  quantity: number
  weight_kg: string
}

function parseServiceList(data: unknown): ServiceTypeRow[] {
  if (Array.isArray(data)) {
    return data as ServiceTypeRow[]
  }
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: ServiceTypeRow[] }).results
  }
  return []
}

export default function BookingPage() {
  const navigate = useNavigate()
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([])
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ service_type: '', quantity: 1, weight_kg: '' }])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await apiGet<unknown>('/api/v1/service-types/')
        const list = parseServiceList(raw).filter((s) => s.active)
        if (cancelled) {
          return
        }
        setServiceTypes(list)
        setLines((prev) =>
          prev.map((row, i) =>
            i === 0 && row.service_type === '' && list[0]
              ? { ...row, service_type: list[0].id }
              : row
          )
        )
      } catch {
        if (!cancelled) {
          setLoadError('Could not load services. Is the API running?')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function addLine() {
    const fallback = serviceTypes[0]?.id ?? ''
    setLines((prev) => [...prev, { service_type: fallback, quantity: 1, weight_kg: '' }])
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!name.trim() || !phone.trim()) {
      setSubmitError('Name and phone are required.')
      return
    }

    const items: Array<{ service_type: number; quantity: number; weight_kg?: number }> = []
    for (const row of lines) {
      if (row.service_type === '') {
        setSubmitError('Select a service for every line item.')
        return
      }
      const st = serviceTypes.find((s) => s.id === row.service_type)
      if (!st) {
        setSubmitError('Invalid service selection.')
        return
      }
      if (st.pricing_unit === 'kg') {
        const w = parseFloat(row.weight_kg)
        if (!Number.isFinite(w) || w <= 0) {
          setSubmitError(`Enter weight (lb) for ${st.name}.`)
          return
        }
        items.push({ service_type: row.service_type, quantity: 1, weight_kg: w })
      } else {
        if (row.quantity < 1) {
          setSubmitError('Quantity must be at least 1.')
          return
        }
        items.push({ service_type: row.service_type, quantity: row.quantity })
      }
    }

    if (items.length === 0) {
      setSubmitError('Add at least one item.')
      return
    }

    setSubmitting(true)
    try {
      const created = await apiPost<{ order_number: string }>('/api/v1/orders/web-booking/', {
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          preferences: '',
          notes: customerNotes.trim(),
        },
        special_instructions: specialInstructions.trim(),
        is_express: false,
        items,
      })
      navigate(`/track/${encodeURIComponent(created.order_number)}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Booking failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page" id="top">
      <SiteHeader />
      <main className="booking-main shell">
        <p className="booking-back">
          <Link to="/" className="booking-back__link">
            <ArrowLeft size={18} /> Back to home
          </Link>
        </p>
        <div className="booking-hero">
          <h1 className="booking-title">Book a pickup</h1>
          <p className="booking-lede">
            Tell us who you are and what we&apos;re washing. You&apos;ll get an order number to track on the next page.
          </p>
        </div>

        {loadError ? <p className="booking-banner booking-banner--error">{loadError}</p> : null}

        <form className="booking-form" onSubmit={onSubmit}>
          <section className="booking-card">
            <h2>Your details</h2>
            <div className="booking-grid">
              <label className="booking-field">
                Full name *
                <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </label>
              <label className="booking-field">
                Phone *
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
              </label>
              <label className="booking-field">
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
              </label>
              <label className="booking-field booking-field--full">
                Pickup / delivery address
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
              </label>
              <label className="booking-field booking-field--full">
                Order instructions (gate codes, detergents, hang dry…)
                <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} />
              </label>
              <label className="booking-field booking-field--full">
                Customer notes (optional)
                <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={2} />
              </label>
            </div>
          </section>

          <section className="booking-card">
            <div className="booking-card__head">
              <h2>Items</h2>
              <button type="button" className="secondary-button booking-add-line" onClick={addLine}>
                <Plus size={18} /> Add line
              </button>
            </div>

            <div className="booking-lines">
              {lines.map((line, index) => {
                const st = serviceTypes.find((s) => s.id === line.service_type)
                const isKg = st?.pricing_unit === 'kg'
                return (
                  <div key={index} className="booking-line">
                    <label className="booking-field">
                      Service
                      <select
                        value={line.service_type === '' ? '' : String(line.service_type)}
                        onChange={(e) => {
                          const v = e.target.value
                          updateLine(index, {
                            service_type: v === '' ? '' : Number(v),
                          })
                        }}
                      >
                        <option value="">Select…</option>
                        {serviceTypes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (${s.base_price} / {s.pricing_unit === 'kg' ? 'lb' : 'item'})
                          </option>
                        ))}
                      </select>
                    </label>
                    {isKg ? (
                      <label className="booking-field">
                        Weight (lb) *
                        <input
                          inputMode="decimal"
                          value={line.weight_kg}
                          onChange={(e) => updateLine(index, { weight_kg: e.target.value })}
                          placeholder="e.g. 12"
                        />
                      </label>
                    ) : (
                      <label className="booking-field">
                        Quantity *
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 1 })}
                        />
                      </label>
                    )}
                    <div className="booking-line__actions">
                      <button
                        type="button"
                        className="icon-button booking-line-remove"
                        aria-label="Remove line"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 1}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {submitError ? <p className="booking-banner booking-banner--error">{submitError}</p> : null}

          <div className="booking-actions">
            <button type="submit" className="primary-button" disabled={submitting || !!loadError}>
              {submitting ? 'Submitting…' : 'Place order'}
            </button>
          </div>
        </form>
      </main>
      <footer className="site-footer">
        <div className="shell site-footer__inner">
          <span className="brand">FreshFold</span>
          <p>© 2026 Fresh-Fold Laundry Management. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
