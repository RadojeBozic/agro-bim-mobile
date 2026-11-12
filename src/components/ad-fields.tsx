import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { listingCategories, listingTypes } from "../api/ads-catalog";
import municipalities from "../api/ads-municipalities.json";
import { Picker } from "../screens/ads";
import { allowedAdTypes, type AdForm } from "../ads/submission";
import { Body, styles } from "./ui";

export const categoryOptions = Object.entries(listingCategories).map(
  ([value, label]) => ({ value, label }),
);
export const townOptions = municipalities.items.map(({ code, name }) => ({
  value: code,
  label: name,
}));
const currencies = ["RSD", "EUR"].map((value) => ({ value, label: value }));

export function AdFieldsForm({
  form,
  disabled = false,
  set,
}: {
  form: AdForm;
  disabled?: boolean;
  set: (key: keyof AdForm, value: string) => void;
}) {
  const input = (
    label: string,
    key: keyof AdForm,
    options: TextInputProps = {},
  ) => (
    <React.Fragment key={key}>
      <Body>{label}</Body>
      <TextInput
        {...options}
        accessibilityLabel={label}
        style={styles.input}
        value={form[key]}
        editable={!disabled}
        onChangeText={(value) => set(key, value)}
      />
    </React.Fragment>
  );
  return (
    <>
      <Picker
        disabled={disabled}
        title="Rubrika"
        value={form.category}
        items={categoryOptions}
        onSelect={(value) => set("category", value)}
      />
      <Picker
        disabled={disabled}
        title="Vrsta oglasa"
        value={form.type}
        items={allowedAdTypes(form.category).map((value) => ({
          value,
          label: listingTypes[value],
        }))}
        onSelect={(value) => set("type", value)}
      />
      {input("Potkategorija (opciono)", "subcategory", { maxLength: 100 })}
      {input("Naslov (do 80 znakova)", "title")}
      {input("Opis (do 200 znakova)", "description", { multiline: true })}
      <Picker
        disabled={disabled}
        title="Opština"
        value={form.municipalityCode}
        items={townOptions}
        searchable
        onSelect={(value) => set("municipalityCode", value)}
      />
      {input("Naselje (opciono)", "settlement", { maxLength: 200 })}
      {input("Kontakt telefon", "phone", {
        keyboardType: "phone-pad",
        maxLength: 60,
      })}
      {input("Cena (opciono)", "amount", { keyboardType: "decimal-pad" })}
      {!!form.amount.trim() && (
        <Picker
          disabled={disabled}
          title="Valuta"
          value={form.currency}
          items={
            currencies.some((item) => item.value === form.currency)
              ? currencies
              : [...currencies, { value: form.currency, label: form.currency }]
          }
          onSelect={(value) => set("currency", value)}
        />
      )}
      {input("Jedinica obračuna (opciono)", "priceBasis", {
        maxLength: 100,
      })}
      {input("Dodatne karakteristike (opciono)", "details", {
        maxLength: 500,
        multiline: true,
      })}
    </>
  );
}
