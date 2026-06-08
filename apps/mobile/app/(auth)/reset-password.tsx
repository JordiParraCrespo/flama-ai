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
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = React.useState('');

  const reset = useResetPassword({
    onSuccess: () => {
      Alert.alert(t('auth.resetPassword.successTitle'), t('auth.resetPassword.successMessage'), [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('auth.resetPassword.failedTitle'),
        error.message ?? t('auth.resetPassword.error'),
      );
    },
  });

  const handleSubmit = () => {
    if (!token) return;
    const result = resetPasswordSchema.safeParse({ token, password });
    if (!result.success) {
      Alert.alert(t('validation.title'), result.error.errors[0].message);
      return;
    }
    reset.mutate({ token: result.data.token, password: result.data.password });
  };

  if (!token) {
    return (
      <ScrollView contentContainerClassName="flex-grow justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('auth.resetPassword.invalidTitle')}</CardTitle>
            <CardDescription>{t('auth.resetPassword.invalidMessage')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/(auth)/forgot-password" asChild>
              <Button variant="outline">
                <Text>{t('auth.resetPassword.requestNewLink')}</Text>
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
            <CardTitle>{t('auth.resetPassword.title')}</CardTitle>
            <CardDescription>{t('auth.resetPassword.description')}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label nativeID="rp-password">{t('auth.resetPassword.newPassword')}</Label>
              <Input
                placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                aria-labelledby="rp-password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </View>
            <Button onPress={handleSubmit} disabled={reset.isPending} className="mt-2">
              <Text>
                {reset.isPending
                  ? t('auth.resetPassword.submitting')
                  : t('auth.resetPassword.submit')}
              </Text>
            </Button>
            <Link href="/(auth)/login" asChild>
              <Button variant="link" size="sm">
                <Text>{t('auth.forgotPassword.backToSignIn')}</Text>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
