import usePageMeta from '../hooks/usePageMeta'

function Policies() {
  usePageMeta({
    title: 'Policies | Archiverse',
    description:
      'Read Archiverse payment, shipping, and refund policies before placing an order.',
  })

  return (
    <section className="info-page">
      <h2 className="section-title">Policies</h2>

      <h3>Payment Policy</h3>
      <p>
        Orders are confirmed with a 50% advance payment. The remaining 50% is
        payable on delivery.
      </p>

      <h3>Shipping Timeline</h3>
      <p>
        Standard dispatch is within 4-7 business days after advance payment
        confirmation. Delivery timelines vary by destination.
      </p>

      <h3>Refund Rules</h3>
      <p>
        Advance payments are refundable only if the order is cancelled before
        dispatch. After dispatch, refund eligibility depends on damage or
        fulfilment issues verified by support.
      </p>
    </section>
  )
}

export default Policies
