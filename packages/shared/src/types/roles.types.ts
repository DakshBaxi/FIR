export enum OfficerRole {
  OFFICER = 'OFFICER',
  SENIOR_OFFICER = 'SENIOR_OFFICER',
  STATION_ADMIN = 'STATION_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const ROLE_HIERARCHY: Record<OfficerRole, number> = {
  [OfficerRole.OFFICER]: 1,
  [OfficerRole.SENIOR_OFFICER]: 2,
  [OfficerRole.STATION_ADMIN]: 3,
  [OfficerRole.SUPER_ADMIN]: 4,
};

export function hasMinRole(userRole: OfficerRole, minRole: OfficerRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
