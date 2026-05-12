# Optional Skill: Payments (Stripe)

## Activate when
Spec mentions: payment, checkout, purchase, subscription, billing, invoice

## Stack Addition
  npm install stripe @stripe/stripe-js

## New Env Vars Required
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

## New API Routes Required
  POST /api/stripe/checkout   ← create Stripe checkout session
  POST /api/stripe/webhook    ← handle Stripe webhook events

## Checkout Route Pattern
  ```typescript
  import Stripe from 'stripe'
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  export async function POST(request: Request) {
    const { items, userId } = await request.json()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
      metadata: { userId }
    })
    return Response.json({ data: { url: session.url }, error: null })
  }
  ```

## Webhook Route Pattern
  ```typescript
  export async function POST(request: Request) {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!
    const event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    )
    switch (event.type) {
      case 'checkout.session.completed':
        // create order in Supabase
        // update stock
        break
    }
    return Response.json({ received: true })
  }
  ```

## Webhook Events to Handle
  checkout.session.completed → create order record, update stock
  payment_intent.payment_failed → notify user

## Security Rules
  ✅ Always verify webhook signature (constructEvent)
  ✅ Never expose STRIPE_SECRET_KEY client-side
  ✅ Use test keys (sk_test_) during development
  ✅ Always confirm payment server-side before fulfilling order

## Database Additions
  Add to orders table:
    stripe_session_id  text
    stripe_payment_id  text
    payment_status     text DEFAULT 'pending'
