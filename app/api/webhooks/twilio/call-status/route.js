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
var SITE_URL = 'https://wekatch.com';
var BUSINESS_NAME = 'WeKatch';

export async function POST(request) {
  try {
    var formData = await request.formData();
    var callStatus = formData.get('CallStatus');
    var callerPhone = formData.get('From');

    console.log('Call status received: ' + callStatus + ' from ' + callerPhone);

    if (callStatus !== 'no-answer' && callStatus !== 'busy') {
      return new Response('OK — not a missed call', { status: 200 });
    }

    var twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    var { data: recentLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('caller_phone', callerPhone)
      .gte('created_at', twoMinutesAgo);

    if (recentLeads && recentLeads.length > 0) {
      console.log('Duplicate call from ' + callerPhone + ' — skipping SMS');
      return new Response('OK — duplicate suppressed', { status: 200 });
    }

    var { data: previousLeads } = await supabase
      .from('leads')
      .select('id, customer_name')
      .eq('caller_phone', callerPhone)
      .order('created_at', { ascending: false })
      .limit(5);

    var isRepeat = previousLeads && previousLeads.length > 0;
    var previousName = isRepeat ? previousLeads[0].customer_name : null;

    var { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        caller_phone: callerPhone,
        status: 'new',
        is_repeat_customer: isRepeat,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Failed to create lead:', leadError);
      return new Response('Error creating lead', { status: 500 });
    }

    console.log('Lead created: ' + lead.id);

    await supabase.from('events').insert({
      lead_id: lead.id,
      event_type: 'missed_call',
      event_data: {
        call_status: callStatus,
        caller_phone: callerPhone,
        is_repeat: isRepeat,
      },
    });

    var intakeLink = SITE_URL + '/intake/' + lead.id;
    var smsBody = '';

    if (isRepeat && previousName) {
      smsBody = 'Hi ' + previousName + '! Thanks for calling ' + BUSINESS_NAME +
        ' again. We are on a job right now. Tap here to tell us what you need: ' + intakeLink;
    } else {
      smsBody = 'Hi! Thanks for calling ' + BUSINESS_NAME +
        '. We are on a job right now. Tap here to tell us what you need: ' + intakeLink;
    }

    var message = await twilioClient.messages.create({
      body: smsBody,
      from: TWILIO_PHONE,
      to: callerPhone,
    });

    console.log('SMS sent: ' + message.sid);

    await supabase.from('notification_logs').insert({
      lead_id: lead.id,
      recipient_phone: callerPhone,
      direction: 'outbound',
      message_type: 'initial_sms',
      message_body: smsBody,
      twilio_sid: message.sid,
      status: 'sent',
    });

    await supabase.from('events').insert({
      lead_id: lead.id,
      event_type: 'sms_sent',
      event_data: { message_sid: message.sid, sms_type: 'initial_sms', is_repeat: isRepeat },
    });

    return new Response('OK — SMS sent', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Server error', { status: 500 });
  }
}

export async function GET() {
  return new Response('Twilio call-status webhook is active', { status: 200 });
}