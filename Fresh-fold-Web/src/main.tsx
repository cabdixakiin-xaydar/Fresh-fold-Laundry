import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { HomeRedirect } from './auth/HomeRedirect'
import { RequireAuth } from './auth/RequireAuth'
import { RoleGate } from './auth/RoleGate'
import { AuthenticatedLayout } from './layout/AuthenticatedLayout'
import { AuthPage } from './pages/AuthPage'
import { BillingPage } from './pages/BillingPage'
import { CreateOrderPage } from './pages/CreateOrderPage'
import { CustomerProfilePage } from './pages/CustomerProfilePage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { ReportsPage } from './pages/ReportsPage'
import { UsersPage } from './pages/UsersPage'
import './index.css'

const router = createBrowserRouter([
  { path: '/auth', element: <AuthPage /> },
  { path: '/login', element: <Navigate to="/auth" replace /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <RoleGate>
          <AuthenticatedLayout />
        </RoleGate>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'profile', element: <CustomerProfilePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/new', element: <CreateOrderPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
