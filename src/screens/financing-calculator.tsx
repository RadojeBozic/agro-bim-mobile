import React, { useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { Body, Button, Card, Screen, styles } from "../components/ui";
import { theme } from "../theme";
import {
  calculateForm,
  calculatorDisclaimer,
  graceDisclaimer,
  initialForm,
  type CalculatorForm,
  type FormCalculation,
} from "../financing/form";

const pageSize = 12;
export default function FinancingCalculator() {
  const [form, setForm] = useState<CalculatorForm>({ ...initialForm });
  const [calculation, setCalculation] = useState<FormCalculation | null>(null);
  const [page, setPage] = useState(0);
  const update = (patch: Partial<CalculatorForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setCalculation(null);
    setPage(0);
  };
  const field = (
    key: "investment" | "own" | "rate" | "term" | "grace",
    title: string,
  ) => (
    <View style={{ gap: theme.space.xs }}>
      <Body>{title}</Body>
      <TextInput
        accessibilityLabel={title}
        value={form[key]}
        onChangeText={(value) => update({ [key]: value })}
        keyboardType="decimal-pad"
        autoCorrect={false}
        autoComplete="off"
        style={[styles.input, { minWidth: 0 }]}
      />
    </View>
  );
  const choice = <T extends string>(
    title: string,
    values: readonly T[],
    selected: T,
    onSelect: (value: T) => void,
    label: (value: T) => string,
  ) => (
    <View style={{ gap: theme.space.xs }}>
      <Body>{title}</Body>
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}
      >
        {values.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={label(value)}
            accessibilityState={{ checked: value === selected }}
            onPress={() => onSelect(value)}
            style={[
              styles.input,
              {
                flexGrow: 1,
                justifyContent: "center",
                borderColor:
                  selected === value ? theme.color.primary : theme.color.border,
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                selected === value && {
                  fontWeight: "700",
                  color: theme.color.primary,
                },
              ]}
            >
              {label(value)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
  const c = calculation?.ok ? calculation : null;
  const r = c?.result;
  const money = (value: number) =>
    value.toLocaleString("sr-Latn-RS", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " " +
    c!.currency;
  const stat = (title: string, value: string | number) => (
    <View style={{ gap: theme.space.xs }}>
      <Text style={styles.muted}>{title}</Text>
      <Body>{value}</Body>
    </View>
  );
  return (
    <Screen>
      <Text style={styles.title}>Kalkulator finansiranja</Text>
      <Body>Besplatan informativni obračun. Radi i bez internet veze.</Body>
      <Card>
        <Body>
          Primer vrednosti možete izmeniti prema uslovima davaoca kredita.
        </Body>
        <Text style={styles.muted}>
          Unesite brojeve bez tačaka za hiljade. Za decimale koristite zarez ili
          tačku (npr. 6,5 ili 6.5).
        </Text>
        {choice(
          "Valuta",
          ["RSD", "EUR"] as const,
          form.currency,
          (currency) => update({ currency }),
          (v) => v,
        )}
        {field("investment", "Vrednost investicije")}
        {field("own", "Sopstvena sredstva")}
        {field("rate", "Godišnja nominalna kamatna stopa (%)")}
        {choice(
          "Jedinica roka",
          ["years", "months"] as const,
          form.termUnit,
          (termUnit) => {
            if (termUnit === form.termUnit) return;
            const term = Number(form.term.replace(",", "."));
            update({
              termUnit,
              term:
                Number.isFinite(term) && form.term.trim()
                  ? String(
                      termUnit === "months" ? Math.round(term * 12) : term / 12,
                    )
                  : form.term,
            });
          },
          (v) => (v === "years" ? "Godine" : "Meseci"),
        )}
        {field(
          "term",
          form.termUnit === "years"
            ? "Rok otplate (godine)"
            : "Rok otplate (meseci)",
        )}
        {field("grace", "Grejs period (meseci)")}
        <Text style={styles.muted}>
          Otplata je mesečna. Ukupan rok uključuje grejs period. Prazna
          sopstvena sredstva i grejs period računaju se kao nula.
        </Text>
        <Button
          label="Izračunaj"
          onPress={() => {
            Keyboard.dismiss();
            setCalculation(calculateForm(form));
            setPage(0);
          }}
        />
        {calculation && !calculation.ok && (
          <View accessibilityLiveRegion="polite">
            {calculation.messages.map((message) => (
              <Text key={message} accessibilityRole="alert" style={styles.text}>
                {message}
              </Text>
            ))}
          </View>
        )}
      </Card>
      <Card>
        <Body>{calculatorDisclaimer}</Body>
      </Card>
      {c && r && (
        <>
          <Card>
            <Text style={styles.section}>Informativni obračun</Text>
            {stat("Vrednost investicije", money(c.investment))}
            {stat(
              "Sopstvena sredstva (" + r.ownContributionPercent + "%)",
              money(r.ownContribution),
            )}
            {stat(
              "Potrebno finansiranje (" + r.financingPercent + "%)",
              money(r.principal),
            )}
            {stat(
              c.grace > 0 ? "Mesečna rata nakon grejs perioda" : "Mesečna rata",
              money(r.periodicPayment),
            )}
            {stat("Broj mesečnih rata (uključujući grejs)", r.schedule.length)}
            {c.grace > 0 &&
              stat(
                "Rata tokom grejs perioda (" + c.grace + " meseci)",
                money(r.gracePayment),
              )}
            {stat("Ukupna kamata", money(r.totalInterest))}
            {stat("Ukupna otplata", money(r.totalRepayment))}
            {c.grace > 0 && <Body>{graceDisclaimer}</Body>}
          </Card>
          <Text style={styles.section}>Plan otplate</Text>
          <Body>
            Rate {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, r.schedule.length)} od{" "}
            {r.schedule.length}
          </Body>
          {r.schedule
            .slice(page * pageSize, (page + 1) * pageSize)
            .map((row) => (
              <Card key={row.number}>
                <Text style={styles.section}>
                  Rata {row.number}
                  {row.isGrace ? " · grejs" : ""}
                </Text>
                {stat("Glavnica na početku", money(row.openingPrincipal))}
                {stat("Kamata", money(row.interest))}
                {stat("Otplata glavnice", money(row.principalPaid))}
                {stat("Iznos rate", money(row.payment))}
                {stat("Preostala glavnica", money(row.remainingPrincipal))}
              </Card>
            ))}
          {page > 0 && (
            <Button label="Prethodne rate" onPress={() => setPage(page - 1)} />
          )}
          {(page + 1) * pageSize < r.schedule.length && (
            <Button label="Sledeće rate" onPress={() => setPage(page + 1)} />
          )}
        </>
      )}
    </Screen>
  );
}
