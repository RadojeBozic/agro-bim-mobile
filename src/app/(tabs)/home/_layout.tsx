import React from "react";
import { Stack } from "expo-router";
import { TabStack } from "../../../components/ui";
export const unstable_settings = { anchor: "index" };
export default function HomeLayout() {
  return (
    <TabStack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </TabStack>
  );
}
