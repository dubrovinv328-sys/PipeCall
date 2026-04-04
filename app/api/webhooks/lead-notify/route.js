import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const SITE_URL = 'https://pipe-call.vercel.app';
const PLUMBER_PHONE = process.env.PLUMBER_PHONE || '971547674577';

const EMERGENCY_KEYWORDS = [
  'flood', 'flooding', 'burst', 'sewage',
  'gas smell', 'gas leak', 'no water', 'overflow', 'emergency'
];

function isEmergency(description, issueType) {
  const text = (description || '') + ' ' + (issueType || '');
  return EMERGENCY_KEYWORDS.some(function(keyword) {
    return text.toLowerCase().includes(keyword);
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const leadId = body.leadId;

    if (!leadId) {
      return new Response('Missing leadId', { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return new Response('Lead not found', { status: 404 });
    }

    if (!lead.issue_type || !lead.customer_name) {
      return new Response('Lead not ready', { status: 200 });
    }

    const { data: photos } = await supabase
      .from('attachments')
      .select('id')
      .eq('lead_id', leadId);

    const hasPhotos = photos && photos.length > 0;
    const leadLink = SITE_URL + '/lead/' + leadId;
    const emergency = isEmergency(lead.description, lead.issue_type);

    var smsBody = '';

    if (emergency) {
      smsBody = 'EMERGENCY LEAD\n\n' +
        lead.customer_name + '\n' +
        'Issue: ' + lead.issue_type + '\n' +
        (lead.description ? 'Details: ' + lead.description + '\n' : '') +
        'Time: ' + (lead.preferred_time || 'ASAP') + '\n' +
        (hasPhotos ? 'Photos attached\n' : '') +
        '\nTap to respond: ' + leadLink;
    } else {
      smsBody = 'New Lead\n\n' +
        lead.customer_name + '\n' +
        'Issue: ' + lead.issue_type + '\n' +
        (lead.description ? 'Details: ' + lead.description + '\n' : '') +
        'Time: ' + (lead.preferred_time || 'Not specified') + '\n' +
        (hasPhotos ? 'Photos attached\n' : '') +
        '\nTap to respond: ' + leadLink;
    }

    const message = await twilioClient.messages.create({
      body: smsBody,
      from: TWILIO_PHONE,
      to: PLUMBER_PHONE,
    });

    await supabase
      .from('leads')
      .update({
        status: 'notified',
        is_emergency: emergency,
        plumber_notified_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    await supabase.from('notification_logs').insert({
      lead_id: leadId,
      recipient_phone: PLUMBER_PHONE,
      direction: 'outbound',
      message_type: emergency ? 'emergency_notification' : 'plumber_notification',
      message_body: smsBody,
      twilio_sid: message.sid,
      status: 'sent',
    });

    await supabase.from('events').insert({
      lead_id: leadId,
      event_type: 'plumber_notified',
      event_data: { message_sid: message.sid, is_emergency: emergency },
    });

    return new Response('OK — plumber notified', { status: 200 });
  } catch (error) {
    console.error('Notification error:', error);
    return new Response('Server error', { status: 500 });
  }
}

export async function GET() {
  return new Response('Lead notification webhook is active', { status: 200 });
}