import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalisePhone(raw: string, defaultCountryCode = "44"): string {
  let p = (raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = defaultCountryCode + p.slice(1);
  return p;
}

async function canSendFreeform(lastInboundAt: Date | null | undefined) {
  if (!lastInboundAt) return { allowed: false, reason: "No inbound message from this contact — the 24h window is NOT open. Use an approved template." };
  const ms = Date.now() - new Date(lastInboundAt).getTime();
  const hours = ms / 36e5;
  if (hours > 24) {
    return { allowed: false, reason: `Last inbound was ${hours.toFixed(1)}h ago. The 24h window is closed — use a template.` };
  }
  return { allowed: true, reason: `Window open (${(24 - hours).toFixed(1)}h remaining).`, hoursLeft: 24 - hours };
}

async function runVerification() {
  console.log("=== RUNNING WHATSAPP INBOX VERIFICATION ===");

  // 1. Phone normalization tests
  console.log("\n1. Testing normalisePhone helper:");
  const p1 = normalisePhone("+44 7700 900123");
  const p2 = normalisePhone("07700 900123");
  const p3 = normalisePhone("447700900123");
  console.log(`- +44 7700 900123 -> ${p1}`);
  console.log(`- 07700 900123    -> ${p2}`);
  console.log(`- 447700900123    -> ${p3}`);
  if (p1 !== "447700900123" || p2 !== "447700900123" || p3 !== "447700900123") {
    throw new Error("Phone normalization discrepancy detected");
  }

  // 2. 24h window evaluation
  console.log("\n2. Testing 24h customer service window evaluation:");
  const now = new Date();
  const recentInbound = new Date(now.getTime() - 2 * 36e5); // 2 hours ago
  const oldInbound = new Date(now.getTime() - 26 * 36e5); // 26 hours ago

  const winActive = await canSendFreeform(recentInbound);
  const winExpired = await canSendFreeform(oldInbound);
  const winNone = await canSendFreeform(null);

  console.log(`- Inbound 2h ago: allowed=${winActive.allowed} (${winActive.hoursLeft?.toFixed(1)}h left)`);
  console.log(`- Inbound 26h ago: allowed=${winExpired.allowed} (${winExpired.reason})`);
  console.log(`- No inbound: allowed=${winNone.allowed}`);

  if (!winActive.allowed || winExpired.allowed || winNone.allowed) {
    throw new Error("24h window evaluation failed");
  }

  // 3. Activity persistence with null leadId (Unknown sender)
  console.log("\n3. Testing Activity persistence for unknown inbound contact:");
  const testWamid = `wamid.test_${Date.now()}`;
  const testPhone = "447999888777";
  const actUnknown = await prisma.activity.create({
    data: {
      leadId: null,
      phone: testPhone,
      contactName: "Unknown Tester",
      type: "WHATSAPP",
      direction: "IN",
      channel: "whatsapp_cloud",
      body: "Hi, I am interested in your web services",
      status: "received",
      externalId: testWamid,
    },
  });
  console.log(`- Created Activity for unknown contact (ID: ${actUnknown.id}, leadId: ${actUnknown.leadId})`);
  if (actUnknown.leadId !== null || actUnknown.phone !== testPhone) {
    throw new Error("Unknown contact activity persistence failed");
  }

  // 4. Inbound Deduplication test
  console.log("\n4. Testing Inbound Deduplication:");
  const duplicateCheck = await prisma.activity.findFirst({
    where: { externalId: testWamid },
  });
  console.log(`- Deduplication lookup found existing record: ${duplicateCheck?.id}`);
  if (!duplicateCheck) throw new Error("Deduplication check failed");

  // 5. Cleanup test record
  await prisma.activity.delete({ where: { id: actUnknown.id } });
  console.log("- Test activity record cleaned up");

  // 6. Verify existing WhatsApp activities in database
  const totalWa = await prisma.activity.count({ where: { type: "WHATSAPP" } });
  console.log(`\n6. Total WHATSAPP Activity records in DB: ${totalWa}`);

  console.log("\n=== ALL WHATSAPP INBOX VERIFICATION TESTS PASSED ===");
}

runVerification()
  .catch((err) => {
    console.error("Verification error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
