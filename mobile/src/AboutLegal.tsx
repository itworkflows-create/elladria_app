import React from "react";
import { Alert, Linking, Text } from "react-native";
import Constants from "expo-constants";
import appConfig from "../app.json";
import { Button, Card, s } from "./ui";

export type LegalPage = "privacy" | "terms";
const documents: Record<LegalPage, { title: string; body: string }[]> = {
  privacy: [
    { title: "Who we are", body: "Elladria Lanka (PVT) LTD, Licence No. 3627. For questions about your information, telephone 037 220 1125 or visit https://www.elladria.com." },
    { title: "Information you provide", body: "The app uses your account details, including your name, email address and phone number, together with applications, appointment details and documents you choose to upload, to support recruitment services." },
    { title: "How information is used", body: "Your submitted applications, appointments and uploaded documents are available to the Elladria recruitment team. The app uses Supabase for account authentication, database storage and file storage." },
    { title: "Notifications", body: "If you allow notifications, the app registers a device push token linked to your account to deliver announcements and application updates through Expo and the platform notification service. You can turn notifications off in your device settings." },
    { title: "Information on your device", body: "The app saves preferences, saved jobs, reminder lists and notification read status on your device. Account sessions are stored using secure storage on mobile devices. Earlier demo records may also remain on this device." },
    { title: "Your account and documents", body: "You can remove uploaded documents from Profile. Signed-in candidates can use Delete my account in Profile and confirm with their password. If the service cannot complete a request, the app displays an error so you can retry or contact Elladria." },
    { title: "Retention", body: "Applications are retained for 6 months after an unsuccessful recruitment process ends. Uploaded documents are retained for 3 months." },
    { title: "Advertising and tracking", body: "There is no third-party advertising or tracking. Elladria publishes only its own job vacancies." },
    { title: "External processors", body: "Elladria's external processors are Supabase and Expo only. Supabase provides authentication, database storage and file storage; Expo supports app services and push notification delivery." },
  ],
  terms: [
    { title: "Using Elladria", body: "Elladria Lanka (PVT) LTD, Licence No. 3627, helps you browse vacancies, submit applications, book appointments and share supporting documents with the recruitment team." },
    { title: "Your responsibilities", body: "Provide accurate information, upload only documents you are entitled to share, and keep your sign-in details private. Do not misuse the service or attempt to access another person's account or information." },
    { title: "Vacancies and applications", body: "Submitting an application or booking an appointment does not guarantee employment, an interview or a visa. Confirm job details, eligibility, fees and any contractual arrangements directly with Elladria before making a commitment." },
    { title: "Availability and updates", body: "Vacancies and appointment availability can change. An offline catalog may show previously loaded information. Check the latest details with the recruitment team." },
    { title: "Contact", body: "For service enquiries, telephone 037 220 1125 or visit https://www.elladria.com." },
  ],
};

async function openContact(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Unable to open link", "Please use the contact details shown on this page.");
  }
}

export function AboutLegal({ onOpen, supportEmail, t }: {
  onOpen: (page: LegalPage) => void;
  supportEmail: string;
  supportPhone: string;
  t: (text: string) => string;
}) {
  return <>
    <Card>
      <Text accessibilityRole="header" style={s.h1}>Elladria Lanka (PVT) LTD</Text>
      <Text style={s.body}>Reliable overseas travel service.</Text>
      <Text selectable style={s.body}>Licence No. 3627</Text>
      <Text selectable style={s.small}>Version {Constants.expoConfig?.version ?? appConfig.expo.version}</Text>
    </Card>
    <Card>
      <Text accessibilityRole="header" style={s.h2}>Placement countries</Text>
      <Text style={s.body}>Romania, Latvia, Ireland, Kuwait, Oman, Qatar, and the United Arab Emirates.</Text>
    </Card>
    <Card>
      <Text accessibilityRole="header" style={s.h2}>{t("Legal information")}</Text>
      <Text style={s.body}>Read our Privacy Policy and Terms of Use in English.</Text>
      <Button secondary icon="shield-checkmark-outline" title={t("Privacy Policy")} onPress={() => onOpen("privacy")} />
      <Button secondary icon="document-text-outline" title={t("Terms of Use")} onPress={() => onOpen("terms")} />
    </Card>
    <Card>
      <Text accessibilityRole="header" style={s.h2}>{t("Contact Elladria")}</Text>
      {supportEmail ? <Text selectable style={s.body}>{supportEmail}</Text> : null}
      <Button secondary icon="call-outline" title="037 220 1125" onPress={() => void openContact("tel:+94372201125")} />
      <Button secondary icon="globe-outline" title="https://www.elladria.com" onPress={() => void openContact("https://www.elladria.com")} />
    </Card>
    <Card>
      <Text accessibilityRole="header" style={s.h2}>Social media</Text>
      <Text selectable style={s.body}>Facebook: Elladria Lanka</Text>
      <Text selectable style={s.body}>Facebook: Second official page</Text>
      <Text selectable style={s.body}>TikTok: @elladria.lanka.of</Text>
    </Card>
  </>;
}

export function LegalDocument({ page }: { page: LegalPage }) {
  return <>
    <Card>
      <Text style={s.badge}>Elladria Lanka (PVT) LTD</Text>
      <Text style={s.body}>Updated 21 September 2026.</Text>
    </Card>
    {documents[page].map(section => <Card key={section.title}>
      <Text accessibilityRole="header" style={s.h2}>{section.title}</Text>
      <Text selectable style={s.body}>{section.body}</Text>
    </Card>)}
  </>;
}
