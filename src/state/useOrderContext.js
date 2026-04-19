import { useContext } from 'react'
import { OrderContext } from './orderContextStore'

export function useOrderContext() {
  const context = useContext(OrderContext)

  if (!context) {
    throw new Error('useOrderContext must be used inside OrderProvider')
  }

  return context
}
