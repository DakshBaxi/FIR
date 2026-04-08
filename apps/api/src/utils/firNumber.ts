import { prisma } from '../config/database';

export async function generateFirNumber(stationCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${stationCode}/${year}/`;

  // Count existing FIRs for this station in current year
  const count = await prisma.fir.count({
    where: {
      firNumber: { startsWith: prefix },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}${sequence}`;
}
