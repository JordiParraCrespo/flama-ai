import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type * as React from 'react';

interface EmailVerificationProps {
  verifyUrl: string;
}

export function EmailVerificationEmail({ verifyUrl }: EmailVerificationProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Verify your email</Heading>
          <Text style={text}>
            Thanks for signing up! Please verify your email address by clicking the button below.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={verifyUrl}>
              Verify email
            </Button>
          </Section>
          <Text style={footerText}>
            If you didn&apos;t create an account, you can safely ignore this email.
          </Text>
          <Text style={footerText}>
            If the button doesn&apos;t work, copy and paste this link into your browser:{' '}
            <Link href={verifyUrl} style={link}>
              {verifyUrl}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1a1a1a',
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const text: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
  margin: '0 0 24px',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const button: React.CSSProperties = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
  display: 'inline-block',
};

const footerText: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#898989',
  margin: '0 0 12px',
};

const link: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'underline',
};
