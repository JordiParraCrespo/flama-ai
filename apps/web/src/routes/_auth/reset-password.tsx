import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Field,
  FieldGroup,
  FieldLabel,
} from "@flama/design-system-web";
import { useResetPassword } from "@flama/frontend/react";

export const Route = createFileRoute("/_auth/reset-password")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string; error?: string } => ({
    token: (search.token as string) || undefined,
    error: (search.error as string) || undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token, error: linkError } = Route.useSearch();
  const { mutate, isPending, error } = useResetPassword();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    mutate(
      { token, password: form.get("password") as string },
      { onSuccess: () => navigate({ to: "/login" }) },
    );
  }

  const invalidLink = !token || Boolean(linkError);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset password</CardTitle>
          <CardDescription>
            Choose a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invalidLink ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              This reset link is invalid or has expired. Please request a new
              one.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error instanceof Error
                      ? error.message
                      : "Could not reset password"}
                  </div>
                )}
                <Field>
                  <FieldLabel htmlFor="password">New password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter a new password"
                    required
                    minLength={8}
                    disabled={isPending}
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Resetting..." : "Reset password"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        <Link
          to="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
