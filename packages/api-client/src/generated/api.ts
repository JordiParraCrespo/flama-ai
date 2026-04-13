/**
 * Placeholder API types — auto-generated file.
 *
 * This file is replaced when you run:
 *   pnpm generate:api-client
 *
 * The placeholder defines the paths the frontend expects so the project
 * builds without a running API server.
 */

export interface paths {
  "/auth/login": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            email: string;
            password: string;
          };
        };
      };
      responses: {
        200: {
          content: {
            "application/json": {
              accessToken: string;
              refreshToken: string;
            };
          };
        };
      };
    };
  };
  "/auth/register": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
          };
        };
      };
      responses: {
        201: {
          content: {
            "application/json": {
              accessToken: string;
              refreshToken: string;
            };
          };
        };
      };
    };
  };
  "/auth/refresh": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            refreshToken: string;
          };
        };
      };
      responses: {
        200: {
          content: {
            "application/json": {
              accessToken: string;
              refreshToken: string;
            };
          };
        };
      };
    };
  };
  "/auth/forgot-password": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            email: string;
          };
        };
      };
      responses: {
        200: {
          content: {
            "application/json": Record<string, never>;
          };
        };
      };
    };
  };
  "/auth/reset-password": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            token: string;
            password: string;
          };
        };
      };
      responses: {
        200: {
          content: {
            "application/json": Record<string, never>;
          };
        };
      };
    };
  };
  "/auth/profile": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              id: string;
              email: string;
              firstName: string;
              lastName: string;
              role: "admin" | "user";
              isActive: boolean;
              createdAt: string;
              updatedAt: string;
            };
          };
        };
      };
    };
  };
}
