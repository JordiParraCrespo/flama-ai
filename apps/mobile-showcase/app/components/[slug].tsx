import { Button } from "@flama/design-system-mobile/button";
import { Text } from "@flama/design-system-mobile/text";
import { useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";

export default function ComponentScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const title = toTitle(params.slug ?? "component");

  return (
    <ScrollView contentContainerClassName="flex-grow justify-center p-6 gap-6">
      {/* Test 1: NativeWind className on plain RN View */}
      <View className="rounded-lg border border-border bg-card p-5">
        <Text className="text-2xl font-bold text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground mt-1">
          NativeWind styled component
        </Text>
      </View>

      {/* Test 2: Design system Button */}
      <Button variant="default" size="lg">
        <Text>Primary Button</Text>
      </Button>

      <Button variant="outline" size="lg">
        <Text>Outline Button</Text>
      </Button>

      <Button variant="destructive" size="lg">
        <Text>Destructive Button</Text>
      </Button>

      {/* Test 3: Raw className colors */}
      <View className="flex-row gap-2">
        <View className="h-10 w-10 rounded bg-primary" />
        <View className="h-10 w-10 rounded bg-secondary" />
        <View className="h-10 w-10 rounded bg-destructive" />
        <View className="h-10 w-10 rounded bg-muted" />
        <View className="h-10 w-10 rounded bg-accent" />
      </View>
    </ScrollView>
  );
}

function toTitle(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
