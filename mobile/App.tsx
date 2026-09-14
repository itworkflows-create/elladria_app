import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  jobs,
  restoreState,
  toggleItem,
  type DemoState,
  type Job,
} from "./src/domain";
import { translate } from "./src/i18n";
import { Button, Card, Empty, Icon, C, s, type IconName } from "./src/ui";
import { Booking, Registration, dateLabel } from "./src/forms";
type Screen =
  | "language"
  | "home"
  | "jobs"
  | "details"
  | "register"
  | "appointments"
  | "booking"
  | "profile"
  | "saved"
  | "reminders"
  | "countries"
  | "staff";
type Route = { screen: Screen; jobId?: string };
const STORAGE_KEY = "elladria.demo.v1";
export default function App() {
  return (
    <SafeAreaProvider>
      <MobileApp />
    </SafeAreaProvider>
  );
}
function MobileApp() {
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
            "Saved demo data could not be loaded. Changes may not survive a restart.",
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
      .catch(() => setStorageError("Could not save demo data on this device."));
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
  const job = jobs.find((item) => item.id === route.jobId) ?? jobs[0];
  const toggle = (key: "saved" | "reminders", id: string) =>
    setState((prev) => ({ ...prev, [key]: toggleItem(prev[key], id) }));
  const requireProfile = (next: Route) => {
    if (state.profile) nav(next.screen, next.jobId);
    else {
      setPending(next);
      nav("register");
    }
  };
  const apply = () => {
    if (!state.profile) {
      setPending({ screen: "details", jobId: job.id });
      nav("register");
      return;
    }
    setState((prev) => ({
      ...prev,
      applications: prev.applications.includes(job.id)
        ? prev.applications
        : [...prev.applications, job.id],
    }));
    notify("Demo application saved. Nothing was sent to an employer.");
  };
  const jobCard = (item: Job) => (
    <Card key={item.id}>
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
      <Text style={s.body}>🇷🇴 {item.city}, Romania</Text>
      <View style={s.between}>
        <Text style={s.salary}>
          {item.salary}
          <Text style={s.small}> / month</Text>
        </Text>
        <Text style={s.badge}>DEMO</Text>
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
    saved: "Saved Jobs",
    reminders: "My Reminders",
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
              <Text style={s.brandLetter}>E</Text>
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
            accessibilityLabel={t("My Reminders")}
            onPress={() => nav("reminders")}
            style={s.iconButton}
          >
            <Icon name="notifications-outline" />
            {state.reminders.length > 0 && <View style={s.dot} />}
          </Pressable>
        </View>
      )}
      {screen !== "language" && (
        <View style={s.demoBar}>
          <Text style={s.demoText}>
            {t("Demo mode")} · Sample jobs & local bookings
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
                  <Text style={[s.brandLetter, { fontSize: 32 }]}>E</Text>
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
                Demo preview · Use sample information only.{"\n"}Sinhala and
                Tamil interface translations are drafts.{"\n"}Sample job content
                is in English.
              </Text>
            </>
          )}
          {screen === "home" && (
            <>
              <View style={s.hero}>
                <Text style={s.eyebrow}>SRI LANKA → ROMANIA</Text>
                <Text style={s.h1}>
                  {t("Find your opportunity in Romania")} 🇷🇴
                </Text>
                <Text style={s.body}>
                  Explore jobs, plan your office visit, and take the next step
                  in your career.
                </Text>
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
              {jobCard(jobs[0])}
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
                {["All", "Manufacturing", "Hospitality", "Logistics"].map(
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
                  filterJobs(query, category, screen === "saved", state.saved)
                    .length
                }{" "}
                demo opportunities
              </Text>
              {filterJobs(query, category, screen === "saved", state.saved).map(
                jobCard,
              )}
              {filterJobs(query, category, screen === "saved", state.saved)
                .length === 0 && (
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
          {screen === "details" && (
            <>
              <View style={s.detailHero}>
                <View style={s.between}>
                  <Text style={s.badge}>SAMPLE VACANCY</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Share job"
                    style={s.iconButton}
                    onPress={() =>
                      Share.share({
                        message: `Elladria demo vacancy: ${job.title} at ${job.company}, ${job.city}, Romania. ${job.salary}/month. Sample listing, not a live offer.`,
                      }).catch(() =>
                        notify("Unable to open sharing. Please try again."),
                      )
                    }
                  >
                    <Icon name="share-outline" color={C.white} />
                  </Pressable>
                </View>
                <Icon name={job.icon} size={44} color="#86f2e4" />
                <Text style={[s.h1, { color: C.white }]}>{job.title} 🇷🇴</Text>
                <Text style={{ color: "#dce9ff", fontSize: 16 }}>
                  {job.company}
                  {"\n"}
                  {job.city}, Romania
                </Text>
              </View>
              <Text style={s.h2}>{t("Key Details")}</Text>
              <View style={s.grid}>
                {[
                  ["Salary / month", job.salary, "cash-outline"],
                  ["Working Hours", "40 hrs / week", "time-outline"],
                  ["Vacancies", `${job.openings} openings`, "people-outline"],
                  ["Accommodation", "Included", "home-outline"],
                  ["Food / Benefits", "Provided", "restaurant-outline"],
                  ["Contract Type", "Full-time", "document-text-outline"],
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
                    "Demo reminders appear in My Reminders. No push notification is scheduled.",
                  );
                }}
              />
              <Text style={s.small}>
                All vacancy details are sample data from the design or
                illustrative examples.
              </Text>
            </>
          )}
          {screen === "register" && (
            <Registration
              t={t}
              onSave={(profile) => {
                setState((prev) => ({ ...prev, profile }));
                if (pending) {
                  const next = pending;
                  setPending(null);
                  setRoutes((prev) => {
                    const base = prev.slice(0, -1);
                    const last = base[base.length - 1];
                    return last?.screen === next.screen &&
                      last?.jobId === next.jobId
                      ? base
                      : [...base, next];
                  });
                } else back();
                notify(
                  "Demo profile created on this device. No account was registered.",
                );
              }}
            />
          )}
          {screen === "booking" && (
            <Booking
              t={t}
              state={state}
              onBooked={(office, date, time, reason, notes) => {
                if (!state.profile) {
                  requireProfile({ screen: "booking" });
                  return;
                }
                if (!canBook(state.appointments, office, date, time)) {
                  notify(
                    "That demo time is unavailable. Please select another time.",
                  );
                  return;
                }
                setState((prev) => ({
                  ...prev,
                  appointments: [
                    ...prev.appointments,
                    {
                      id: `DEMO-${Date.now().toString(36).toUpperCase()}`,
                      office,
                      date,
                      time,
                      reason,
                      notes,
                      candidate: prev.profile!.name,
                      status: "Upcoming",
                    },
                  ],
                }));
                tab("appointments");
                notify(
                  "Demo appointment saved. No real office booking was made.",
                );
              }}
            />
          )}
          {screen === "appointments" && (
            <>
              <Text style={s.body}>
                Meet the team and plan your next step. These bookings are stored
                only on this device.
              </Text>
              <Button
                title={t("Make Appointment")}
                icon="add"
                onPress={() => requireProfile({ screen: "booking" })}
              />
              {state.appointments.length === 0 && (
                <Empty
                  icon="calendar-outline"
                  title={t("No appointments yet")}
                  detail="Choose an office, date, and time to try the booking flow."
                />
              )}
              {[...state.appointments]
                .sort((a, b) =>
                  `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
                )
                .map((item) => (
                  <Card key={item.id}>
                    <View style={s.between}>
                      <Text style={[s.h2, s.flex]}>{item.office}</Text>
                      <Text
                        style={[
                          s.badge,
                          item.status === "Cancelled" && {
                            backgroundColor: "#f2f2f2",
                            color: C.muted,
                          },
                        ]}
                      >
                        {t(item.status)}
                      </Text>
                    </View>
                    <Text style={s.label}>
                      {dateLabel(item.date, state.language)} · {item.time}
                    </Text>
                    <Text style={s.body}>{t(item.reason)}</Text>
                    {!!item.notes && <Text style={s.body}>{item.notes}</Text>}
                    <Text style={s.small}>{item.id} · Sri Lanka time</Text>
                    {item.status === "Upcoming" && (
                      <Button
                        secondary
                        title={t("Cancel")}
                        onPress={() =>
                          Alert.alert(
                            "Cancel demo appointment?",
                            "This removes the appointment from your upcoming demo visits.",
                            [
                              { text: "Keep appointment", style: "cancel" },
                              {
                                text: "Cancel appointment",
                                style: "destructive",
                                onPress: () =>
                                  setState((prev) => ({
                                    ...prev,
                                    appointments: prev.appointments.map(
                                      (appt) =>
                                        appt.id === item.id
                                          ? { ...appt, status: "Cancelled" }
                                          : appt,
                                    ),
                                  })),
                              },
                            ],
                          )
                        }
                      />
                    )}
                  </Card>
                ))}
            </>
          )}
          {screen === "profile" && (
            <>
              {state.profile ? (
                <Card>
                  <View style={s.iconCircle}>
                    <Icon name="person-outline" color={C.teal} size={30} />
                  </View>
                  <Text style={s.h1}>{state.profile.name}</Text>
                  <Text style={s.body}>{state.profile.email}</Text>
                  <Text style={s.body}>{state.profile.phone}</Text>
                  <Text style={s.badge}>LOCAL DEMO PROFILE</Text>
                </Card>
              ) : (
                <>
                  <Empty
                    icon="person-outline"
                    title={t("Create Your Profile")}
                    detail="Try applications and office appointments with a local demo profile."
                  />
                  <Button
                    title={t("Create Demo Profile")}
                    onPress={() => {
                      setPending(null);
                      nav("register");
                    }}
                  />
                </>
              )}
              <Card>
                <Text style={s.h2}>{t("My Applications")}</Text>
                {state.applications.length === 0 ? (
                  <Text style={s.body}>
                    Your demo applications will appear here.
                  </Text>
                ) : (
                  jobs
                    .filter((item) => state.applications.includes(item.id))
                    .map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        style={s.listRow}
                        onPress={() => nav("details", item.id)}
                      >
                        <View style={s.flex}>
                          <Text style={s.label}>{item.title}</Text>
                          <Text style={s.small}>
                            Saved locally · Not submitted
                          </Text>
                        </View>
                        <Icon name="chevron-forward" />
                      </Pressable>
                    ))
                )}
              </Card>
              <Button
                title={t("Saved Jobs")}
                secondary
                icon="bookmark-outline"
                onPress={() => nav("saved")}
              />
              <Button
                title={t("Change Language")}
                secondary
                icon="language-outline"
                onPress={() => nav("language")}
              />
              <Button
                title={t("Staff Preview")}
                secondary
                icon="people-outline"
                onPress={() => nav("staff")}
              />
              <Text style={s.small}>
                Demo mode does not create a real account or contact an employer.
                Use fictional personal details. Staff Preview is a public demo
                screen, not a protected staff account.
              </Text>
              <Button
                title="Reset demo data"
                secondary
                onPress={() =>
                  Alert.alert(
                    "Reset this demo?",
                    "This clears the profile, saved jobs, applications, reminders, and appointments on this device.",
                    [
                      { text: "Keep data", style: "cancel" },
                      {
                        text: "Reset",
                        style: "destructive",
                        onPress: () => {
                          setState(initialState);
                          setPending(null);
                          setRoutes([{ screen: "language" }]);
                        },
                      },
                    ],
                  )
                }
              />
            </>
          )}
          {screen === "reminders" && (
            <>
              <Text style={s.body}>
                Your in-app reminder list. Push notifications are not enabled in
                this demo.
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
                    <Text style={s.body}>{item.city}, Romania</Text>
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
              <Text style={s.h1}>A new chapter in Europe</Text>
              <Text style={s.body}>
                Explore the destination in your Elladria design.
              </Text>
              <Card>
                <Text style={{ fontSize: 54 }}>🇷🇴</Text>
                <Text style={s.h1}>Romania</Text>
                <Text style={s.body}>Bucharest · Brașov · Cluj-Napoca</Text>
                <Text style={s.body}>
                  Manufacturing, hospitality, and logistics opportunities.
                </Text>
                <Text style={s.badge}>{jobs.length} DEMO VACANCIES</Text>
                <Button
                  title={t("New Vacancies")}
                  onPress={() => {
                    setQuery("");
                    setCategory("All");
                    nav("jobs");
                  }}
                />
              </Card>
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
      {screen === "details" && (
        <View style={s.footer}>
          <Button
            title={
              state.applications.includes(job.id)
                ? t("Applied")
                : t("Apply Now")
            }
            disabled={state.applications.includes(job.id)}
            onPress={apply}
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
