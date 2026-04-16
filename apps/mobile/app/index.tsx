import { Redirect } from "expo-router";
import { useAuthState } from "@flama/frontend/react";

export default function Index() {
  const { isAuthenticated } = useAuthState();
  return <Redirect href={isAuthenticated ? "/(app)" : "/(auth)/login"} />;
}
