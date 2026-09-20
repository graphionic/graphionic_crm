import { requireActiveUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { WhatsappSettingsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function WhatsappSettingsPage() {
  await requireActiveUser();
  const s = await getSettings();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>WhatsApp Cloud API</h2>
          <p>Meta&apos;s official API. Configure once, then send from any lead page.</p>
        </div>
      </div>

      <div className="callout bad">
        <b>Two rules the system enforces for you — don&apos;t try to work around them.</b>
        <p style={{ margin: "8px 0 4px" }}>
          <b>1. Opt-in is mandatory.</b> Meta&apos;s Business Policy requires explicit,
          channel-specific consent naming your business and WhatsApp, recorded with a timestamp and
          source, collected <i>outside</i> WhatsApp. A phone number in a spreadsheet does not qualify.
          UK PECR also requires consent for direct marketing by message.
        </p>
        <p style={{ margin: 0 }}>
          <b>2. Cold WhatsApp will get you banned.</b> Block rates above ~2% trigger a quality
          downgrade, then rate limits, then permanent suspension — with no appeal on unofficial tools.
          So: <b>email and LinkedIn start the conversation. WhatsApp only replies to it.</b> The send
          button stays disabled until a lead has opt-in recorded.
        </p>
      </div>

      <WhatsappSettingsForm
        initial={{
          wa_enabled: s.wa_enabled || "false",
          wa_phone_number_id: s.wa_phone_number_id || "",
          wa_business_account_id: s.wa_business_account_id || "",
          wa_api_version: s.wa_api_version || "v21.0",
          wa_default_country_code: s.wa_default_country_code || "44",
          hasToken: Boolean(s.wa_access_token),
          hasAppSecret: Boolean(s.wa_app_secret),
          verifyToken: s.wa_verify_token || "",
        }}
      />

      <div className="card">
        <div className="card-head"><h3>Webhook — point Meta here</h3></div>
        <div className="card-body">
          <p className="small">
            In Meta → WhatsApp → Configuration → Webhook, set:
          </p>
          <pre className="pre">{`Callback URL   https://YOUR-DOMAIN/api/webhooks/whatsapp
Verify token   (the value you saved above)

Subscribe to these fields:
  messages        ← inbound replies (opens the 24h window)
  message_template_status_update`}</pre>
          <p className="small muted">
            When someone replies, the webhook matches the number to a lead, logs an inbound activity,
            marks the lead <b>REPLIED</b>, and records <code>lastInboundAt</code> — which is what opens
            the 24-hour free-form window. Until that happens, only approved templates can be sent.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Getting the credentials</h3></div>
        <div className="card-body">
          <ol className="small" style={{ paddingLeft: 20 }}>
            <li>Go to <b>developers.facebook.com</b> → My Apps → Create App → type <b>Business</b>.</li>
            <li>Add the <b>WhatsApp</b> product to the app.</li>
            <li>From <b>WhatsApp → API Setup</b>, copy the <b>Phone number ID</b> and the temporary <b>Access token</b>.</li>
            <li>Copy the <b>WhatsApp Business Account ID</b> (shown above the phone number list).</li>
            <li>For production, create a <b>System User</b> in Meta Business Settings → assign the WhatsApp app → generate a <b>permanent token</b>. Temporary tokens expire in 24 hours, which is why test sends suddenly start failing.</li>
            <li>Create message templates in <b>WhatsApp Manager → Message Templates</b>. They must be approved before use (usually minutes to a few hours). Marketing templates cost more per message than utility.</li>
            <li>Switch the app from <b>Test</b> to <b>Live</b> mode, and add a real payment method — Meta bills per conversation.</li>
          </ol>
          <div className="callout" style={{ marginTop: 14 }}>
            <b>Cost:</b> Meta gives roughly 1,000 free service conversations a month. Marketing
            templates are billed per message and are the most expensive category — keep them for
            opted-in lists only.
          </div>
        </div>
      </div>
    </>
  );
}
