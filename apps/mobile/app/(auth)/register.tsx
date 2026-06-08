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
import { useRegister } from '@flama/frontend/react';
import { registerSchema } from '@flama/shared';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const register = useRegister({
    onSuccess: () => {
      Alert.alert(t('auth.register.successTitle'), t('auth.register.successMessage'), [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    },
    onError: (error) => {
      Alert.alert(t('auth.register.failed'), error.message ?? t('auth.register.failed'));
    },
  });

  const handleRegister = () => {
    const result = registerSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
    });
    if (!result.success) {
      Alert.alert(t('validation.title'), result.error.errors[0].message);
      return;
    }
    register.mutate(result.data);
  };

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
            <CardTitle>{t('auth.register.title')}</CardTitle>
            <CardDescription>{t('auth.register.description')}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1 gap-2">
                <Label nativeID="firstName">{t('auth.firstName')}</Label>
                <Input
                  placeholder="John"
                  aria-labelledby="firstName"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoComplete="given-name"
                  textContentType="givenName"
                />
              </View>
              <View className="flex-1 gap-2">
                <Label nativeID="lastName">{t('auth.lastName')}</Label>
                <Input
                  placeholder="Doe"
                  aria-labelledby="lastName"
                  value={lastName}
                  onChangeText={setLastName}
                  autoComplete="family-name"
                  textContentType="familyName"
                />
              </View>
            </View>
            <View className="gap-2">
              <Label nativeID="reg-email">{t('auth.email')}</Label>
              <Input
                placeholder={t('auth.emailPlaceholder')}
                aria-labelledby="reg-email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
            <View className="gap-2">
              <Label nativeID="reg-password">{t('auth.password')}</Label>
              <Input
                placeholder={t('auth.register.passwordPlaceholder')}
                aria-labelledby="reg-password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </View>
            <Button onPress={handleRegister} disabled={register.isPending} className="mt-2">
              <Text>
                {register.isPending ? t('auth.register.submitting') : t('auth.register.submit')}
              </Text>
            </Button>
            <View className="flex-row items-center justify-center gap-1">
              <Text className="text-sm text-muted-foreground">{t('auth.register.hasAccount')}</Text>
              <Link href="/(auth)/login" asChild>
                <Button variant="link" size="sm" className="px-1">
                  <Text>{t('auth.register.signIn')}</Text>
                </Button>
              </Link>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
