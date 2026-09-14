import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  availableDates,
  canBook,
  offices,
  reasons,
  times,
  validateProfile,
  type DemoState,
  type Language,
  type Profile,
} from "./domain";
import { Button, Card, Field, Icon, C, s } from "./ui";
export const locale = (language: Language | null) =>
  language === "si" ? "si-LK" : language === "ta" ? "ta-LK" : "en-GB";
export const dateLabel = (date: string, language: Language | null) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(locale(language), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function Registration({
  t,
  onSave,
}: {
  t: (text: string) => string;
  onSave: (profile: Profile) => void;
}) {
  const [profile, setProfile] = useState<Profile>({
    name: "",
    phone: "",
    email: "",
  });
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const next = validateProfile(profile, password);
    setErrors(next);
    if (Object.keys(next).length === 0) {
      onSave({
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim().toLowerCase(),
      });
      setPassword("");
    }
  };
  return (
    <>
      <View style={s.hero}>
        <Text style={s.eyebrow}>YOUR JOURNEY STARTS HERE</Text>
        <Text style={s.h1}>{t("Create Your Profile")}</Text>
        <Text style={s.body}>
          Your gateway to global professional opportunities.
        </Text>
      </View>
      <Text style={s.small}>
        Use fictional details. This form demonstrates registration; it does not
        create an account. The password is never stored or sent.
      </Text>
      <Card>
        <Field
          label={t("Full Name")}
          value={profile.name}
          onChangeText={(name) => setProfile((prev) => ({ ...prev, name }))}
          placeholder="Nimal Perera"
          autoCapitalize="words"
          error={errors.name}
        />
        <Field
          label={t("Phone Number")}
          value={profile.phone}
          onChangeText={(phone) => setProfile((prev) => ({ ...prev, phone }))}
          placeholder="+94 77 123 4567"
          keyboardType="phone-pad"
          error={errors.phone}
        />
        <Field
          label={t("Email Address")}
          value={profile.email}
          onChangeText={(email) => setProfile((prev) => ({ ...prev, email }))}
          placeholder="nimal@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
        />
        <Field
          label={t("Password")}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.password}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setShow(!show)}
          style={s.textButton}
        >
          <Text style={s.link}>{show ? "Hide password" : "Show password"}</Text>
        </Pressable>
        <Button
          title={t("Create Demo Profile")}
          onPress={submit}
          icon="arrow-forward"
        />
      </Card>
    </>
  );
}
export function Booking({
  t,
  state,
  onBooked,
}: {
  t: (text: string) => string;
  state: DemoState;
  onBooked: (
    office: string,
    date: string,
    time: string,
    reason: string,
    notes: string,
  ) => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const dates = availableDates();
  const [office, setOffice] = useState(offices[0].name);
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [notes, setNotes] = useState("");
  const choice = (
    label: string,
    selected: boolean,
    onPress: () => void,
    disabled = false,
  ) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.chip,
        selected && s.selectedChip,
        disabled && { opacity: 0.35 },
      ]}
    >
      <Text style={[s.label, selected && { color: C.white }]}>{t(label)}</Text>
    </Pressable>
  );
  return (
    <>
      <Text style={s.body}>
        Select a convenient office and time for your visit. All times are in Sri
        Lanka time.
      </Text>
      <Text style={s.h2}>1. {t("Select Office Location")}</Text>
      {offices.map((item) => (
        <Pressable
          key={item.name}
          accessibilityRole="button"
          accessibilityState={{ selected: office === item.name }}
          onPress={() => {
            setOffice(item.name);
            setTime("");
          }}
          style={[
            s.card,
            office === item.name && {
              borderColor: C.teal,
              backgroundColor: C.mint,
            },
          ]}
        >
          <View style={s.between}>
            <Text style={s.label}>{item.name}</Text>
            <Icon
              name={
                office === item.name ? "radio-button-on" : "radio-button-off"
              }
              color={C.teal}
            />
          </View>
          <Text style={s.body}>{item.address}</Text>
        </Pressable>
      ))}
      <Text style={s.h2}>2. {t("Select Date")}</Text>
      <Text style={s.small}>Next four weeks · Weekdays only in this demo</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {dates.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={dateLabel(item, state.language)}
            accessibilityState={{ selected: date === item }}
            onPress={() => {
              setDate(item);
              setTime("");
            }}
            style={[s.dateCard, date === item && s.selectedChip]}
          >
            <Text style={[s.small, date === item && { color: C.white }]}>
              {new Date(`${item}T12:00:00`).toLocaleDateString(
                locale(state.language),
                { weekday: "short" },
              )}
            </Text>
            <Text style={[s.h2, date === item && { color: C.white }]}>
              {Number(item.slice(-2))}
            </Text>
            <Text style={[s.small, date === item && { color: C.white }]}>
              {new Date(`${item}T12:00:00`).toLocaleDateString(
                locale(state.language),
                { month: "short" },
              )}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={s.h2}>3. {t("Select Time")}</Text>
      <View style={s.chipsWrap}>
        {times.map((item) =>
          choice(
            item,
            time === item,
            () => setTime(item),
            !canBook(state.appointments, office, date, item),
          ),
        )}
      </View>
      <Text style={s.h2}>4. {t("Reason for Appointment")}</Text>
      <View style={s.chipsWrap}>
        {reasons.map((item) =>
          choice(item, reason === item, () => setReason(item)),
        )}
      </View>
      <Field
        label={t("Additional Notes (Optional)")}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
        placeholder="What would you like to discuss?"
      />
      <Card>
        <Text style={s.h2}>Your visit</Text>
        <Text style={s.body}>
          {office} · {dateLabel(date, state.language)}
        </Text>
        <Text style={s.body}>
          {time || "Select a time"} · {t(reason)}
        </Text>
      </Card>
      <Button
        title={saving ? "Booking…" : "Confirm Appointment"}
        disabled={
          saving || !time || !canBook(state.appointments, office, date, time)
        }
        onPress={() => {
          setBookingError("");
          setSaving(true);
          Promise.resolve()
            .then(() => onBooked(office, date, time, reason, notes.trim()))
            .catch((error) => setBookingError(error.message))
            .finally(() => setSaving(false));
        }}
        icon="checkmark-circle-outline"
      />
      {!!bookingError && (
        <Text accessibilityRole="alert" style={s.error}>
          {bookingError}
        </Text>
      )}
      <Text style={s.small}>
        This booking is shared with the local admin. Addresses are taken from
        the supplied design and have not been verified.
      </Text>
    </>
  );
}
