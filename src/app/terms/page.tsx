export const dynamic = "force-static";
export default function TermsPage(){
  return (
    <div style={{maxWidth:800, margin:"40px auto", padding:20, fontFamily:"system-ui", lineHeight:1.6}}>
      <h1>Terms of Service - Graphionic CRM</h1>
      <p><b>Last updated:</b> September 20, 2026</p>
      
      <h2>1. Service</h2>
      <p>ClientForge is an outreach CRM for B2B lead management, email and WhatsApp messaging via official APIs.</p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>You must have lawful basis for contacting leads (consent or legitimate interest for B2B Ltd companies under PECR)</li>
        <li>WhatsApp: You must obtain explicit, channel-specific opt-in before messaging. No cold WhatsApp. Violation will get your number banned by Meta with no appeal.</li>
        <li>No spam, no scraping of personal data without consent</li>
      </ul>

      <h2>3. WhatsApp</h2>
      <p>WhatsApp messaging via Meta Cloud API is subject to Meta's Business Policy, Commerce Policy, and pricing. You are responsible for opt-in collection, template approval, and quality rating. We enforce opt-in and 24h window in code to protect your number.</p>

      <h2>4. Liability</h2>
      <p>Service provided as-is. We are not liable for message delivery failures, bans due to policy violation, or third-party API changes.</p>

      <h2>5. Termination</h2>
      <p>We may suspend accounts violating WhatsApp policy or spam laws.</p>

      <h2>6. Contact</h2>
      <p>admin@graphionic.com - Graphionic Infotech, Surat, India</p>
    </div>
  )
}
