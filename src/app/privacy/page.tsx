export const dynamic = "force-static";
export default function PrivacyPage(){
  return (
    <div style={{maxWidth:800, margin:"40px auto", padding:20, fontFamily:"system-ui", lineHeight:1.6}}>
      <h1>Privacy Policy - Graphionic CRM</h1>
      <p><b>Last updated:</b> September 20, 2026</p>
      <p>Graphionic Infotech ("we", "us") operates ClientForge outreach CRM at https://graphionic-crm.vercel.app</p>
      
      <h2>1. Data we collect</h2>
      <ul>
        <li>Business contact data: company name, business category, website, email, phone, address, city, country</li>
        <li>WhatsApp Business API: phone number ID, WABA ID, message logs (with consent), inbound replies</li>
        <li>Account data: admin email for login</li>
      </ul>

      <h2>2. How we use WhatsApp</h2>
      <p>We use Meta WhatsApp Cloud API only to send messages to contacts who have given explicit, channel-specific opt-in for WhatsApp, with timestamp and source recorded outside WhatsApp. We never send cold WhatsApp. Free-form messages are only sent within the 24-hour window opened by customer inbound message. Outside that window, only approved templates are used.</p>

      <h2>3. Legal basis (UK GDPR / PECR)</h2>
      <p>B2B email to Ltd/LLP/PLC companies is allowed under PECR Regulation 22 (corporate subscribers). WhatsApp requires consent. Sole traders/individuals require consent for both email and WhatsApp.</p>

      <h2>4. Data retention</h2>
      <p>Leads retained until deleted by user. Suppression list retained permanently to honour opt-outs. Message logs retained for compliance.</p>

      <h2>5. Your rights</h2>
      <p>You can request deletion, access, or opt-out at any time via admin@graphionic.com</p>

      <h2>6. Contact</h2>
      <p>Graphionic Infotech, Surat, Gujarat, India - admin@graphionic.com</p>

      <h2>7. WhatsApp Business Policy</h2>
      <p>We comply with Meta WhatsApp Business Policy, including opt-in requirements, quality rating, and template approval. Block rates above 2% trigger review.</p>
    </div>
  )
}
