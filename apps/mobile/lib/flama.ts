import { FlamaApp } from "@flama/frontend/di";
import { ExpoSecureStoreService } from "./storage";

export const app = FlamaApp.create({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
  storage: new ExpoSecureStoreService(),
});
