import { Button } from '@flama/design-system-mobile/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-mobile/card';
import { Input } from '@flama/design-system-mobile/input';
import { Text } from '@flama/design-system-mobile/text';
import { useRegister } from '@flama/frontend/react';
import { type RegisterDto, registerSchema } from '@flama/shared';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { FormField } from '../../components/form-field';
import { useZodResolver } from '../../lib/use-zod-resolver';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const { control, handleSubmit } = useForm<RegisterDto>({
    resolver: useZodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

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

  const onSubmit = handleSubmit((values) => register.mutate(values));

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
              <View className="flex-1">
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <FormField
                      label={t('auth.firstName')}
                      nativeID="firstName"
                      error={fieldState.error?.message}
                    >
                      <Input
                        placeholder="John"
                        aria-labelledby="firstName"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        autoComplete="given-name"
                        textContentType="givenName"
                      />
                    </FormField>
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field, fieldState }) => (
                    <FormField
                      label={t('auth.lastName')}
                      nativeID="lastName"
                      error={fieldState.error?.message}
                    >
                      <Input
                        placeholder="Doe"
                        aria-labelledby="lastName"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        autoComplete="family-name"
                        textContentType="familyName"
                      />
                    </FormField>
                  )}
                />
              </View>
            </View>
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <FormField
                  label={t('auth.email')}
                  nativeID="reg-email"
                  error={fieldState.error?.message}
                >
                  <Input
                    placeholder={t('auth.emailPlaceholder')}
                    aria-labelledby="reg-email"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <FormField
                  label={t('auth.password')}
                  nativeID="reg-password"
                  error={fieldState.error?.message}
                >
                  <Input
                    placeholder={t('auth.register.passwordPlaceholder')}
                    aria-labelledby="reg-password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                </FormField>
              )}
            />
            <Button onPress={onSubmit} disabled={register.isPending} className="mt-2">
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
