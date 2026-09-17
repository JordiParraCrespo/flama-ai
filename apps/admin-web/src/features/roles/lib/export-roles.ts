import type { RoleEntity } from '@flama/frontend-admin';
import { downloadCsvRows } from '@flama/frontend-web';

export interface RoleExportLabels {
  role: string;
  description: string;
  members: string;
  type: string;
  system: string;
  custom: string;
}

/**
 * Export the picked roles.
 *
 * The type column is translated to match the members export — a reader who
 * exports both should not get one file in their language and one in English.
 * The labels arrive as an argument because this is `lib/`: it has no `t` of its
 * own, and it is the better for it.
 */
export function exportRoles(
  roles: RoleEntity[],
  roleCounts: Map<string, number>,
  labels: RoleExportLabels,
): void {
  downloadCsvRows(
    'roles.csv',
    [labels.role, labels.description, labels.members, labels.type],
    roles.map((role) => [
      role.name,
      role.description ?? '',
      String(roleCounts.get(role.id) ?? 0),
      role.isSystem ? labels.system : labels.custom,
    ]),
  );
}
