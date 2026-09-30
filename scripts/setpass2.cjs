const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async()=>{
  const prisma = new PrismaClient();
  const email='admin@graphionic.com';
  const pass='admin123';
  const hash=await bcrypt.hash(pass, 10);
  await prisma.adminUser.upsert({
    where:{email},
    create:{email, passwordHash:hash, isActive:true, name:'Graphionic Admin'},
    update:{passwordHash:hash, isActive:true}
  });
  console.log('Set', email, 'pass', pass);
  await prisma.$disconnect();
})();
