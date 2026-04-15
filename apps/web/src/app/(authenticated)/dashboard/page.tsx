"use client";

import { useProfile } from "@flama/frontend/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@flama/design-system-web";

export default function DashboardPage() {
  const { data: user } = useProfile();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">128</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Sessions</CardDescription>
            <CardTitle className="text-2xl">24</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>API Calls</CardDescription>
            <CardTitle className="text-2xl">1,420</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Uptime</CardDescription>
            <CardTitle className="text-2xl">99.9%</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            This is a placeholder dashboard. Connect your data and customize it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your role is <strong>{user?.role}</strong> and your account is{" "}
            <strong>{user?.isActive ? "active" : "inactive"}</strong>.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
