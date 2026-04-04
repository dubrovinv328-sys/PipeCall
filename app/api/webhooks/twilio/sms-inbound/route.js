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
const PLUMBER_PHONE = process.env.PLUMBER_PHONE || '+10000000000';
const SITE_URL = 'https://pipe-call.vercel.app';
const BUSINESS_NAME = 'PipeCall Plumbing';

export async function POST(request) {
  try {
    var formData = await request.formData();
    var fromPhone = formData.get('From');
    var messageBody = (formData.get('Body') || '').trim();
    var upperBody = messageBody.toUpperCase();

    console.log('Inbound SMS from ' + fromPhone + ': ' + messageBody);

    // --- HANDLE STOP ---
    if (upperBody === 'STOP' || upperBody === 'UNSUBSCRIBE') {
      await supabase
        .from('leads')
        .update({ sms_suppressed: true })
        .eq('caller_phone', fromPhone);

      await supabase.from('notification_logs').insert({
        recipient_phone: fromPhone,
        direction: 'inbound',
        message_type: 'stop_request',
        message_body: messageBody,
        status: 'received',
      });

      console.log('STOP received from ' + fromPhone);
      return new Response(
        '<Response><Message>You have been unsubscribed. You will not receive further messages.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // --- HANDLE URGENT ---
    if (upperBody === 'URGENT' || upperBody === 'EMERGENCY') {
      var { data: urgentLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('caller_phone', fromPhone)
        .order('created_at', { ascending: false })
        .limit(1);

      if (urgentLeads && urgentLeads.length > 0) {
        var urgentLead = urgentLeads[0];

        await supabase
          .from('leads')
          .update({ is_emergency: true, status: 'intake_completed' })
          .eq('id', urgentLead.id);

        var urgentLink = SITE_URL + '/lead/' + urgentLead.id;
        await twilioClient.messages.create({
          body: 'EMERGENCY LEAD\n\n' +
            (urgentLead.customer_name || 'Unknown') + '\n' +
            'Phone: ' + fromPhone + '\n' +
            'Customer marked as URGENT\n' +
            '\nTap to respond: ' + urgentLink,
          from: TWILIO_PHONE,
          to: PLUMBER_PHONE,
        });

        await supabase.from('events').insert({
          lead_id: urgentLead.id,
          event_type: 'escalated',
          event_data: { reason: 'customer_replied_urgent' },
        });
      }

      await supabase.from('notification_logs').insert({
        recipient_phone: fromPhone,
        direction: 'inbound',
        message_type: 'urgent_reply',
        message_body: messageBody,
        status: 'received',
      });

      return new Response(
        '<Response><Message>We have marked your request as urgent. Someone will contact you very soon.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // --- HANDLE YES (to Offer Time) ---
    if (upperBody === 'YES' || upperBody === 'CONFIRM' || upperBody === 'Y') {
      var { data: yesLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('caller_phone', fromPhone)
        .eq('status', 'offer_sent')
        .order('created_at', { ascending: false })
        .limit(1);

      if (yesLeads && yesLeads.length > 0) {
        var yesLead = yesLeads[0];

        await supabase
          .from('leads')
          .update({
            status: 'booked',
            booked_at: new Date().toISOString(),
          })
          .eq('id', yesLead.id);

        await twilioClient.messages.create({
          body: 'BOOKED: ' + (yesLead.customer_name || 'Customer') +
            ' confirmed the proposed time.\n' +
            'Phone: ' + fromPhone + '\n' +
            'Tap for details: ' + SITE_URL + '/lead/' + yesLead.id,
          from: TWILIO_PHONE,
          to: PLUMBER_PHONE,
        });

        await supabase.from('events').insert({
          lead_id: yesLead.id,
          event_type: 'customer_replied',
          event_data: { reply: 'yes', action: 'booked' },
        });
      }

      await supabase.from('notification_logs').insert({
        recipient_phone: fromPhone,
        direction: 'inbound',
        message_type: 'yes_reply',
        message_body: messageBody,
        status: 'received',
      });

      return new Response(
        '<Response><Message>Your appointment is confirmed! We look forward to helping you.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // --- HANDLE FREE TEXT (create lead from SMS) ---
    var { data: newLead, error: newLeadError } = await supabase
      .from('leads')
      .insert({
        caller_phone: fromPhone,
        description: messageBody,
        status: 'intake_completed',
      })
      .select()
      .single();

    if (!newLeadError && newLead) {
      var freeLink = SITE_URL + '/lead/' + newLead.id;
      await twilioClient.messages.create({
        body: 'New Lead (via text)\n\n' +
          'Phone: ' + fromPhone + '\n' +
          'Message: ' + messageBody + '\n' +
          '\nTap to respond: ' + freeLink,
        from: TWILIO_PHONE,
        to: PLUMBER_PHONE,
      });

      await supabase.from('events').insert({
        lead_id: newLead.id,
        event_type: 'sms_lead_created',
        event_data: { message: messageBody },
      });
    }

    await supabase.from('notification_logs').insert({
      recipient_phone: fromPhone,
      direction: 'inbound',
      message_type: 'customer_reply',
      message_body: messageBody,
      status: 'received',
    });

    return new Response(
      '<Response><Message>Thanks for reaching out! ' + BUSINESS_NAME + ' will get back to you shortly.</Message></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (error) {
    console.error('Inbound SMS error:', error);
    return new Response(
      '<Response><Message>Something went wrong. Please call us directly.</Message></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  }
}

export async function GET() {
  return new Response('Inbound SMS webhook is active', { status: 200 });
}