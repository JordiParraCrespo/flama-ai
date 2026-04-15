import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
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
} from '@flama/design-system-web';
import { useLogin } from '@flama/frontend/react';

export const Route = createFileRoute('/_auth/login')({
    validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
        redirect: (search.redirect as string) || undefined,
    }),
    component: LoginPage,
});

function LoginPage() {
    const navigate = useNavigate();
    const { redirect: redirectTo } = Route.useSearch();
    const { mutate, isPending, error } = useLogin();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const email = form.get('email') as string;
        const password = form.get('password') as string;

        mutate(
            { email, password },
            {
                onSuccess: () => {
                    navigate({ to: redirectTo ?? '/dashboard' });
                },
            },
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                    <CardDescription>Sign in to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            {error && (
                                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error instanceof Error ? error.message : 'Invalid email or password'}
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
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <Link
                                        to="/forgot-password"
                                        className="ml-auto text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    required
                                    disabled={isPending}
                                />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? 'Signing in...' : 'Sign in'}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            type="button"
                            disabled={isPending}
                            render={<a href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/v1/auth/google`} />}
                        >
                            Google
                        </Button>
                        <Button
                            variant="outline"
                            type="button"
                            disabled={isPending}
                            render={<a href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/v1/auth/github`} />}
                        >
                            GitHub
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <div className="text-center text-sm">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="underline underline-offset-4 hover:text-primary">
                    Sign up
                </Link>
            </div>
        </div>
    );
}
