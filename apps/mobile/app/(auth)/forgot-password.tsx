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
import { useForgotPassword } from '@flama/frontend/react';
import { forgotPasswordSchema } from '@flama/shared';
import { Link } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const forgotPassword = useForgotPassword({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = () => {
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      Alert.alert(t('validation.title'), result.error.errors[0].message);
      return;
    }
    forgotPassword.mutate(result.data.email);
  };

  if (submitted) {
    return (
      <ScrollView contentContainerClassName="flex-grow justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('auth.forgotPassword.successTitle')}</CardTitle>
            <CardDescription>{t('auth.forgotPassword.successMessage')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/(auth)/login" asChild>
              <Button variant="outline">
                <Text>{t('auth.forgotPassword.backToSignIn')}</Text>
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
            <CardTitle>{t('auth.forgotPassword.title')}</CardTitle>
            <CardDescription>{t('auth.forgotPassword.description')}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label nativeID="fp-email">{t('auth.email')}</Label>
              <Input
                placeholder={t('auth.emailPlaceholder')}
                aria-labelledby="fp-email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
            <Button onPress={handleSubmit} disabled={forgotPassword.isPending} className="mt-2">
              <Text>
                {forgotPassword.isPending
                  ? t('auth.forgotPassword.submitting')
                  : t('auth.forgotPassword.submit')}
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
