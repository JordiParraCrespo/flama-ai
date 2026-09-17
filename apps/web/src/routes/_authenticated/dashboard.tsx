import { createFileRoute } from '@tanstack/react-router';
import { DashboardScreen } from '@/features/dashboard/screens/dashboard';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  return <DashboardScreen />;
}
