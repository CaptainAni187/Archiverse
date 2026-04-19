import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import Product from './pages/Product'
import Checkout from './pages/Checkout'
import Admin from './pages/Admin'
import AdminLogin from './pages/AdminLogin'
import About from './pages/About'
import Contact from './pages/Contact'
import Policies from './pages/Policies'
import OrderConfirmation from './pages/OrderConfirmation'
import { OrderProvider } from './state/OrderContext'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <OrderProvider>
        <div className="app-shell">
          <header className="topbar">
            <div className="brand-block">
              <p className="brand-kicker">Curated Fine Art</p>
              <h1>Archiverse</h1>
            </div>
            <nav>
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'active-nav' : '')}>
                Home
              </NavLink>
              <NavLink
                to="/gallery"
                className={({ isActive }) => (isActive ? 'active-nav' : '')}
              >
                Gallery
              </NavLink>
              <NavLink
                to="/about"
                className={({ isActive }) => (isActive ? 'active-nav' : '')}
              >
                About
              </NavLink>
              <NavLink
                to="/contact"
                className={({ isActive }) => (isActive ? 'active-nav' : '')}
              >
                Contact
              </NavLink>
              <NavLink
                to="/policies"
                className={({ isActive }) => (isActive ? 'active-nav' : '')}
              >
                Policies
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) => (isActive ? 'active-nav' : '')}
              >
                Admin
              </NavLink>
            </nav>
          </header>

          <main className="page-wrap">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/product/:id" element={<Product />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/confirmation" element={<OrderConfirmation />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </OrderProvider>
    </BrowserRouter>
  )
}

export default App
