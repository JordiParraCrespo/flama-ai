import { Button } from "@flama/design-system-mobile/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flama/design-system-mobile/card";
import { Input } from "@flama/design-system-mobile/input";
import { Label } from "@flama/design-system-mobile/label";
import { Text } from "@flama/design-system-mobile/text";
import { useForgotPassword } from "@flama/frontend/react";
import { forgotPasswordSchema } from "@flama/shared";
import { Link } from "expo-router";
import * as React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = React.useState("");
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
      Alert.alert("Validation error", result.error.errors[0].message);
      return;
    }
    forgotPassword.mutate(result.data.email);
  };

  if (submitted) {
    return (
      <ScrollView contentContainerClassName="flex-grow justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              If an account exists with that email, we've sent password reset
              instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/(auth)/login" asChild>
              <Button variant="outline">
                <Text>Back to sign in</Text>
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-6"
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <CardHeader>
            <CardTitle>Forgot password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label nativeID="fp-email">Email</Label>
              <Input
                placeholder="m@example.com"
                aria-labelledby="fp-email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
            <Button
              onPress={handleSubmit}
              disabled={forgotPassword.isPending}
              className="mt-2"
            >
              <Text>
                {forgotPassword.isPending ? "Sending..." : "Send reset link"}
              </Text>
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
