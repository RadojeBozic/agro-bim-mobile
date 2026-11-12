import { useLocalSearchParams } from "expo-router";
import AuthForm from "../../screens/auth-form";
export default function Auth() {
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  return <AuthForm mode="login" returnToAd={flow === "submit-ad"} />;
}
