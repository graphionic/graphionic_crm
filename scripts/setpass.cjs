const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async()=>{
  const prisma = new PrismaClient();
  const email='admin@graphionic.com';
  const pass='Graphionic@123';
  const hash=await bcrypt.hash(pass, 10);
  const user=await prisma.adminUser.upsert({
    where:{email},
    create:{email, passwordHash:hash, isActive:true, name:'Graphionic Admin'},
    update:{passwordHash:hash, isActive:true}
  });
  console.log('Set', email, 'pass', pass, 'id', user.id);
  const users=await prisma.adminUser.findMany();
  console.log('All users', users.map(u=>({email:u.email, active:u.isActive})));
  await prisma.$disconnect();
})();
