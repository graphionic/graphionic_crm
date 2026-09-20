import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { TemplateForm, TemplateRow } from "./client";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireActiveUser();
  const templates = await prisma.template.findMany({ orderBy: { createdAt: "desc" } });

  const starter = [
    {
      name: "Audit opener (email)",
      channel: "EMAIL",
      subject: "",
      body: `{{hook_line}}

Three things I'd fix first:
1. {{issue_1}}
2. {{issue_2}}

I build sites for {{category}} and recorded a 60-second walkthrough of exactly what I'd change — no charge, no pitch:

[LOOM LINK]

If it's useful I'll send the fix list. If not, no follow-up from me.

From,
[Your name]`,
    },
    {
      name: "Follow-up 2 (email)",
      channel: "EMAIL",
      subject: "Re: quick note about your website",
      body: `Quick add-on to my last note — the mobile issue is the easy fix. The bigger one is that there's no way to book outside your phone hours, which is when most people actually search.

We fixed exactly this for a similar business and their online enquiries went up noticeably in ten weeks.

Worth a 15-minute call? Thursday 10:00 or Friday 14:00 UK time both work.`,
    },
    {
      name: "Close-out (email)",
      channel: "EMAIL",
      subject: "Closing the file on {{company}}",
      body: `I'll stop here — I don't want to clutter your inbox. Three notes and I'm gone:

1. The issue I flagged is still live on your site.
2. If you ever want the fix list, reply "send it" and I'll pass it over with no obligation.
3. If someone else handles the website, feel free to forward this their way.

Best of luck with the business.`,
    },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Message templates</h2>
          <p>Reusable email and WhatsApp copy. Placeholders in double braces get filled per lead.</p>
        </div>
      </div>

      <div className="callout">
        <b>Available placeholders:</b>{" "}
        {["{{company}}", "{{contact_first}}", "{{hook_line}}", "{{issue_1}}", "{{issue_2}}", "{{category}}", "{{city}}", "{{country}}"].map((p) => (
          <code key={p} style={{ marginRight: 6 }}>{p}</code>
        ))}
      </div>

      <TemplateForm starters={starter} />

      <div className="card">
        <div className="card-head">
          <h3>Saved templates</h3>
          <span className="hint">{templates.length} total</span>
        </div>
        <div className="card-body tight">
          {templates.length === 0 ? (
            <div className="empty">
              <b>No templates yet</b>
              Save the outreach sequence once, then reuse it on every lead.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr><th>Name</th><th>Channel</th><th>Subject</th><th>Preview</th><th></th></tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <TemplateRow
                      key={t.id}
                      id={t.id}
                      name={t.name}
                      channel={t.channel}
                      subject={t.subject || ""}
                      body={t.body}
                      waTemplateName={t.waTemplateName || ""}
                      waLanguage={t.waLanguage || "en_US"}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
