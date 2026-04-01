
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

var twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

var TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
var PLUMBER_PHONE = process.env.PLUMBER_PHONE || '+971547674577';
var SITE_URL = 'https://pipe-call.vercel.app';
var BUSINESS_NAME = 'PipeCall Plumbing';

async function rule1ThirtyMinReminder() {
  var thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  var { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'notified')
    .lt('plumber_notified_at', thirtyMinAgo)
    .is('reminder_sent_at', null);

  if (!leads || leads.length === 0) return 0;

  var count = 0;
  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i];
    var leadLink = SITE_URL + '/lead/' + lead.id;

    await twilioClient.messages.create({
      body: 'REMINDER: You have an unanswered lead from ' +
        (lead.customer_name || 'a customer') + ' — ' +
        (lead.issue_type || 'unknown issue') + '.\n' +
        'Tap to respond: ' + leadLink,
      from: TWILIO_PHONE,
      to: PLUMBER_PHONE,
    });

    await supabase
      .from('leads')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', lead.id);

    await supabase.from('events').insert({
      lead_id: lead.id,
      event_type: 'reminder_sent',
      event_data: { rule: '30_min_reminder' },
    });

    count++;
  }
  return count;
}

async function rule2TwoHourReassurance() {
  var twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  var { data: leads } = await supabase
    .from('leads')
    .select('*')
    .in('status', ['new', 'notified'])
    .lt('created_at', twoHoursAgo)
    .is('customer_reassured_at', null);

  if (!leads || leads.length === 0) return 0;

  var count = 0;
  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i];

    if (lead.sms_suppressed) continue;

    await twilioClient.messages.create({
      body: 'Hi ' + (lead.customer_name || 'there') +
        '! ' + BUSINESS_NAME + ' here. We have not forgotten about you — ' +
        'your request is in our queue and we will get back to you soon.',
      from: TWILIO_PHONE,
      to: lead.caller_phone,
    });

    await supabase
      .from('leads')
      .update({ customer_reassured_at: new Date().toISOString() })
      .eq('id', lead.id);

    await supabase.from('events').insert({
      lead_id: lead.id,
      event_type: 'customer_reassured',
      event_data: { rule: '2_hour_reassurance' },
    });

    count++;
  }
  return count;
}

async function rule3EndOfDayCleanup() {
  var now = new Date();
  var hour = parseInt(now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    timeZone: 'America/New_York'
  }));

  if (hour !== 18) return 0;

  var { data: leads } = await supabase
    .from('leads')
    .select('*')
    .in('status', ['new', 'notified']);

  if (!leads || leads.length === 0) return 0;

  var count = 0;
  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i];

    await supabase
      .from('leads')
      .update({ status: 'missed' })
      .eq('id', lead.id);

    if (!lead.sms_suppressed) {
      await twilioClient.messages.create({
        body: 'Hi ' + (lead.customer_name || 'there') +
          ', we are sorry we could not get back to you today. ' +
          'We will reach out first thing tomorrow morning. — ' + BUSINESS_NAME,
        from: TWILIO_PHONE,
        to: lead.caller_phone,
      });
    }

    await supabase.from('events').insert({
      lead_id: lead.id,
      event_type: 'end_of_day_missed',
      event_data: { rule: 'end_of_day_cleanup' },
    });

    count++;
  }

  if (count > 0) {
    await twilioClient.messages.create({
      body: 'End of day summary: ' + count + ' lead(s) went unanswered today. ' +
        'Check your inbox: ' + SITE_URL + '/leads',
      from: TWILIO_PHONE,
      to: PLUMBER_PHONE,
    });
  }

  return count;
}

async function rule4FormAbandonment() {
  var tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  var { data: events } = await supabase
    .from('events')
    .select('lead_id')
    .eq('event_type', 'intake_started')
    .lt('created_at', tenMinAgo);

  if (!events || events.length === 0) return 0;

  var count = 0;
  for (var i = 0; i < events.length; i++) {
    var leadId = events[i].lead_id;

    var { data: completed } = await supabase
      .from('events')
      .select('id')
      .eq('lead_id', leadId)
      .eq('event_type', 'intake_completed');

    if (completed && completed.length > 0) continue;

    var { data: alreadySent } = await supabase
      .from('events')
      .select('id')
      .eq('lead_id', leadId)
      .eq('event_type', 'form_abandoned');

    if (alreadySent && alreadySent.length > 0) continue;

    var { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead || lead.sms_suppressed) continue;

    await twilioClient.messages.create({
      body: 'Hi! Looks like you did not finish telling us about your plumbing issue. ' +
        'No worries — just reply to this text with what you need and we will take care of it!',
      from: TWILIO_PHONE,
      to: lead.caller_phone,
    });

    await supabase.from('events').insert({
      lead_id: leadId,
      event_type: 'form_abandoned',
      event_data: { rule: 'form_abandonment_followup' },
    });

    count++;
  }
  return count;
}

async function rule5RepeatCaller() {
  var oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  var { data: recentLeads } = await supabase
    .from('leads')
    .select('caller_phone')
    .gte('created_at', oneHourAgo);

  if (!recentLeads || recentLeads.length === 0) return 0;

  var phoneCounts = {};
  for (var i = 0; i < recentLeads.length; i++) {
    var phone = recentLeads[i].caller_phone;
    phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;
  }

  var count = 0;
  var phones = Object.keys(phoneCounts);
  for (var j = 0; j < phones.length; j++) {
    var callerPhone = phones[j];
    var callCount = phoneCounts[callerPhone];

    if (callCount === 2) {
      await twilioClient.messages.create({
        body: 'We see you tried calling again — we are working on getting back to you! ' +
          'Your request is a priority. — ' + BUSINESS_NAME,
        from: TWILIO_PHONE,
        to: callerPhone,
      });
      count++;
    } else if (callCount >= 3) {
      await twilioClient.messages.create({
        body: 'We are so sorry for the wait. ' +
          'Your request has been escalated and someone will reach out to you very shortly. — ' + BUSINESS_NAME,
        from: TWILIO_PHONE,
        to: callerPhone,
      });

      await supabase
        .from('leads')
        .update({ is_emergency: true })
        .eq('caller_phone', callerPhone)
        .gte('created_at', oneHourAgo);

      count++;
    }
  }
  return count;
}

export async function GET() {
  try {
    var results = {
      reminders: await rule1ThirtyMinReminder(),
      reassurances: await rule2TwoHourReassurance(),
      endOfDay: await rule3EndOfDayCleanup(),
      abandonments: await rule4FormAbandonment(),
      repeatCallers: await rule5RepeatCaller(),
    };

    console.log('Cron results:', JSON.stringify(results));

    return new Response(JSON.stringify({
      success: true,
      results: results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cron error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}