# Fresh-Fold Backend — Workflow & Project Map

This document records **what was built**, **why each part exists**, and **what lives in each folder** for the **Fresh-fold-Backend** Django project. It is aligned with the **Laundry Documentation** PDF (customer, order, billing, inventory, employees, pickup/delivery, reporting, auth, dashboard) and the **Fresh-fold Laundry-FRONT** HTML prototypes (directory, order hub, billing, inventory, delivery, executive dashboard, login).

---

## 1. High-level goals

1. **Automate laundry operations** in one API: customers, orders, money, stock, staff, logistics, and summary analytics.
2. **Use Django** for application logic and **MySQL** as the production database, with a **local SQLite** option so development works without MySQL running.
3. **Expose a REST API** (`/api/v1/`) so the existing or future frontend can consume JSON instead of hard-coded HTML data.
4. **Separate concerns by Django app** so each feature area can evolve independently (orders vs billing vs inventory, etc.).

---

## 2. Root folder: `Fresh-fold-Backend/`

| Item | Purpose |
|------|---------|
| `manage.py` | Django’s CLI entry point (migrations, runserver, createsuperuser). |
| `requirements.txt` | Pinned-style dependency list: Django, DRF, CORS, dotenv, **PyMySQL** (reliable MySQL access on Windows without building **mysqlclient**). |
| `.env.example` | Template for `DEBUG`, `SECRET_KEY`, `ALLOWED_HOSTS`, and database variables. Copy to `.env` and adjust. **Why:** keep secrets out of `settings.py`. |
| `db.sqlite3` | Created when `DB_ENGINE` is not `mysql` (default local DB after `migrate`). |
| `venv/` | Local virtual environment (not committed to version control in typical setups). **Why:** isolate Python packages per project. |

**Note on environment:** An early automated setup attempt failed once on Windows (`WinError 32` during pip, then `startproject` conflicted with partial files). The project was completed in a follow-up run; if pip fails with file locks, close other processes using the venv or recreate `venv/`.

---

## 3. Project package: `config/`

Django project configuration (the “shell” that wires apps, database, middleware, and URL routing).

| File | What it contains | Why |
|------|------------------|-----|
| `settings.py` | `INSTALLED_APPS` (all feature apps + `rest_framework`, `corsheaders`, `authtoken`), `AUTH_USER_MODEL = 'accounts.User'`, database switch (`DB_ENGINE=mysql` uses PyMySQL shim + MySQL backend; else SQLite), `REST_FRAMEWORK` defaults (session + token auth, `IsAuthenticated`), CORS origins from env, `load_dotenv()`. | Central place for security and integration; MySQL vs SQLite keeps prod vs dev simple. |
| `urls.py` | Includes all apps under `api/v1/` (auth, customers, orders, billing, inventory, employees, logistics, analytics) plus `admin/`. | Single API prefix for the frontend and for documentation. |
| `wsgi.py` / `asgi.py` | Standard Django deployment hooks. | Needed for production servers (Gunicorn, Uvicorn, etc.). |

---

## 4. App: `accounts/` — Authentication, roles, staff users

**Why:** The documentation requires secure login and **role-based access** (administrator, cashier, worker; driver added for logistics).

| File / area | Contents |
|-------------|----------|
| `models.py` | Custom `User` extending `AbstractUser`: `role` (admin/cashier/worker/driver), `phone`. |
| `serializers.py` | `UserSerializer`, `RegisterSerializer`, `LoginSerializer` (validates credentials). |
| `views.py` | `RegisterView`, `LoginView` (returns **DRF Token**), `LogoutView` (deletes token), `CurrentUserView`, `UserViewSet` (staff listing; **admin-only**). |
| `urls.py` | Router: `users/`; paths: `register/`, `login/`, `logout/`, `me/`. Mounted at `api/v1/auth/`. |
| `admin.py` | Django admin for `User` with role/phone fields. |
| `migrations/` | Initial migration creating the custom user table. |

---

## 5. App: `customers/` — Customer directory & loyalty

**Why:** Doc §2: register/update customers, contact details, transaction history context, loyalty/discount hooks.

| File / area | Contents |
|-------------|----------|
| `models.py` | `Customer` (name, phone, email, address, loyalty_points, notes, preferences, timestamps). `LoyaltyTransaction` (audit trail of point changes). |
| `serializers.py` | List/detail serializers; detail includes recent loyalty transactions. |
| `views.py` | `CustomerViewSet` (CRUD); actions: `loyalty` history, `loyalty/adjust` POST. `LoyaltyTransactionViewSet` (read-only list). |
| `urls.py` | `customers/`, `loyalty-transactions/`. |
| `admin.py` | Admin for customers and loyalty rows. |
| `migrations/` | Tables for customers and loyalty. |

