import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler.middleware';
import { CreateFirInput, UpdateFirInput, FinalizeFirInput, FirStatus } from '@fir/shared';
import { analyzeIncident } from './ai.service';
import { generateFirNumber } from '../utils/firNumber';
import { parsePagination, paginationToSkipTake } from '../utils/pagination';

export async function createFirAndAnalyze(
  officerId: string,
  stationId: string,
  input: CreateFirInput,
  officerDetails: { fullName: string; rank: string; badgeNumber: string },
  stationDetails: { stationName: string; stationCode: string; district: string; state: string }
) {
  // 1. Create draft FIR in DB
  const fir = await prisma.fir.create({
    data: {
      stationId,
      filedByOfficerId: officerId,
      complainantName: input.complainantName,
      complainantAddress: input.complainantAddress,
      complainantPhone: input.complainantPhone,
      complainantIdType: input.complainantIdType,
      complainantIdNumber: input.complainantIdNumber,
      incidentDescription: input.incidentDescription,
      incidentDatetime: input.incidentDatetime ? new Date(input.incidentDatetime) : undefined,
      incidentLocation: input.incidentLocation,
      status: FirStatus.DRAFT,
    },
  });

  // 2. Call AI service to analyze incident
  const aiResult = await analyzeIncident({
    incident_story: input.incidentDescription,
    station_name: stationDetails.stationName,
    station_code: stationDetails.stationCode,
    district: stationDetails.district,
    state: stationDetails.state,
    officer_name: officerDetails.fullName,
    officer_rank: officerDetails.rank,
    officer_badge: officerDetails.badgeNumber,
  });

  // 3. Update FIR with AI analysis
  const updatedFir = await prisma.fir.update({
    where: { id: fir.id },
    data: {
      offenceNature: aiResult.sections?.primary_bns_sections?.[0]?.title ?? null,
      primaryBnsSections: aiResult.sections?.primary_bns_sections?.map((s: { section: string }) => s.section) ?? [],
      primaryIpcSections: aiResult.sections?.primary_ipc_sections?.map((s: { section: string }) => s.section) ?? [],
      accusedPersons: aiResult.entities?.accused_persons ?? [],
      victims: aiResult.entities?.victims ?? [],
      witnesses: aiResult.entities?.witnesses ?? [],
      aiAnalysisRaw: aiResult,
      firContentJson: aiResult.fir_content_json,
    },
  });

  return updatedFir;
}

export async function updateFir(
  firId: string,
  officerId: string,
  stationId: string,
  input: UpdateFirInput
) {
  const fir = await prisma.fir.findFirst({
    where: { id: firId, stationId },
  });
  if (!fir) throw new AppError(404, 'FIR not found');
  if (fir.status === FirStatus.FINALIZED || fir.status === FirStatus.FILED) {
    throw new AppError(400, 'Cannot edit a finalized FIR');
  }
  if (fir.filedByOfficerId !== officerId) {
    throw new AppError(403, 'You can only edit your own FIRs');
  }

  return prisma.fir.update({
    where: { id: firId },
    data: {
      ...input,
      accusedPersons: input.accusedPersons ? JSON.parse(JSON.stringify(input.accusedPersons)) : undefined,
      victims: input.victims ? JSON.parse(JSON.stringify(input.victims)) : undefined,
      witnesses: input.witnesses ? JSON.parse(JSON.stringify(input.witnesses)) : undefined,
      propertyDetails: input.propertyDetails ? JSON.parse(JSON.stringify(input.propertyDetails)) : undefined,
      firContentJson: input.firContentJson ? JSON.parse(JSON.stringify(input.firContentJson)) : undefined,
    },
  });
}

export async function finalizeFir(
  firId: string,
  officerId: string,
  stationId: string,
  input: FinalizeFirInput
) {
  const fir = await prisma.fir.findFirst({
    where: { id: firId, stationId },
    include: { station: true },
  });
  if (!fir) throw new AppError(404, 'FIR not found');
  if (fir.status === FirStatus.FINALIZED) throw new AppError(400, 'FIR already finalized');
  if (fir.filedByOfficerId !== officerId) throw new AppError(403, 'Unauthorized');

  const firNumber = await generateFirNumber(fir.station.stationCode);

  return prisma.fir.update({
    where: { id: firId },
    data: {
      firNumber,
      status: FirStatus.FINALIZED,
      firContentJson: JSON.parse(JSON.stringify(input.firContentJson)),
      firContentHtml: input.firContentHtml,
      finalizedAt: new Date(),
    },
  });
}

export async function listFirs(
  stationId: string,
  query: { page?: string; limit?: string; status?: string }
) {
  const pagination = parsePagination(query);
  const skipTake = paginationToSkipTake(pagination);

  const where = {
    stationId,
    ...(query.status ? { status: query.status as FirStatus } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.fir.findMany({
      where,
      ...skipTake,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, firNumber: true, status: true,
        complainantName: true, offenceNature: true,
        primaryBnsSections: true, incidentLocation: true,
        createdAt: true, finalizedAt: true,
        filedBy: { select: { fullName: true, badgeNumber: true } },
      },
    }),
    prisma.fir.count({ where }),
  ]);

  return {
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getFir(firId: string, stationId: string) {
  const fir = await prisma.fir.findFirst({
    where: { id: firId, stationId },
    include: {
      filedBy: { select: { fullName: true, rank: true, badgeNumber: true } },
      station: { select: { stationName: true, stationCode: true, district: true, state: true } },
    },
  });
  if (!fir) throw new AppError(404, 'FIR not found');
  return fir;
}
