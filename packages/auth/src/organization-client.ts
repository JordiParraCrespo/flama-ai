import { organizationClient } from 'better-auth/client/plugins';
import { organizationSharedOptions } from './organization-options';

/**
 * The organization client plugin, for the shared client plugin set. Its own
 * file so a project without organizations drops it whole, and the server,
 * which imports the options, never loads client code.
 */
export function organizationClientPlugin() {
  return organizationClient(organizationSharedOptions);
}