---

## 6. App: `orders/` — Order hub, service types, line items

**Why:** Doc §3–4: unique order id, multiple items, washing/dry cleaning/ironing, instructions, statuses (received → processing → ready → delivered), pricing by item or weight.

| File / area | Contents |
|-------------|----------|
| `models.py` | `ServiceType` (name, code, `base_price`, `pricing_unit` item vs kg, active). `Order` (auto `order_number` like `FF-YYYYMMDD-#####`, FK customer, status, instructions, express flag, subtotal/discount/tax/total, `created_by`). `OrderItem` (service, quantity, optional `weight_kg`, unit price, line total). |
| `services.py` | `compute_line_total`, `recalculate_order`, `create_order_item`, `apply_default_tax_from_active_rate` (keeps money logic out of views). |
| `serializers.py` | `ServiceTypeSerializer`, nested `OrderItemSerializer`, `OrderSerializer` (nested create for items; accepts service_type by id). |
| `views.py` | `ServiceTypeViewSet`, `OrderViewSet` (filters: `?status=`, `?customer=`; actions: `recalculate`, `recalculate-tax` using `billing.TaxRate`, `status` PATCH), `OrderItemViewSet` (filter `?order=`). |
| `urls.py` | `service-types/`, `orders/`, `order-items/`. |
| `admin.py` | Service types; orders with inline line items. |
| `migrations/` | Service types, orders, order items. |

---

## 7. App: `billing/` — Tax, promos, invoices, payments

**Why:** Doc §4: invoices/receipts, discounts, taxes, promos, payment status (unpaid / partial / paid).

| File / area | Contents |
|-------------|----------|
| `models.py` | `TaxRate`, `PromoCode`, `Invoice` (one-to-one `Order`, auto `invoice_number`, mirrors subtotal/tax/discount/total, `refresh_payment_status`), `Payment` (FK invoice; on save/delete updates invoice paid totals and status). |
| `serializers.py` | CRUD serializers; `CreateInvoiceFromOrderSerializer` POST `order_id` (+ optional promo). |
| `views.py` | ViewSets for tax rates, promos, invoices, payments; `invoices/from-order/`; `ReceiptPdfPlaceholderView` returns 501 until a PDF library is added. |
| `urls.py` | Registers routers + `invoices/<id>/receipt.pdf`. |
| `admin.py` | Tax, promo, invoice (with payment inline), payment. |
| `migrations/` | All billing tables. |

---

## 8. App: `inventory/` — Supplies, suppliers, stock movements

**Why:** Doc §5: detergents/chemicals, low stock, suppliers.

| File / area | Contents |
|-------------|----------|
| `models.py` | `Supplier`, `InventoryItem` (sku, quantity, unit, `low_stock_threshold`, optional supplier), `StockMovement` (in/out/adjust, who/when). |
| `serializers.py` | Standard serializers; creating a movement updates item quantity. |
| `views.py` | `SupplierViewSet`, `InventoryItemViewSet`, action `items/low-stock/`, `StockMovementViewSet`. |
| `urls.py` | `suppliers/`, `items/`, `stock-movements/`. |
| `admin.py` | All three models. |
| `migrations/` | Supplier, item, movement (and FK from item to supplier). |

---

## 9. App: `employees/` — Staff profiles, attendance, shifts, tasks

**Why:** Doc §6: staff accounts, roles (linked via `accounts.User`), attendance, shifts, lightweight task/performance records.

| File / area | Contents |
|-------------|----------|
| `models.py` | `Employee` (one-to-one `User`, `employee_code`, department, hire_date, active), `Attendance` (unique per employee+day), `Shift`, `TaskRecord`. |
| `serializers.py` | Read serializer exposes username/role; write serializer uses `user` PK to link profiles. |
| `views.py` | ViewSets: employees, attendance, shifts, tasks. |
| `urls.py` | `employees/`, `attendance/`, `shifts/`, `tasks/`. |
| `admin.py` | Registers all models. |
| `migrations/` | Employee-related tables. |

---

## 10. App: `logistics/` — Pickup & delivery

**Why:** Doc §7: schedule pickups/deliveries, assign drivers, track status (route optimization left for future integration).

