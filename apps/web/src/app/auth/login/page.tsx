"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@flama/design-system-web";
import { Input } from "@flama/design-system-web";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSeparator,
} from "@flama/design-system-web";
import { useAuth } from "@flama/frontend/react";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await auth.login({ email, password });
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center lg:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col p-10 text-primary lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          Flama
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="leading-normal text-balance">
            &ldquo;The full-stack boilerplate that lets you ship faster.&rdquo;
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[350px]">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Field>
                <Button disabled={isLoading} className="w-full">
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <div className="flex items-center justify-between text-sm">
            <Link
              href="/auth/forgot-password"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
            <Link
              href="/auth/register"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </div>
          <FieldSeparator>Or continue with</FieldSeparator>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              render={
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google`}
                />
              }
            >
              Google
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              render={
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/github`}
                />
              }
            >
              GitHub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
