import { Button } from "@flama/design-system-mobile/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flama/design-system-mobile/card";
import { Text } from "@flama/design-system-mobile/text";
import { useLogout } from "@flama/frontend/react";
import { useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const [count, setCount] = React.useState(0);

  const logout = useLogout({
    onSuccess: () => {
      router.replace("/(auth)/login");
    },
  });

  return (
    <ScrollView contentContainerClassName="p-6 gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-foreground">
          Welcome to Flama
        </Text>
        <Text className="text-base text-muted-foreground">
          You are signed in.
        </Text>
      </View>

      <Card>
        <CardHeader>
          <CardTitle>Counter</CardTitle>
          <CardDescription>
            A quick demo of the design system components.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <Text className="text-center text-4xl font-bold text-foreground">
            {count}
          </Text>
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setCount((c) => c - 1)}
            >
              <Text>-</Text>
            </Button>
            <Button className="flex-1" onPress={() => setCount((c) => c + 1)}>
              <Text>+</Text>
            </Button>
          </View>
          <Button variant="secondary" onPress={() => setCount(0)}>
            <Text>Reset</Text>
          </Button>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        onPress={() => logout.mutate()}
        disabled={logout.isPending}
      >
        <Text>{logout.isPending ? "Signing out..." : "Sign out"}</Text>
      </Button>
    </ScrollView>
  );
}
