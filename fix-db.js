const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.coach.updateMany({
    where: { sport: 'BOXING/KICK' },
    data: { sport: 'Boxing/Kick' }
  });
  console.log('Updated coaches:', result.count);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
