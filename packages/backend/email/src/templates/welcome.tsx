import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import type * as React from 'react';

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Flama</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Welcome to Flama!</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Your account has been created successfully. We&apos;re excited to have you on board.
          </Text>
          <Text style={text}>
            If you have any questions, feel free to reach out to our support team.
          </Text>
          <Text style={footerText}>&mdash; The Flama Team</Text>
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
  margin: '0 0 12px',
};

const footerText: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#898989',
  margin: '24px 0 0',
};
