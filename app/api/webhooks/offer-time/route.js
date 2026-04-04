import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

var twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

var TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
var BUSINESS_NAME = 'PipeCall Plumbing';

export async function POST(request) {
  try {
    var body = await request.json();
    var leadId = body.leadId;
    var proposedDay = body.proposedDay;
    var proposedTime = body.proposedTime;

    if (!leadId || !proposedDay || !proposedTime) {
      return new Response('Missing fields', { status: 400 });
    }

    var { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return new Response('Lead not found', { status: 404 });
    }

    var offerText = proposedDay + ' ' + proposedTime;

    await supabase
      .from('leads')
      .update({
        status: 'offer_sent',
        offered_time: offerText,
      })
      .eq('id', leadId);

    var smsBody = 'Hi ' + (lead.customer_name || 'there') + '! ' +
      BUSINESS_NAME + ' can come ' + offerText + '. ' +
      'Does that work? Reply YES to confirm or call us to discuss.';

    var message = await twilioClient.messages.create({
      body: smsBody,
      from: TWILIO_PHONE,
      to: lead.caller_phone,
    });

    await supabase.from('notification_logs').insert({
      lead_id: leadId,
      recipient_phone: lead.caller_phone,
      direction: 'outbound',
      message_type: 'offer_time',
      message_body: smsBody,
      twilio_sid: message.sid,
      status: 'sent',
    });

    await supabase.from('events').insert({
      lead_id: leadId,
      event_type: 'offer_sent',
      event_data: { proposed_day: proposedDay, proposed_time: proposedTime },
    });

    return new Response('OK — offer sent', { status: 200 });
  } catch (error) {
    console.error('Offer time error:', error);
    return new Response('Server error', { status: 500 });
  }
}

export async function GET() {
  return new Response('Offer time webhook is active', { status: 200 });
}