export type ProjectGasRole = 'admin' | 'governance' | 'guardian' | 'pause' | 'oracle-updater' | 'strategy-operator' | 'treasury-operator' | 'router-manager';
export interface RoleAssignment { role: ProjectGasRole; principal: string; active: boolean; expiresAtMs?: number }

export function authorizeRole(assignments: readonly RoleAssignment[], role: ProjectGasRole, principal: string, nowMs = Date.now()): boolean {
  return assignments.some((assignment) => assignment.role === role && assignment.principal === principal && assignment.active
    && (assignment.expiresAtMs === undefined || nowMs < assignment.expiresAtMs));
}

export function runtimeRoleSeparation(assignments: readonly RoleAssignment[]): { safe: boolean; reason: string } {
  const active = assignments.filter((assignment) => assignment.active);
  const allRoles = new Set<ProjectGasRole>(active.map((assignment) => assignment.role));
  if (allRoles.size !== 8) return { safe: false, reason: 'Every implementation-ready role needs an active assignment.' };
  const principals = new Set(active.map((assignment) => assignment.principal));
  if (principals.size < 3) return { safe: false, reason: 'Runtime authority cannot collapse into fewer than three principals.' };
  const admin = active.find((assignment) => assignment.role === 'admin')?.principal;
  const guardian = active.find((assignment) => assignment.role === 'guardian')?.principal;
  const strategy = active.find((assignment) => assignment.role === 'strategy-operator')?.principal;
  if (!admin || admin === guardian || admin === strategy) return { safe: false, reason: 'Admin, guardian, and strategy operation must be separated.' };
  return { safe: true, reason: 'Critical runtime roles are separated.' };
}
