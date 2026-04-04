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
var SITE_URL = 'https://pipe-call.vercel.app';
var BUSINESS_NAME = 'PipeCall Plumbing';


function isAfterHours(businessHours, timezone) {
  try {
    var now = new Date();
    var options = { timeZone: timezone || 'America/New_York' };
    var localTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: options.timeZone });
    var localDay = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: options.timeZone }).toLowerCase();

    if (!businessHours || !businessHours[localDay]) {
      return false;
    }

    var dayHours = businessHours[localDay];

    if (dayHours.closed) {
      return true;
    }

    var currentMinutes = parseInt(localTime.split(':')[0]) * 60 + parseInt(localTime.split(':')[1]);
    var openParts = dayHours.open.split(':');
    var closeParts = dayHours.close.split(':');
    var openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
    var closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);

    if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    var body = await request.json();
    var callerPhone = body.callerPhone;
    var businessId = body.businessId;

    if (!callerPhone) {
      return new Response('Missing callerPhone', { status: 400 });
    }

    var businessHours = null;
    var timezone = 'America/New_York';

    if (businessId) {
      var { data: business } = await supabase
        .from('businesses')
        .select('business_hours, timezone')
        .eq('id', businessId)
        .single();

      if (business) {
        businessHours = business.business_hours;
        timezone = business.timezone || 'America/New_York';
      }
    }

    var afterHours = isAfterHours(businessHours, timezone);

    if (!afterHours) {
      return new Response('Not after hours', { status: 200 });
    }

    var { data: lead } = await supabase
      .from('leads')
      .insert({
        caller_phone: callerPhone,
        business_id: businessId || null,
        status: 'new',
      })
      .select()
      .single();

    var intakeLink = SITE_URL + '/intake/' + (lead ? lead.id : '');

    var smsBody = 'Hi! You reached ' + BUSINESS_NAME + ' after business hours. ' +
      'We will get back to you first thing in the morning! ' +
      'In the meantime, tap here to tell us what you need: ' + intakeLink;

    var message = await twilioClient.messages.create({
      body: smsBody,
      from: TWILIO_PHONE,
      to: callerPhone,
    });

    if (lead) {
      await supabase.from('notification_logs').insert({
        lead_id: lead.id,
        recipient_phone: callerPhone,
        direction: 'outbound',
        message_type: 'after_hours',
        message_body: smsBody,
        twilio_sid: message.sid,
        status: 'sent',
      });

      await supabase.from('events').insert({
        lead_id: lead.id,
        event_type: 'after_hours_sms_sent',
        event_data: { message_sid: message.sid },
      });
    }

    return new Response('OK — after hours SMS sent', { status: 200 });
  } catch (error) {
    console.error('After hours error:', error);
    return new Response('Server error', { status: 500 });
  }
}

export async function GET() {
  return new Response('After hours webhook is active', { status: 200 });
}