| File / area | Contents |
|-------------|----------|
| `models.py` | `PickupDelivery` (FK order, trip type pickup/delivery, scheduled time, address, driver FK to `User`, status, route notes). |
| `serializers.py` | Includes read-only `order_number`. |
| `views.py` | `PickupDeliveryViewSet` with filters `status`, `trip_type`, `driver`. |
| `urls.py` | `trips/`. |
| `admin.py` | Trip admin list. |
| `migrations/` | Trips table. |

---

## 11. App: `analytics/` — Dashboard & reports (read-only API)

**Why:** Doc §8 and §10: KPIs, sales over time, popular services, simple financial snapshot.

| File / area | Contents |
|-------------|----------|
| `views.py` | `DashboardView` (counts, paid revenue sum, customer count), `SalesReportView` (truncated date series on invoices), `ServicePopularityView` (aggregates `OrderItem` by service), `FinancialSummaryView` (paid vs outstanding invoice totals). |
| `urls.py` | `analytics/dashboard/`, `analytics/reports/sales/`, `.../services/`, `.../financial/`. |
| `models.py` | Empty (no DB tables; uses existing models). |
| `admin.py` / `tests.py` / `apps.py` | Default Django scaffolding. |

---

## 12. API layout summary (`/api/v1/`)

- **`auth/`** — register, login (token), logout, current user, admin user CRUD.
- **`customers/`**, **`loyalty-transactions/`** — directory + loyalty.
- **`service-types/`**, **`orders/`**, **`order-items/`** — catalog and order hub.
- **`tax-rates/`**, **`promo-codes/`**, **`invoices/`**, **`payments/`** — billing.
- **`suppliers/`**, **`items/`**, **`stock-movements/`** — inventory.
- **`employees/`**, **`attendance/`**, **`shifts/`**, **`tasks/`** — workforce.
- **`trips/`** — logistics.
- **`analytics/...`** — reporting endpoints.

**Default permission model:** most endpoints require **`Authorization: Token <key>`** after login; registration/login are open (`AllowAny`) for bootstrap—tighten for production if needed.

---

## 13. How this ties to the frontend prototypes

| Frontend area | Backend support |
|---------------|-----------------|
| Login / registration | `accounts` token auth |
| Customer directory | `customers` |
| Order hub / tracking | `orders` + statuses |
| Billing & invoices | `billing` |
| Inventory tracker | `inventory` |
| Delivery / logistics dashboard | `logistics` |
| Executive dashboard | `analytics` + `orders`/`billing` data |

---

## 14. Commands you will use repeatedly

```bash
# from Fresh-fold-Backend
.\venv\Scripts\activate          # Windows
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Set `.env` with `DB_ENGINE=mysql` and MySQL credentials when pointing at MySQL; otherwise SQLite is used automatically.

---

## 15. React + Vite frontend (`../Fresh-fold-Web`)

Sister app: **TypeScript**, **React 19**, **Vite 8**, **react-router-dom**. Dev server proxies **`/api`** → **`http://127.0.0.1:8000`** so the browser treats API calls as same-origin (no CORS friction locally).

| Area | Role |
|------|------|
| `src/api/` | `config`, `client` (token + `ApiError`), `types`, `services/*` — one module per backend domain. |
| `src/auth/` | `AuthContext` + `RequireAuth` — token in `localStorage`, `/login` gate. |
| `src/layout/` | `AppShell` — sidebar + `<Outlet />`. |
| `src/pages/` | Login, dashboard (analytics KPIs), customers (list + create), orders (list, detail, create with one line item). |
| `src/components/ui/` | Small reusable `Button`, `Input`, `Card`. |

**Seed data for orders UI:** from backend, `python manage.py seed_catalog` creates default **ServiceType** rows and a **TaxRate** (“Standard”).

**Run both locally:** terminal A — `python manage.py runserver` (Backend); terminal B — `cd Fresh-fold-Web && npm run dev` → open the URL Vite prints (usually `http://localhost:5173`).

**Executive dashboard UI:** Tailwind CSS, shadcn-style primitives (`src/components/ui`), Framer Motion, Recharts (revenue trend), TanStack Table (recent orders), Zustand (chart period), React Hook Form + Zod (login, customers, order create, dashboard search). Layout and KPI grid follow the in-repo Stitch-style reference `Fresh-fold Laundry-FRONT/executive_dashboard/code.html` (Google Stitch project assets are not publicly curl-able; design tokens align with that HTML + Fresh-Fold blues).

---

*End of workflow.md — update this file when you add features (e.g. PDF receipts, stricter RBAC, or expense tracking for true profit reports).*
