import React, { useState } from "react";
import { Text, TextInput } from "react-native";
import { router } from "expo-router";
import { supabase } from "../runtime";
import { config } from "../config/environment";
import { useAuth } from "../auth/provider";
import { Body, Button, Card, Screen, styles } from "../components/ui";
import { t, TranslationKey } from "../i18n";
export default function AuthForm({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset";
}) {
  const auth = useAuth();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<TranslationKey | null>(null);
  const submit = async () => {
    if (!supabase) {
      setMessage("authUnavailable");
      return;
    }
    if (
      (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ||
      (mode !== "forgot" && password.length < (mode === "login" ? 1 : 8))
    ) {
      setMessage("inputInvalid");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (result.error) throw result.error;
        await auth.validate();
        setPassword("");
        router.replace("/home");
      }
      if (mode === "register") {
        const result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: config.callbackUrl,
          },
        });
        if (result.error) throw result.error;
        setPassword("");
        setMessage("verificationSent");
      }
      if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: config.callbackUrl + "?flow=recovery",
        });
        if (result.error) throw result.error;
        setMessage("recoverySent");
      }
      if (mode === "reset") {
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword("");
        setMessage("saved");
      }
    } catch {
      setMessage("authFailed");
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const result = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: config.callbackUrl },
      });
      if (result.error) throw result.error;
      setMessage("verificationSent");
    } catch {
      setMessage("authFailed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Text style={styles.title}>
        {t(mode === "reset" ? "newPassword" : mode)}
      </Text>
      <Card>
        {mode === "register" && (
          <>
            <Body>{t("name")}</Body>
            <TextInput
              accessibilityLabel={t("name")}
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </>
        )}
        {mode !== "reset" && (
          <>
            <Body>{t("email")}</Body>
            <TextInput
              accessibilityLabel={t("email")}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </>
        )}
        {mode !== "forgot" && (
          <>
            <Body>{t(mode === "reset" ? "newPassword" : "password")}</Body>
            <TextInput
              accessibilityLabel={t("password")}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </>
        )}
        <Button
          label={t(busy ? "loading" : "submit")}
          disabled={busy || !supabase}
          onPress={() => void submit()}
        />
        {!supabase && <Body>{t("authUnavailable")}</Body>}
        {message && (
          <Text accessibilityRole="alert" style={styles.text}>
            {t(message)}
          </Text>
        )}
        {mode === "register" && message === "verificationSent" && (
          <Button
            label={t("resend")}
            disabled={busy}
            onPress={() => void resend()}
          />
        )}
      </Card>
      {mode === "login" && (
        <>
          <Button
            label={t("register")}
            onPress={() => router.push("/auth/register")}
          />
          <Button
            label={t("forgot")}
            onPress={() => router.push("/auth/forgot")}
          />
        </>
      )}
    </Screen>
  );
}
