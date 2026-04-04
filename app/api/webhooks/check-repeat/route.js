import { createClient } from '@supabase/supabase-js';

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    var body = await request.json();
    var callerPhone = body.callerPhone;

    if (!callerPhone) {
      return new Response(JSON.stringify({ repeat: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    var { data: previousLeads } = await supabase
      .from('leads')
      .select('id, customer_name, customer_email, customer_address, caller_phone, issue_type')
      .eq('caller_phone', callerPhone)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!previousLeads || previousLeads.length <= 1) {
      return new Response(JSON.stringify({
        repeat: false,
        previousLeads: [],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    var lastLead = previousLeads[1];

    return new Response(JSON.stringify({
      repeat: true,
      callCount: previousLeads.length,
      previousCustomer: {
        name: lastLead.customer_name || null,
        email: lastLead.customer_email || null,
        address: lastLead.customer_address || null,
        phone: lastLead.caller_phone || null,
        lastIssue: lastLead.issue_type || null,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Check repeat error:', error);
    return new Response(JSON.stringify({ repeat: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET() {
  return new Response('Check repeat customer endpoint is active', { status: 200 });
}