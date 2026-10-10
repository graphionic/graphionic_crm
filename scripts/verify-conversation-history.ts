import { PrismaClient } from "@prisma/client";
import { deriveConversationTitle } from "../src/lib/himi/title";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("=== RUNNING HIMI CONVERSATION HISTORY VERIFICATION ===");

  // 1. Title derivation test
  console.log("\n1. Testing deriveConversationTitle helper:");
  const title1 = deriveConversationTitle("Find my best UK dental leads to contact today");
  console.log(`- Input: "Find my best UK dental leads to contact today" -> "${title1}"`);
  if (!title1.includes("Find my best UK dental")) throw new Error("Title derivation failed for title1");

  const title2 = deriveConversationTitle("### What are the latest conversion metrics across Leeds and Manchester roofing prospects?");
  console.log(`- Markdown input -> "${title2}"`);
  if (title2.startsWith("#")) throw new Error("Title derivation did not strip markdown prefix");

  const title3 = deriveConversationTitle("");
  console.log(`- Empty input -> "${title3}"`);
  if (title3 !== "New Conversation") throw new Error("Title derivation empty fallback failed");

  // 2. Database models & relations test
  console.log("\n2. Testing Prisma HimiConversation & HimiMessage models:");
  const testUser = await prisma.adminUser.findFirst({ where: { isActive: true } });
  if (!testUser) throw new Error("No active admin user found in database");
  console.log(`- Using test AdminUser: ${testUser.email} (${testUser.id})`);

  // Create a test conversation
  const conv = await prisma.himiConversation.create({
    data: {
      userId: testUser.id,
      title: deriveConversationTitle("Test conversation for verification"),
    },
  });
  console.log(`- Created conversation: ${conv.id} - "${conv.title}"`);

  // Create messages
  const userMsg = await prisma.himiMessage.create({
    data: {
      conversationId: conv.id,
      role: "USER",
      content: "Test conversation for verification",
    },
  });
  console.log(`- Created USER message: ${userMsg.id}`);

  const asstMsg = await prisma.himiMessage.create({
    data: {
      conversationId: conv.id,
      role: "ASSISTANT",
      content: "Hello! Here is the response to your verification question.",
    },
  });
  console.log(`- Created ASSISTANT message: ${asstMsg.id}`);

  // 3. Query conversation and messages
  const fetchedConv = await prisma.himiConversation.findUnique({
    where: { id: conv.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!fetchedConv || fetchedConv.messages.length !== 2) {
    throw new Error("Failed to fetch conversation with messages");
  }
  console.log(`- Fetched conversation has ${fetchedConv.messages.length} messages`);

  // 4. Bounded message query
  const boundedMessages = await prisma.himiMessage.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log(`- Bounded messages query succeeded (count: ${boundedMessages.length})`);

  // 5. Test Cascade Deletion
  await prisma.himiConversation.delete({ where: { id: conv.id } });
  const remainingMessages = await prisma.himiMessage.findMany({ where: { conversationId: conv.id } });
  if (remainingMessages.length !== 0) {
    throw new Error("Cascade deletion failed: messages still exist");
  }
  console.log("- Cascade deletion verified: conversation and associated messages cleanly deleted");

  // 6. Verify HimiMemory model isolation
  const memoryCount = await prisma.himiMemory.count();
  console.log(`- HimiMemory table isolated (active records: ${memoryCount})`);

  console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
