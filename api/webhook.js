const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Required by Vercel to read the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw body buffer
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const rawBody = await buffer(req);
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      console.warn("Missing signature or webhook secret");
      return res.status(400).json({ error: 'Missing signature or secret configuration' });
    }

    // Verify exactly matching the Razorpay spec
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody.toString('utf8'))
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn("Invalid signature mismatch");
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const body = JSON.parse(rawBody.toString('utf8'));

    // Process successful payments
    if (body.event === 'payment.captured' || body.event === 'order.paid') {
      const payment = body.payload.payment.entity;
      
      // Extract the hidden notes we attached in checkout.html
      const notes = payment.notes || {};
      const userEmail = notes.email || payment.email;
      const userPhone = notes.phone || payment.contact;

      if (!userEmail) {
        console.error("No email provided in the webhook payload");
        return res.status(400).json({ error: 'No email found in payment' });
      }

      // Initialize Supabase using the Service Role Key (Admin privileges)
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Upsert the user into the database
      const { error } = await supabase
        .from('enrolled_users')
        .upsert([{
          full_name: notes.fullName || "Student",
          email: userEmail.toLowerCase().trim(),
          phone: userPhone || null,
          razorpay_payment_id: payment.id,
          enrolled_at: new Date().toISOString(),
        }], { onConflict: "email" });

      if (error) {
        console.error("Supabase insert error:", error);
        return res.status(500).json({ error: 'Database error while enrolling student' });
      }

      // Automatically handle scarcity seats updates
      try {
        const { data: scarcity } = await supabase.from('course_settings').select('*').eq('id', 1).single();
        if (scarcity && typeof scarcity.seats_left === 'number') {
          let newSeats = scarcity.seats_left - 1;
          if (newSeats <= 0) newSeats = 15; // Auto-reset loop
          await supabase.from('course_settings').update({ seats_left: newSeats }).eq('id', 1);
        }
      } catch (e) {
        console.error("Scarcity sync failed:", e);
      }

      console.log(`Successfully enrolled student via Webhook: ${userEmail}`);
      return res.status(200).json({ status: 'ok', message: 'Student enrolled' });
    }

    // Always acknowledge other valid webhook events with 200 OK
    return res.status(200).json({ status: 'ignored' });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
