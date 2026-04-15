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
import { useRegister } from '@flama/frontend/react';

export const Route = createFileRoute('/_auth/register')({
    component: RegisterPage,
});

function RegisterPage() {
    const navigate = useNavigate();
    const { mutate, isPending, error } = useRegister();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);

        mutate(
            {
                firstName: form.get('firstName') as string,
                lastName: form.get('lastName') as string,
                email: form.get('email') as string,
                password: form.get('password') as string,
            },
            {
                onSuccess: () => {
                    navigate({ to: '/login' });
                },
            },
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Create an account</CardTitle>
                    <CardDescription>Enter your details to get started</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            {error && (
                                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error instanceof Error ? error.message : 'Registration failed'}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="firstName">First name</FieldLabel>
                                    <Input id="firstName" name="firstName" placeholder="John" required disabled={isPending} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                                    <Input id="lastName" name="lastName" placeholder="Doe" required disabled={isPending} />
                                </Field>
                            </div>
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
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="Create a password"
                                    required
                                    disabled={isPending}
                                />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? 'Creating account...' : 'Create account'}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
            <div className="text-center text-sm">
                Already have an account?{' '}
                <Link to="/login" className="underline underline-offset-4 hover:text-primary">
                    Sign in
                </Link>
            </div>
        </div>
    );
}
