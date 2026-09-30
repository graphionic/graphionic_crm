import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
const email='admin@graphionic.com';
const pass='Graphionic@123';
const hash=await bcrypt.hash(pass, 10);
await prisma.user.upsert({
  where:{email},
  create:{email, passwordHash:hash, isActive:true, role:'ADMIN', name:'Graphionic Admin'},
  update:{passwordHash:hash, isActive:true}
});
console.log('Set', email, 'pass', pass);
const users=await prisma.user.findMany();
console.log(users.map(u=>u.email));
await prisma.$disconnect();
