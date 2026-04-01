import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const SITE_URL = 'https://pipe-call.vercel.app';

const BUSINESS_NAME = 'PipeCall Plumbing';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const callStatus = formData.get('CallStatus');
    const callerPhone = formData.get('From');

    console.log(`Call status received: ${callStatus} from ${callerPhone}`);

    if (callStatus !== 'no-answer' && callStatus !== 'busy') {
      return new Response('OK — not a missed call', { status: 200 });
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('caller_phone', callerPhone)
      .gte('created_at', twoMinutesAgo);

    if (recentLeads && recentLeads.length > 0) {
      console.log(`Duplicate call from ${callerPhone} — skipping SMS`);
      return new Response('OK — duplicate suppressed', { status: 200 });
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        caller_phone: callerPhone,
        status: 'new',
      })
      .select()
      .single();

    if (leadError) {
      console.error('Failed to create lead:', leadError);
      return new Response('Error creating lead', { status: 500 });
    }

    console.log(`Lead created: ${lead.id}`);

    await supabase.from('events').insert({
      lead_id: lead.id,
      event_type: 'missed_call',
      event_data: { call_status: callStatus, caller_phone: callerPhone },
    });

    const intakeLink = `${SITE_URL}/intake/${lead.id}`;
    const smsBody = `Hi! Thanks for calling ${BUSINESS_NAME}. We're on a job right now. Tap here to tell us what you need: ${intakeLink}`;

    const message = await twilioClient.messages.create({
      body: smsBody,
      from: TWILIO_PHONE,
      to: callerPhone,
    });

    console.log(`SMS sent: ${message.sid}`);

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
      event_data: { message_sid: message.sid, sms_type: 'initial_sms' },
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