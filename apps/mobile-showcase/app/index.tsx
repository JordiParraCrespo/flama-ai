import { Button } from "@flama/design-system-mobile/button";
import { Text } from "@flama/design-system-mobile/text";
import { Link } from "expo-router";
import * as React from "react";
import { View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center p-6 gap-4">
      <Text className="text-3xl font-bold text-foreground">Showcase</Text>
      <Text className="text-base text-muted-foreground text-center">
        Open the drawer to browse components, or tap below.
      </Text>
      <Link href="/buttons" asChild>
        <Button size="lg" className="w-full">
          <Text>Browse Buttons</Text>
        </Button>
      </Link>
    </View>
  );
}
