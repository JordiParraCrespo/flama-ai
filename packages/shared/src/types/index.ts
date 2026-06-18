/**
 * A role is identified by its (free-form) name. The built-in `admin` / `user`
 * roles are seeded as system roles, but admins can create arbitrary additional
 * roles, so this is a plain string rather than a closed union.
 */
export type Role = string;

export type AuthProvider = 'local' | 'google' | 'github';

export interface JwtPayload {
  sub: string;
  email: string;
  /** Legacy single-role claim (the user's primary role name). */
  role: Role;
  /** Names of every role assigned to the user (dynamic RBAC). */
  roles?: Role[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}
