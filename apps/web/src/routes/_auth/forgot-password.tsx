import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
} from '@flama/design-system-web';
import { useForgotPassword } from '@flama/frontend/react';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { mutate, isPending, isSuccess, error } = useForgotPassword();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutate(form.get('email') as string);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot password</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              If an account exists with that email, you will receive a reset link shortly.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error instanceof Error ? error.message : 'Something went wrong'}
                  </div>
                )}
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    disabled={isPending}
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Sending...' : 'Send reset link'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        <Link to="/login" className="underline underline-offset-4 hover:text-primary">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
