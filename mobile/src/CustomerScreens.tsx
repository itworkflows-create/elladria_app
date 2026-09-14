import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File as NativeFile } from "expo-file-system";
import { Button, Card, Empty, Field, s, C } from "./ui";
import type { CustomerClient } from "./useCustomer";
import { validateProfile, type Language } from "./domain";
import { dateLabel } from "./forms";
export function CustomerAuth({
  customer,
  onSuccess,
}: {
  customer: CustomerClient;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"register" | "login">("register"),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setError("");
    if (mode === "register") {
      const issues = validateProfile({ name, phone, email }, password);
      if (Object.keys(issues).length) {
        setError(Object.values(issues)[0]);
        return;
      }
    }
    setBusy(true);
    try {
      await customer.authenticate(mode, { name, phone, email, password });
      setPassword("");
      onSuccess();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <View style={s.hero}>
        <Text style={s.h1}>
          {mode === "register" ? "Create your account" : "Welcome back"}
        </Text>
        <Text style={s.body}>
          Manage your applications, appointments, and documents with Elladria.
        </Text>
      </View>
      <Text style={s.small}>
        Connected local demo. Use fictional personal details and sample
        documents.
      </Text>
      <Card>
        {mode === "register" && (
          <>
            <Field
              label="Full Name"
              value={name}
              onChangeText={setName}
              maxLength={120}
            />
            <Field
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={40}
            />
          </>
        )}
        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          maxLength={160}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          maxLength={128}
        />
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Button
          title={
            busy
              ? "Please wait…"
              : mode === "register"
                ? "Create account"
                : "Sign in"
          }
          disabled={busy}
          onPress={() => void submit()}
        />
        <Button
          secondary
          title={
            mode === "register"
              ? "Already have an account? Sign in"
              : "New here? Create an account"
          }
          disabled={busy}
          onPress={() => {
            setMode(mode === "register" ? "login" : "register");
            setError("");
          }}
        />
      </Card>
    </>
  );
}
export function CustomerProfileView({
  customer,
  onSignIn,
}: {
  customer: CustomerClient;
  onSignIn: () => void;
}) {
  const [kind, setKind] = useState<"CV" | "Document">("CV"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [remove, setRemove] = useState<string | null>(null);
  const data = customer.data;
  async function upload() {
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/png", "image/jpeg"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024)
        throw new Error("Choose a file smaller than 5 MB.");
      setBusy(true);
      const body =
        Platform.OS === "web" && file.file
          ? await file.file.arrayBuffer()
          : await new NativeFile(file.uri).arrayBuffer();
      if (body.byteLength > 5 * 1024 * 1024)
        throw new Error("Choose a file smaller than 5 MB.");
      await customer.upload(
        file.name,
        file.mimeType || "application/octet-stream",
        body,
        kind,
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <>
        <Empty
          icon="person-outline"
          title="Your Elladria account"
          detail="Sign in to submit applications, book appointments, and upload documents."
        />
        <Button title="Sign in / Create account" onPress={onSignIn} />
      </>
    );
  return (
    <>
      <Card>
        <Text style={s.h1}>{data.profile.name}</Text>
        <Text style={s.body}>{data.profile.email}</Text>
        <Text style={s.body}>{data.profile.phone}</Text>
        <Text style={s.badge}>CONNECTED CUSTOMER ACCOUNT</Text>
      </Card>
      {!!customer.error && <Text style={s.error}>{customer.error}</Text>}
      <Card>
        <Text style={s.h2}>My applications</Text>
        {!data.applications.length && (
          <Text style={s.body}>
            Your submitted applications will appear here.
          </Text>
        )}
        {data.applications.map((item) => (
          <View key={item.id} style={{ gap: 6, paddingVertical: 10 }}>
            <Text style={s.label}>{item.jobTitle}</Text>
            <Text style={s.body}>{item.company}</Text>
            <Text style={s.badge}>{item.status}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={s.h2}>My documents</Text>
        <Text style={s.body}>
          Share a CV or supporting document with your recruitment team. PDF, PNG
          or JPEG, up to 5 MB each.
        </Text>
        <View style={s.chipsWrap}>
          {(["CV", "Document"] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === value }}
              style={[s.chip, kind === value && s.selectedChip]}
              onPress={() => setKind(value)}
            >
              <Text style={[s.label, kind === value && { color: C.white }]}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          title={busy ? "Uploading…" : "Upload " + kind}
          icon="cloud-upload-outline"
          disabled={busy}
          onPress={() => void upload()}
        />
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        {!data.files.length && (
          <Text style={s.small}>No documents uploaded yet.</Text>
        )}
        {data.files.map((file) => (
          <View
            key={file.id}
            style={{
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: C.line,
              paddingTop: 14,
            }}
          >
            <Text style={s.label}>{file.name}</Text>
            <Text style={s.small}>
              {file.kind} · {Math.ceil(file.size / 1024)} KB · Shared with admin
            </Text>
            {remove === file.id ? (
              <>
                <Text style={s.body}>
                  Remove this document from your account?
                </Text>
                <Button
                  title="Confirm removal"
                  secondary
                  disabled={busy}
                  onPress={() => {
                    setBusy(true);
                    void customer
                      .action("/files/" + file.id, undefined, "DELETE")
                      .then(() => setRemove(null))
                      .catch((error) => setError(error.message))
                      .finally(() => setBusy(false));
                  }}
                />
                <Button
                  title="Keep document"
                  secondary
                  onPress={() => setRemove(null)}
                />
              </>
            ) : (
              <Button
                title="Remove document"
                secondary
                onPress={() => setRemove(file.id)}
              />
            )}
          </View>
        ))}
      </Card>
      <Button
        title="Sign out"
        secondary
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void customer
            .logout()
            .catch((error) => setError(error.message))
            .finally(() => setBusy(false));
        }}
      />
    </>
  );
}
export function CustomerAppointments({
  customer,
  language,
  onBook,
  onSignIn,
}: {
  customer: CustomerClient;
  language: Language | null;
  onBook: () => void;
  onSignIn: () => void;
}) {
  const [cancel, setCancel] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!customer.data)
    return (
      <>
        <Empty
          icon="calendar-outline"
          title="Your appointments"
          detail="Sign in to book an appointment and share it with the Elladria team."
        />
        <Button title="Sign in / Create account" onPress={onSignIn} />
      </>
    );
  return (
    <>
      <Text style={s.body}>
        Your bookings are shared with the admin team. Times are shown in Sri
        Lanka time.
      </Text>
      <Button title="Make Appointment" icon="add" onPress={onBook} />
      {!!error && <Text style={s.error}>{error}</Text>}
      {!!customer.error && <Text style={s.error}>{customer.error}</Text>}
      {!customer.data.appointments.length && (
        <Empty
          icon="calendar-outline"
          title="No appointments yet"
          detail="Choose an office, date, and time to book your first visit."
        />
      )}
      {[...customer.data.appointments]
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .map((item) => (
          <Card key={item.id}>
            <View style={s.between}>
              <Text style={s.h2}>{item.office}</Text>
              <Text style={s.badge}>{item.status}</Text>
            </View>
            <Text style={s.label}>
              {dateLabel(item.date, language)} · {item.time}
            </Text>
            <Text style={s.body}>{item.reason}</Text>
            {!!item.notes && <Text style={s.body}>{item.notes}</Text>}
            {item.status === "Upcoming" &&
              (cancel === item.id ? (
                <>
                  <Text style={s.body}>Cancel this appointment?</Text>
                  <Button
                    title="Confirm cancellation"
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setBusy(true);
                      void customer
                        .action("/appointments/" + item.id, {}, "PATCH")
                        .then(() => setCancel(null))
                        .catch((error) => setError(error.message))
                        .finally(() => setBusy(false));
                    }}
                  />
                  <Button
                    title="Keep appointment"
                    secondary
                    onPress={() => setCancel(null)}
                  />
                </>
              ) : (
                <Button
                  title="Cancel appointment"
                  secondary
                  onPress={() => setCancel(item.id)}
                />
              ))}
          </Card>
        ))}
    </>
  );
}
