import { AboutLegal, LegalDocument } from "./src/AboutLegal";
import { PasswordRecoveryGate } from "./src/PasswordRecovery";
import { buildNotifications } from "./src/notifications";
import { useNotificationReads } from "./src/useNotificationReads";
import { usePushNotifications } from "./src/pushNotifications";
import { jobImageUrl } from "./src/cloudApi";
﻿import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import {
  canBook,
  filterJobs,
  initialState,
  restoreState,
  toggleItem,
  type DemoState,
  type Job,
} from "./src/domain";
import { translate } from "./src/i18n";
import { Button, Card, Empty, Icon, C, s, type IconName } from "./src/ui";
import { Booking, Registration, dateLabel } from "./src/forms";
import { useCustomer } from "./src/useCustomer";
import {
  CustomerAuth,
  CustomerProfileView,
  CustomerAppointments,
} from "./src/CustomerScreens";
import { cloudEnabled } from "./src/supabase";
import { useCatalog } from "./src/useCatalog";
import AdminPanel from "./src/AdminPanel";
const brandIcon = require("./assets/elladria-app-icon.png");
type Screen =
  | "language"
  | "home"
  | "jobs"
  | "details"
  | "register"
  | "appointments"
  | "booking"
  | "profile"
  | "about"
  | "privacy"
  | "terms"
  | "saved"
  | "notifications"
  | "reminders"
  | "countries"
  | "staff";
