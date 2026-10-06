import React, { useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Body, Loading, Screen } from "../../components/ui";
import { completeCallback } from "../../auth/callback";
import { t } from "../../i18n";
export default function Callback() {
  const url = Linking.useURL();
  const handled = useRef(false);
  const mounted = useRef(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!url || handled.current) return;
    handled.current = true;
    // Keep the incoming code only in this closure; immediately remove visible Router parameters.
    router.setParams({
      code: undefined,
      token_hash: undefined,
      access_token: undefined,
      refresh_token: undefined,
    });
    void completeCallback(url)
      .then((recovery) => {
        if (mounted.current) router.replace(recovery ? "/auth/reset" : "/home");
      })
      .catch(() => {
        if (mounted.current) setFailed(true);
      });
  }, [url]);
  return (
    <Screen>{failed ? <Body>{t("callbackFailed")}</Body> : <Loading />}</Screen>
  );
}
