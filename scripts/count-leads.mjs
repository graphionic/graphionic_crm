import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const total = await prisma.lead.count();
const withSite = await prisma.lead.count({where:{website:{not:''}}});
const noSite = await prisma.lead.count({where:{OR:[{website:''},{website:null}]}});
const withEmail = await prisma.lead.count({where:{email:{not:''}}});
const noSiteWithEmail = await prisma.lead.count({where:{AND:[{OR:[{website:''},{website:null}]},{email:{not:''}}]}});
console.log(`Total ${total} withSite ${withSite} noSite ${noSite} withEmail ${withEmail} noSiteWithEmail ${noSiteWithEmail}`);
await prisma.$disconnect();
