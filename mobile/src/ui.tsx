import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const C = {
  navy: "#102a43",
  ink: "#16263b",
  teal: "#1d4e89",
  mint: "#e7eef8",
  blue: "#dce8f8",
  pale: "#f1f5fa",
  bg: "#f6f8fb",
  white: "#ffffff",
  muted: "#5b6879",
  line: "#d8e0ea",
  red: "#ba1a1a",
};
export function Icon({
  name,
  color = C.navy,
  size = 22,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Ionicons accessible={false} name={name} size={size} color={color} />;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondaryButton,
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.75 },
      ]}
    >
      {icon && (
        <Icon name={icon} color={secondary ? C.navy : C.white} size={19} />
      )}
      <Text style={[s.buttonText, secondary && { color: C.navy }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={C.muted}
        style={[
          s.input,
          props.multiline && { minHeight: 100, textAlignVertical: "top" },
          error && { borderColor: C.red },
        ]}
        {...props}
      />
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          ⓘ {error}
        </Text>
      )}
    </View>
  );
}
export function Card({ children }: React.PropsWithChildren) {
  return <View style={s.card}>{children}</View>;
}
export function Empty({
  icon,
  title,
  detail,
}: {
  icon: IconName;
  title: string;
  detail: string;
}) {
  return (
    <View style={s.empty}>
      <View style={s.iconCircle}>
        <Icon name={icon} color={C.teal} size={30} />
      </View>
      <Text style={s.h2}>{title}</Text>
      <Text style={[s.body, { textAlign: "center" }]}>{detail}</Text>
    </View>
  );
}
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 68,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  brandMark: {
    width: 36,
    height: 36,
    backgroundColor: C.navy,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: { color: C.white, fontFamily: "Inter_700Bold", fontSize: 24 },
  brandImage: { width: "100%", height: "100%", borderRadius: 8 },
  welcomeBrand: { alignItems: "center", gap: 12, marginBottom: 24 },
  brand: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: C.navy,
    letterSpacing: 0,
  },
  h1: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 37,
    color: C.ink,
    letterSpacing: 0,
  },
  h2: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 19,
    lineHeight: 27,
    color: C.ink,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    color: C.muted,
  },
  small: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: C.muted,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 22,
    color: C.ink,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 17,
    color: C.teal,
    letterSpacing: 1.6,
  },
  languageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: C.white,
    padding: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  hero: { backgroundColor: C.blue, padding: 24, borderRadius: 8, borderWidth: 1, borderColor: "#c7d7ec", gap: 16 },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    padding: 20,
    gap: 14,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: C.white,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    backgroundColor: C.pale,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentBanner: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: C.mint,
    borderRadius: 8,
    padding: 16,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  companyIcon: {
    backgroundColor: C.blue,
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  salary: { fontFamily: "Inter_700Bold", fontSize: 19, color: C.navy },
  badge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: C.mint,
    color: C.teal,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: C.navy,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: C.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    textAlign: "center",
    flexShrink: 1,
  },
  secondaryButton: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
  },
  link: { color: C.teal, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  textButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  chips: { flexDirection: "row", gap: 8 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    justifyContent: "center",
  },
  selectedChip: { backgroundColor: C.teal, borderColor: C.teal },
  detailHero: {
    backgroundColor: C.navy,
    borderRadius: 8,
    padding: 24,
    gap: 16,
  },
  detailTile: {
    flexGrow: 1,
    flexBasis: "44%",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  field: { gap: 7 },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: C.ink,
  },
  error: { color: C.red, fontSize: 13, lineHeight: 20 },
  dateCard: {
    width: 76,
    alignItems: "center",
    gap: 6,
    padding: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 14,
  },
  demoBar: {
    backgroundColor: C.pale,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  demoText: {
    textAlign: "center",
    color: C.muted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderTopColor: C.line,
    borderTopWidth: 1,
    paddingVertical: 7,
  },
  tab: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 2 },
  tabIcon: {
    width: 52,
    paddingVertical: 5,
    alignItems: "center",
    borderRadius: 8,
  },
  tabText: {
    fontSize: 11,
    color: C.muted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  footer: {
    padding: 16,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  toast: {
    backgroundColor: C.navy,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toastText: { color: C.white, fontSize: 13, lineHeight: 20, flex: 1 },
  dot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.teal,
  },
});
