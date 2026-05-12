# Optional Skill: Email (Resend)

## Activate when
Spec mentions: email, confirmation, welcome email, notification,
invite, password reset, receipt, digest

## Stack Addition
  npm install resend

## New Env Vars
  RESEND_API_KEY=re_...

## Email Route Pattern
  ```typescript
  // /src/app/api/email/send/route.ts
  import { Resend } from 'resend'
  const resend = new Resend(process.env.RESEND_API_KEY)

  export async function POST(request: Request) {
    const { to, subject, html } = await request.json()
    const { data, error } = await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to,
      subject,
      html
    })
    if (error) return Response.json({ data: null, error }, { status: 500 })
    return Response.json({ data, error: null })
  }
  ```

## Email Templates
  Create /src/lib/email/templates/ for each email type:
  - welcome.ts
  - order-confirmation.ts
  - password-reset.ts

## Rules
  ✅ Send emails from API routes only (server-side)
  ✅ Never send emails from client components
  ✅ Always handle send failures gracefully (don't crash the request)
  ✅ Include plain text fallback
  ❌ Never expose RESEND_API_KEY client-side
