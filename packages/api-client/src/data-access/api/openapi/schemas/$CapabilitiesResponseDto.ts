/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CapabilitiesResponseDto = {
    properties: {
        google_oauth: {
            type: 'boolean',
            description: `Sign-in with Google is configured.`,
            isRequired: true,
        },
        github_oauth: {
            type: 'boolean',
            description: `Sign-in with GitHub is configured.`,
            isRequired: true,
        },
        stripe_billing: {
            type: 'boolean',
            description: `Stripe billing is configured.`,
            isRequired: true,
        },
        s3_storage: {
            type: 'boolean',
            description: `Files are stored in S3 (local disk otherwise).`,
            isRequired: true,
        },
        email_delivery: {
            type: 'boolean',
            description: `A real email transport (SMTP or Resend) is configured, not the console fallback.`,
            isRequired: true,
        },
    },
} as const;
