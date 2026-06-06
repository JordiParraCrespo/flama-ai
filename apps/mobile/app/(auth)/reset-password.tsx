import { Button } from '@flama/design-system-mobile/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-mobile/card';
import { Input } from '@flama/design-system-mobile/input';
import { Label } from '@flama/design-system-mobile/label';
import { Text } from '@flama/design-system-mobile/text';
import { useResetPassword } from '@flama/frontend/react';
import { resetPasswordSchema } from '@flama/shared';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = React.useState('');

  const reset = useResetPassword({
    onSuccess: () => {
      Alert.alert('Password updated', 'You can now sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    },
    onError: (error) => {
      Alert.alert('Reset failed', error.message ?? 'Could not reset password.');
    },
  });

  const handleSubmit = () => {
    if (!token) return;
    const result = resetPasswordSchema.safeParse({ token, password });
    if (!result.success) {
      Alert.alert('Validation error', result.error.errors[0].message);
      return;
    }
    reset.mutate({ token: result.data.token, password: result.data.password });
  };

  if (!token) {
    return (
      <ScrollView contentContainerClassName="flex-grow justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>
              This reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/(auth)/forgot-password" asChild>
              <Button variant="outline">
                <Text>Request a new link</Text>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-6"
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>Choose a new password for your account</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label nativeID="rp-password">New password</Label>
              <Input
                placeholder="Min. 8 characters"
                aria-labelledby="rp-password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </View>
            <Button onPress={handleSubmit} disabled={reset.isPending} className="mt-2">
              <Text>{reset.isPending ? 'Resetting...' : 'Reset password'}</Text>
            </Button>
            <Link href="/(auth)/login" asChild>
              <Button variant="link" size="sm">
                <Text>Back to sign in</Text>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
