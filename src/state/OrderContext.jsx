import { useMemo, useState } from 'react'
import { OrderContext } from './orderContextStore'

export function OrderProvider({ children }) {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [orderDetails, setOrderDetails] = useState(null)
  const [orderConfirmation, setOrderConfirmation] = useState(null)

  const value = useMemo(
    () => ({
      selectedProduct,
      setSelectedProduct,
      selectedPurchase,
      setSelectedPurchase,
      orderDetails,
      setOrderDetails,
      orderConfirmation,
      setOrderConfirmation,
    }),
    [selectedProduct, selectedPurchase, orderDetails, orderConfirmation],
  )

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
}