type Route = { screen: Screen; jobId?: string };
const STORAGE_KEY = "elladria.demo.v1";
export default function App() {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).has("admin") ||
      window.location.pathname === "/admin")
  )
    return <AdminPanel />;
  return (
    <SafeAreaProvider>
      <PasswordRecoveryGate><MobileApp /></PasswordRecoveryGate>
    </SafeAreaProvider>
  );
}
function MobileApp() {
  const customer = useCustomer();
  usePushNotifications(customer.data?.profile.id);
  const [applying, setApplying] = useState(false);
  const { catalog, connection } = useCatalog();
  const jobs = catalog.jobs;
  const notifications=buildNotifications(catalog.content,customer.data?.applications ?? []);
  const notificationReads=useNotificationReads(customer.data?.profile.id ?? "guest",notifications);
  const featuredJob = jobs.find((item) => item.featured) ?? jobs[0];
  const [state, setState] = useState<DemoState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [routes, setRoutes] = useState<Route[]>([{ screen: "language" }]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<Route | null>(null);
  const route = routes[routes.length - 1];
  const screen = route.screen;
  const t = (text: string) => translate(state.language, text);
  const writeQueue = useRef(Promise.resolve());
  const scroll = useRef<ScrollView>(null);
  const nav = (screen: Screen, jobId?: string) =>
    setRoutes((prev) => [...prev, { screen, jobId }]);
  const tab = (screen: Screen) => {
    setRoutes([{ screen }]);
    setQuery("");
    setCategory("All");
  };
  const back = () =>
    setRoutes((prev) =>
      prev.length > 1 ? prev.slice(0, -1) : [{ screen: "home" }],
    );
  const notify = (message: string) => setNotice(message);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        const restored = raw ? restoreState(raw) : initialState;
        setState(restored);
        setRoutes([{ screen: restored.language ? "home" : "language" }]);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Saved preferences could not be loaded. Changes may not survive a restart.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    writeQueue.current = writeQueue.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)))
      .catch(() => setStorageError("Could not save preferences on this device."));
  }, [state, ready]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (routes.length > 1 || !["home", "language"].includes(screen)) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [routes, screen]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [screen, route.jobId]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const job = jobs.find((item) => item.id === route.jobId);
  const toggle = (key: "saved" | "reminders", id: string) =>
    setState((prev) => ({ ...prev, [key]: toggleItem(prev[key], id) }));
  const requireProfile = (next: Route) => {
    if (!customer.ready) { notify("Restoring your account. Please try again in a moment."); return; }
    if (customer.data) nav(next.screen, next.jobId);
    else {
      setPending(next);
      nav("register");
    }
  };
  const apply = async () => {
    if (!job || applying) return;
    if (!customer.ready) { notify("Restoring your account. Please try again in a moment."); return; }
    if (!customer.data) {
      setPending({ screen: "details", jobId: job.id });
      nav("register");
      return;
    }
    setApplying(true);
    try {
      await customer.action("/applications", { jobId: job.id });
      notify("Application submitted to the recruitment team.");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setApplying(false);
    }
  };
  const jobCard = (item: Job) => (
    <Card key={item.id}>
      {item.imageId && (
        <Image
          source={{ uri: jobImageUrl(item.imageId) }}
          style={{ width: "100%", height: 170, borderRadius: 10 }}
          accessibilityLabel={item.title}
          resizeMode="cover"
        />
      )}
      <View style={s.row}>
        <View style={s.companyIcon}>
          <Icon name={item.icon} size={30} />
        </View>
        <View style={s.flex}>
          <Text style={s.h2}>{item.title}</Text>
          <Text style={s.body}>{item.company}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            state.saved.includes(item.id)
              ? `Unsave ${item.title}`
              : `Save ${item.title}`
          }
          onPress={() => toggle("saved", item.id)}
          style={s.iconButton}
        >
          <Icon
            name={
              state.saved.includes(item.id) ? "bookmark" : "bookmark-outline"
            }
            color={C.teal}
          />
        </Pressable>
      </View>
      <Text style={s.body}>
        {item.city}, {item.country}
      </Text>
      <View style={s.between}>
        <Text style={s.salary}>
          {item.salary}
          <Text style={s.small}> / month</Text>
        </Text>
        <Text style={s.badge}>{cloudEnabled ? "VACANCY" : "DEMO"}</Text>
      </View>
      <Button
        title={t("View Details")}
        onPress={() => nav("details", item.id)}
        secondary
        icon="arrow-forward"
      />
    </Card>
  );
  const titles: Partial<Record<Screen, string>> = {
    jobs: "Jobs",
    details: "Job Details",
    register: "Create Your Profile",
    appointments: "My Appointments",
    booking: "Make Appointment",
    profile: "Profile",
    about: "About & Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    saved: "Saved Jobs",
    reminders: "My Reminders",
    notifications: "Notifications",
    countries: "Browse Countries",
    staff: "Staff Preview",
  };
  if (!ready || (!fontsLoaded && !fontError))
    return (
      <SafeAreaView style={[s.root, s.empty]}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={s.h2}>Elladria</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.root} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      {screen !== "language" && (
        <View style={s.header}>
          {["home", "jobs", "appointments", "profile"].includes(screen) &&
          routes.length === 1 ? (
            <View style={s.brandMark}>
              <Image source={brandIcon} style={s.brandImage} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Back")}
              onPress={back}
              style={s.iconButton}
            >
              <Icon name="arrow-back" />
            </Pressable>
          )}
          <Text numberOfLines={2} style={[s.h2, s.flex]}>
            {screen === "home" ? "Elladria" : t(titles[screen] ?? "Elladria")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${notificationReads.unread.length} unread`}
            onPress={() => nav("notifications")}
            style={s.iconButton}
          >
            <Icon name="notifications-outline" />
            {notificationReads.unread.length > 0 && <View style={{position:'absolute',right:0,top:0,minWidth:19,height:19,paddingHorizontal:4,borderRadius:10,backgroundColor:C.red,alignItems:'center',justifyContent:'center'}}>
              <Text style={{color:C.white,fontSize:11,fontWeight:'700'}}>{notificationReads.unread.length>99?'99+':notificationReads.unread.length}</Text>
            </View>}
          </Pressable>
        </View>
      )}
      {screen !== "language" && (
        <View style={s.demoBar}>
          <Text style={s.demoText}>
            {!cloudEnabled && <>{t("Demo mode")} | </>}
            {connection === "connected"
              ? "Catalog connected"
              : connection === "loading"
                ? "Loading catalog…"
                : "Offline catalog"}{" "}
            · Connected accounts
          </Text>
        </View>
      )}
      {!!storageError && (
        <Text accessibilityRole="alert" style={[s.error, { padding: 12 }]}>
          {storageError}
        </Text>
      )}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.content,
            screen === "language" && { flexGrow: 1, justifyContent: "center" },
          ]}
        >
          {screen === "language" && (
            <>
              <View style={s.welcomeBrand}>
                <View style={[s.brandMark, { width: 56, height: 56 }]}>
                  <Image source={brandIcon} style={s.brandImage} />
                </View>
                <Text style={s.brand}>Elladria</Text>
                <Text style={s.eyebrow}>YOUR FUTURE, BEYOND BORDERS</Text>
              </View>
              <Text style={[s.h1, { textAlign: "center" }]}>
                Select Your Language
              </Text>
              <Text style={[s.body, { textAlign: "center", marginBottom: 14 }]}>
                Please choose your preferred language to continue with your
                Elladria journey.
              </Text>
              {(
                [
                  {
                    code: "si",
                    native: "සිංහල",
                    english: "Sinhala",
                    flag: "🇱🇰",
                  },
                  { code: "ta", native: "தமிழ்", english: "Tamil", flag: "🇱🇰" },
                  {
                    code: "en",
                    native: "English",
                    english: "English",
                    flag: "🇬🇧",
                  },
                ] as const
              ).map((language) => (
                <Pressable
                  key={language.code}
                  accessibilityRole="button"
                  accessibilityLabel={language.english}
                  onPress={() => {
                    setState((prev) => ({ ...prev, language: language.code }));
                    tab("home");
                  }}
                  style={({ pressed }) => [
                    s.languageCard,
                    pressed && { backgroundColor: C.pale },
                  ]}
                >
                  <Text style={{ fontSize: 32 }}>{language.flag}</Text>
                  <View style={s.flex}>
                    <Text style={s.h2}>{language.native}</Text>
                    <Text style={s.body}>{language.english}</Text>
                  </View>
                  <Icon name="chevron-forward" color={C.muted} />
                </Pressable>
              ))}
              <Text style={[s.small, { textAlign: "center", marginTop: 20 }]}>
                {!cloudEnabled && <>Demo preview - Use sample information only.{"\n"}</>}
                Sinhala and Tamil interface translations are drafts.{"\n"}
                Job content is shown in the language provided by the recruitment team.
              </Text>
            </>
          )}
          {screen === "home" && (
            <>
              <View style={s.hero}>
                <Text style={s.eyebrow}>YOUR NEXT CHAPTER STARTS HERE</Text>
                <Text style={s.h1}>{t(catalog.content.heroTitle)}</Text>
                <Text style={s.body}>{catalog.content.heroDescription}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Search jobs, skills or locations")}
                  style={s.search}
                  onPress={() => tab("jobs")}
                >
                  <Icon name="search-outline" color={C.muted} />
                  <Text style={[s.body, s.flex]}>
                    {t("Search jobs, skills or locations")}
                  </Text>
                </Pressable>
              </View>
              {catalog.content.announcementEnabled && (
                <Card>
                  <View style={s.row}>
                    <Icon name="information-circle-outline" color={C.teal} />
                    <Text style={[s.h2, s.flex]}>
                      {catalog.content.announcementTitle}
                    </Text>
                  </View>
                  <Text style={s.body}>{catalog.content.announcementBody}</Text>
                </Card>
              )}
              <Text style={s.h2}>{t("Quick Actions")}</Text>
              <View style={s.grid}>
                {(
                  [
                    {
                      title: "Browse Countries",
                      icon: "globe-outline",
                      page: "countries",
                    },
                    {
                      title: "New Vacancies",
                      icon: "briefcase-outline",
                      page: "jobs",
                    },
                    {
                      title: "Saved Jobs",
                      icon: "bookmark-outline",
                      page: "saved",
                    },
                    {
                      title: "My Reminders",
                      icon: "alarm-outline",
                      page: "reminders",
                    },
                  ] as { title: string; icon: IconName; page: Screen }[]
                ).map((action) => (
                  <Pressable
                    accessibilityRole="button"
                    key={action.page}
                    style={s.quickCard}
                    onPress={() => nav(action.page)}
                  >
                    <View style={s.iconCircle}>
                      <Icon name={action.icon} color={C.teal} />
                    </View>
                    <Text style={[s.label, { textAlign: "center" }]}>
                      {t(action.title)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                style={s.appointmentBanner}
                onPress={() => nav("appointments")}
              >
                <View style={s.iconCircle}>
                  <Icon name="calendar-outline" color={C.teal} />
                </View>
                <View style={s.flex}>
                  <Text style={s.label}>{t("Office Appointments")}</Text>
                  <Text style={s.small}>
                    Let's plan your next step together
                  </Text>
                </View>
                <Icon name="arrow-forward" />
              </Pressable>
              <View style={s.between}>
                <Text style={s.h2}>{t("Featured Vacancy")}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => tab("jobs")}
                  style={s.textButton}
                >
                  <Text style={s.link}>{t("View All")}</Text>
                </Pressable>
              </View>
              {featuredJob ? (
                jobCard(featuredJob)
              ) : (
                <Empty
                  icon="briefcase-outline"
                  title="No vacancies available"
                  detail="New opportunities will appear here when they are published."
                />
              )}
            </>
          )}
          {(screen === "jobs" || screen === "saved") && (
            <>
              <View style={s.search}>
                <Icon name="search-outline" color={C.muted} />
                <TextInput
                  accessibilityLabel={t("Search jobs, skills or locations")}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t("Search jobs, skills or locations")}
                  placeholderTextColor={C.muted}
                  style={[s.body, s.flex, { paddingVertical: 8 }]}
                />
                {!!query && (
                  <Pressable
                    accessibilityLabel="Clear search"
                    accessibilityRole="button"
                    onPress={() => setQuery("")}
                    style={s.iconButton}
                  >
                    <Icon name="close" size={18} />
                  </Pressable>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chips}
              >
                {["All", ...(catalog.categories ?? [...new Set(jobs.map((item) => item.category))])].map(
                  (item) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === item }}
                      key={item}
                      onPress={() => setCategory(item)}
                      style={[s.chip, category === item && s.selectedChip]}
                    >
                      <Text
                        style={[
                          s.label,
                          category === item && { color: C.white },
                        ]}
                      >
                        {t(item)}
                      </Text>
                    </Pressable>
                  ),
                )}
              </ScrollView>
              <Text style={s.small}>
                {
                  filterJobs(
                    query,
                    category,
                    screen === "saved",
                    state.saved,
                    jobs,
                  ).length
                }{" "}
                {cloudEnabled ? "opportunities" : "demo opportunities"}
              </Text>
              {filterJobs(
                query,
                category,
                screen === "saved",
                state.saved,
                jobs,
              ).map(jobCard)}
              {filterJobs(
                query,
                category,
                screen === "saved",
                state.saved,
                jobs,
              ).length === 0 && (
                <Empty
                  icon="search-outline"
                  title={t("No jobs found")}
                  detail={
                    screen === "saved"
                      ? "Save a job using its bookmark icon, or clear your filters."
                      : "Try another job title, city, or category."
                  }
                />
              )}
            </>
          )}
          {screen === "details" && job && (
            <>
              <View style={s.detailHero}>
                {job.imageId && (
                  <Image
                    source={{ uri: jobImageUrl(job.imageId) }}
                    style={{ width: "100%", height: 180, borderRadius: 8 }}
                    accessibilityLabel={job.title}
                    resizeMode="cover"
                  />
                )}
                <View style={s.between}>
                  <Text style={s.badge}>{cloudEnabled ? "VACANCY" : "SAMPLE VACANCY"}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Share job"
                    style={s.iconButton}
                    onPress={() =>
                      Share.share({
                        message: `Elladria vacancy: ${job.title} at ${job.company}, ${job.city}, ${job.country}. ${job.salary}/month.${cloudEnabled ? "" : " Sample listing, not a live offer."}`,
                      }).catch(() =>
                        notify("Unable to open sharing. Please try again."),
                      )
                    }
                  >
                    <Icon name="share-outline" color={C.white} />
                  </Pressable>
                </View>
                <Icon name={job.icon} size={44} color="#dce8f8" />
                <Text style={[s.h1, { color: C.white }]}>{job.title}</Text>
                <Text style={{ color: "#e7eef8", fontSize: 16 }}>
                  {job.company}
                  {"\n"}
                  {job.city}, {job.country}
                </Text>
              </View>
              <Text style={s.h2}>{t("Key Details")}</Text>
              <View style={s.grid}>
                {[
                  ["Salary / month", job.salary, "cash-outline"],
                  ["Working Hours", job.hours, "time-outline"],
                  ["Vacancies", `${job.openings} openings`, "people-outline"],
                  ["Accommodation", job.accommodation, "home-outline"],
                  ["Food / Benefits", job.benefits, "restaurant-outline"],
                  ["Contract Type", job.contract, "document-text-outline"],
                ].map(([label, value, icon]) => (
                  <View key={label} style={s.detailTile}>
                    <Icon name={icon as IconName} color={C.teal} />
                    <Text style={s.small}>{t(label)}</Text>
                    <Text style={s.label}>{t(value)}</Text>
                  </View>
                ))}
              </View>
              <Card>
                <Text style={s.h2}>{t("Requirements")}</Text>
                {job.requirements.map((item) => (
                  <View
                    key={item}
                    style={[s.row, { alignItems: "flex-start" }]}
                  >
                    <Icon name="checkmark-circle" color={C.teal} size={20} />
                    <Text style={[s.body, s.flex]}>{item}</Text>
                  </View>
                ))}
              </Card>
              <Card>
                <Text style={s.h2}>{t("About the Role")}</Text>
                <Text style={s.body}>{job.description}</Text>
              </Card>
              <Button
                title={
                  state.saved.includes(job.id) ? t("Saved") : t("Save Job")
                }
                secondary
                icon={
                  state.saved.includes(job.id) ? "bookmark" : "bookmark-outline"
                }
                onPress={() => toggle("saved", job.id)}
              />
              <Button
                title={
                  state.reminders.includes(job.id)
                    ? t("Reminder set")
                    : t("Remind Me")
                }
                secondary
                icon="alarm-outline"
                onPress={() => {
                  toggle("reminders", job.id);
                  notify(
                    "Saved to My Reminders. No push notification is scheduled.",
                  );
                }}
              />
              <Text style={s.small}>
                Vacancy information is managed by the Elladria team.
                {!cloudEnabled && " This is a demo, not a live recruitment offer."}
              </Text>
            </>
          )}
          {screen === "details" && !job && (
            <Empty
              icon="briefcase-outline"
              title="This job is no longer available"
              detail="It may have been archived or removed. Go back to browse current opportunities."
            />
          )}
          {screen === "register" && (
            <CustomerAuth
              customer={customer}
              onSuccess={() => {
                const next = pending;
                setPending(null);
                if (next)
                  setRoutes((prev) => {
                    const base = prev.slice(0, -1);
                    return base.at(-1)?.screen === next.screen &&
                      base.at(-1)?.jobId === next.jobId
                      ? base
                      : [...base, next];
                  });
                else back();
                notify(
                  "Signed in. Your account is connected to the admin team.",
                );
              }}
            />
          )}
          {screen === "booking" && (
            <Booking
              t={t}
              state={{
                ...state,
                profile: customer.data?.profile ?? null,
                appointments: customer.data?.appointments ?? [],
              }}
              onBooked={async (office, date, time, reason, notes) => {
                await customer.action("/appointments", {
                  office,
                  date,
                  time,
                  reason,
                  notes,
                });
                tab("appointments");
                notify("Appointment booked and shared with the admin team.");
              }}
            />
          )}
          {screen === "appointments" && (
            <CustomerAppointments
              customer={customer}
              language={state.language}
              onBook={() => requireProfile({ screen: "booking" })}
              onSignIn={() => {
                setPending({ screen: "appointments" });
                nav("register");
              }}
            />
          )}
          {screen === "profile" && (
            <>
              <CustomerProfileView
                customer={customer}
                onSignIn={() => {
                  setPending(null);
                  nav("register");
                }}
              />
              <Button
                title={t("Saved Jobs")}
                secondary
                onPress={() => nav("saved")}
              />
              <Button
                title={t("Change Language")}
                secondary
                onPress={() => nav("language")}
              />
              {(catalog.content.supportEmail ||
                catalog.content.supportPhone) && (
                <Card>
                  <Text style={s.h2}>Contact Elladria</Text>
                  <Text selectable style={s.body}>
                    {catalog.content.supportEmail}
                  </Text>
                  <Text selectable style={s.body}>
                    {catalog.content.supportPhone}
                  </Text>
                </Card>
              )}
              <Button title={t("About & Legal")} secondary icon="information-circle-outline" onPress={() => nav("about")} />
              {(state.profile || state.appointments.length > 0) && (
                <Text style={s.small}>
                  Earlier device-only demo records are preserved locally. They
                  have not been uploaded to this account.
                </Text>
              )}
            </>
          )}
          {screen === "about" && <AboutLegal onOpen={nav} supportEmail={catalog.content.supportEmail} supportPhone={catalog.content.supportPhone} t={t} />}
          {(screen === "privacy" || screen === "terms") && <LegalDocument page={screen} />}
          {screen === "notifications" && <>
            <Text style={s.body}>Announcements and your latest application updates. Read status is saved on this device.</Text>
            {!!notificationReads.error && <Text style={s.error}>{notificationReads.error}</Text>}
            {notificationReads.unread.length>0 && <Button secondary title="Mark all as read" onPress={()=>notificationReads.markRead(notifications.map(n=>n.id))} />}
            {!notifications.length && <Empty icon="notifications-outline" title="No notifications yet" detail="Published announcements and application updates will appear here." />}
            {notifications.map(item=><Card key={item.id}>
              <Text style={s.h2}>{item.title}</Text>
              {notificationReads.unread.some(n=>n.id===item.id) && <Text style={[s.badge,{color:C.red}]}>UNREAD</Text>}
              <Text style={s.body}>{item.body}</Text>
              <Button secondary disabled={!notificationReads.ready} title={item.destination==='home'?'View announcement':'View application'} onPress={()=>{
                notificationReads.markRead([item.id]);tab(item.destination);
              }} />
            </Card>)}
          </>}
          {screen === "reminders" && (
            <>
              <Text style={s.body}>
                Your in-app reminder list. Push notifications are not enabled.
              </Text>
              {state.reminders.length === 0 && (
                <Empty
                  icon="alarm-outline"
                  title={t("No reminders yet")}
                  detail="Open a job and tap Remind Me to keep it on this list."
                />
              )}
              {jobs
                .filter((item) => state.reminders.includes(item.id))
                .map((item) => (
                  <Card key={item.id}>
                    <Text style={s.h2}>{item.title}</Text>
                    <Text style={s.body}>
                      {item.city}, {item.country}
                    </Text>
                    <Button
                      title={t("View Details")}
                      onPress={() => nav("details", item.id)}
                    />
                    <Button
                      title="Remove reminder"
                      secondary
                      onPress={() => toggle("reminders", item.id)}
                    />
                  </Card>
                ))}
            </>
          )}
          {screen === "countries" && (
            <>
              <Text style={s.h1}>Explore your next destination</Text>
              <Text style={s.body}>
                Countries with currently published opportunities.
              </Text>
              {[...new Set(jobs.map((item) => item.country))].map((country) => (
                <Card key={country}>
                  <Icon name="globe-outline" size={40} color={C.teal} />
                  <Text style={s.h1}>{country}</Text>
                  <Text style={s.body}>
                    {[
                      ...new Set(
                        jobs
                          .filter((item) => item.country === country)
                          .map((item) => item.city),
                      ),
                    ].join(" · ")}
                  </Text>
                  <Text style={s.badge}>
                    {jobs.filter((item) => item.country === country).length}{" "}
                    {cloudEnabled ? "VACANCIES" : "DEMO VACANCIES"}
                  </Text>
                  <Button
                    title={t("New Vacancies")}
                    onPress={() => {
                      setQuery(country);
                      setCategory("All");
                      nav("jobs");
                    }}
                  />
                </Card>
              ))}
              {!jobs.length && (
                <Empty
                  icon="globe-outline"
                  title="No destinations yet"
                  detail="Countries appear here as jobs are published."
                />
              )}
            </>
          )}
          {screen === "staff" && (
            <>
              <Text style={s.eyebrow}>ELLADRIA · STAFF PORTAL PREVIEW</Text>
              <Text style={s.h1}>Overview & Tasks</Text>
              <Text style={s.body}>
                A mobile adaptation of the supplied staff dashboard, using this
                device's demo activity.
              </Text>
              <View style={s.grid}>
                {[
                  [
                    "Upcoming visits",
                    state.appointments.filter(
                      (item) => item.status === "Upcoming",
                    ).length,
                  ],
                  ["Demo candidates", state.profile ? 1 : 0],
                  ["Open vacancies", jobs.length],
                  ["Applications", state.applications.length],
                ].map(([label, value]) => (
                  <View key={label} style={s.detailTile}>
                    <Text style={s.h1}>{value}</Text>
                    <Text style={s.small}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.h2}>Appointments queue</Text>
              {state.appointments.filter((item) => item.status === "Upcoming")
                .length === 0 && (
                <Card>
                  <Text style={s.body}>
                    No pending appointments. Book a demo visit from the
                    candidate screens to populate this queue.
                  </Text>
                </Card>
              )}
              {state.appointments
                .filter((item) => item.status === "Upcoming")
                .map((item) => (
                  <Card key={item.id}>
                    <Text style={s.h2}>{item.candidate}</Text>
                    <Text style={s.body}>
                      {item.office} · {dateLabel(item.date, state.language)} ·{" "}
                      {item.time}
                    </Text>
                    <Text style={s.body}>{t(item.reason)}</Text>
                    <Button
                      title="Mark completed"
                      secondary
                      icon="checkmark-circle-outline"
                      onPress={() =>
                        setState((prev) => ({
                          ...prev,
                          appointments: prev.appointments.map((appt) =>
                            appt.id === item.id
                              ? { ...appt, status: "Completed" }
                              : appt,
                          ),
                        }))
                      }
                    />
                  </Card>
                ))}
              <Text style={s.h2}>Candidate directory</Text>
              <Card>
                {state.profile ? (
                  <>
                    <Text style={s.label}>{state.profile.name}</Text>
                    <Text style={s.body}>{state.profile.email}</Text>
                    <Text style={s.body}>{state.profile.phone}</Text>
                  </>
                ) : (
                  <Text style={s.body}>
                    Create a demo profile to see a candidate here.
                  </Text>
                )}
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {!!notice && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={() => setNotice("")}
          style={s.toast}
        >
          <Text accessibilityLiveRegion="polite" style={s.toastText}>
            {notice}
          </Text>
          <Icon name="close" size={18} color={C.white} />
        </Pressable>
      )}
      {screen === "details" && job && (
        <View style={s.footer}>
          <Button
            title={
              customer.data?.applications.some((item) => item.jobId === job.id)
                ? t("Applied")
                : t("Apply Now")
            }
            disabled={
              applying ||
              customer.data?.applications.some((item) => item.jobId === job.id)
            }
            onPress={() => void apply()}
            icon="arrow-forward"
          />
        </View>
      )}
      {!["language", "register", "booking", "details"].includes(screen) && (
        <View style={s.tabs}>
          {(
            [
              { page: "home", title: "Home", icon: "home-outline" },
              { page: "jobs", title: "Jobs", icon: "briefcase-outline" },
              {
                page: "appointments",
                title: "Appts",
                icon: "calendar-outline",
              },
              { page: "profile", title: "Profile", icon: "person-outline" },
            ] as { page: Screen; title: string; icon: IconName }[]
          ).map((item) => (
            <Pressable
              key={item.page}
              accessibilityRole="tab"
              accessibilityState={{ selected: screen === item.page }}
              onPress={() => tab(item.page)}
              style={s.tab}
            >
              <View
                style={[
                  s.tabIcon,
                  screen === item.page && { backgroundColor: C.blue },
                ]}
              >
                <Icon
                  name={item.icon}
                  color={screen === item.page ? C.navy : C.muted}
                />
              </View>
              <Text
                style={[
                  s.tabText,
                  screen === item.page && {
                    color: C.navy,
                    fontFamily: "Inter_700Bold",
                  },
                ]}
              >
                {t(item.title)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
