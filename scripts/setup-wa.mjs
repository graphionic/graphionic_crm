import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/crypto.ts";

const prisma = new PrismaClient();

const token = 'EAAxDWUYkt5gBSuhcjrSR0pStpZAtnL6R7itxTLOc201I1HwgnpvhE2HxEhXWFlITg4aVKjdNFW7wvcW0ZC3fcaaHcq9KQCZCRxfoZAW5LfFYthtgiHfhjdKqCPizJvF7C35qZCyynTeD4HglBlKAQTASdd7wNX0QwwdJd4b3VNI9CZC2z4fYz918Tr9uDFpmDE9ZCLZADI3XkN4JQSJsj443GfL7yqGmEeP6l62q4WwqrkszsI5baVnqAZAOMjqcgnA9QmVAs0rPiukMOzznSoZCwoqOwCDSSCdPG8WQZDZD';

async function main(){
  await prisma.setting.upsert({
    where: {key: 'wa_enabled'},
    create: {key: 'wa_enabled', value: 'true', isSecret: false},
    update: {value: 'true'}
  });
  await prisma.setting.upsert({
    where: {key: 'wa_phone_number_id'},
    create: {key: 'wa_phone_number_id', value: '1118825077986817', isSecret: false},
    update: {value: '1118825077986817'}
  });
  await prisma.setting.upsert({
    where: {key: 'wa_business_account_id'},
    create: {key: 'wa_business_account_id', value: '1733770520947150', isSecret: false},
    update: {value: '1733770520947150'}
  });
  await prisma.setting.upsert({
    where: {key: 'wa_api_version'},
    create: {key: 'wa_api_version', value: 'v21.0', isSecret: false},
    update: {value: 'v21.0'}
  });
  await prisma.setting.upsert({
    where: {key: 'wa_default_country_code'},
    create: {key: 'wa_default_country_code', value: '91', isSecret: false},
    update: {value: '91'}
  });
  await prisma.setting.upsert({
    where: {key: 'wa_verify_token'},
    create: {key: 'wa_verify_token', value: 'graphionic_verify_123', isSecret: false},
    update: {value: 'graphionic_verify_123'}
  });
  const enc = encrypt(token);
  await prisma.setting.upsert({
    where: {key: 'wa_access_token'},
    create: {key: 'wa_access_token', value: enc, isSecret: true},
    update: {value: enc, isSecret: true}
  });
  console.log('WhatsApp settings saved');
  const count = await prisma.setting.count();
  console.log('Settings count', count);
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e); process.exit(1);});
