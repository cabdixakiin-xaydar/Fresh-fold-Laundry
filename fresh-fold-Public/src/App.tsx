import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import BookingPage from './pages/BookingPage'
import LandingPage from './pages/LandingPage'
import TrackOrderPage from './pages/TrackOrderPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/track/:orderNumber" element={<TrackOrderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
