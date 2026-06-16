import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import fetchBulsuColleges from "@/constants/CollegeBuildings";
import fetchGates from "@/constants/Gates";
import {
  clearReportDraft,
  getReportDraft,
  setReportDraft,
} from "@/constants/reportDraft";
import fetchSharedStudentSpaces from "@/constants/SharedStudentSpaces";
import { getToken } from "@/constants/StudentData";
import { buildLocationLost, validateReportPage2 } from "@/utils/lostReport";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DatePicker from "react-native-date-picker";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

const CustomCheckbox = ({ label, value, onValueChange, disabled }) => (
  <TouchableOpacity
    style={styles.checkboxContainer}
    onPress={() => !disabled && onValueChange(!value)}
    activeOpacity={disabled ? 1 : 0.7}
    disabled={disabled}
  >
    <MaterialIcons
      name={value ? "check-box" : "check-box-outline-blank"}
      size={22}
      color={value ? AppColors.background : "#757575"}
    />
    <Text style={[styles.checkboxLabel, disabled && styles.disabledText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const NestedDropdownHeader = ({ title, isOpen, disabled, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.nestedHeader, disabled && styles.nestedHeaderDisabled]}
      activeOpacity={0.7}
    >
      <Text style={[styles.nestedHeaderTitle, disabled && styles.disabledText]}>
        {title}
      </Text>
      <MaterialIcons
        name={isOpen ? "keyboard-arrow-down" : "keyboard-arrow-right"}
        size={22}
        color="#900014"
      />
    </TouchableOpacity>
  );
};

function parseLocationLost(
  locationLost,
  collegesList = [],
  spacesList = [],
  gatesList = [],
) {
  if (!locationLost)
    return { colleges: [], spaces: [], gates: [], cantRemember: false };

  let rawLocations = [];

  if (typeof locationLost === "string") {
    try {
      const parsed = JSON.parse(locationLost);
      if (Array.isArray(parsed)) rawLocations = parsed;
      else rawLocations = [parsed];
    } catch {
      if (locationLost.includes(",")) {
        rawLocations = locationLost.split(",").map((item) => item.trim());
      } else {
        rawLocations = [locationLost.trim()];
      }
    }
  } else if (Array.isArray(locationLost)) {
    rawLocations = locationLost;
  }

  const locations = rawLocations
    .map((l) => {
      if (!l) return "";
      if (typeof l === "object") {
        return (
          l.college_name ||
          l.shared_space_name ||
          l.gate_name ||
          l.name ||
          ""
        )
          .trim()
          .toLowerCase();
      }
      return String(l).trim().toLowerCase();
    })
    .filter(Boolean);

  const cantRememberMatch = locations.some(
    (l) => l === "can't remember" || l === "cant remember",
  );
  if (cantRememberMatch || locations.length === 0) {
    return { colleges: [], spaces: [], gates: [], cantRemember: true };
  }

  const safeColleges = Array.isArray(collegesList) ? collegesList : [];
  const safeSpaces = Array.isArray(spacesList) ? spacesList : [];
  const safeGates = Array.isArray(gatesList) ? gatesList : [];

  const systemColleges = safeColleges.map((c) => String(c || ""));
  const systemSpaces = safeSpaces.map((s) => String(s || ""));
  const systemGates = safeGates.map((g) => String(g || ""));

  return {
    colleges: systemColleges.filter((item) =>
      locations.includes(item.trim().toLowerCase()),
    ),
    spaces: systemSpaces.filter((item) =>
      locations.includes(item.trim().toLowerCase()),
    ),
    gates: systemGates.filter((item) =>
      locations.includes(item.trim().toLowerCase()),
    ),
    cantRemember: false,
  };
}

// Parses a stored lost_date string (with or without a timezone offset) into a
// local-time Date object for the date/time pickers. Returns null if invalid.
function parseLostDateToDate(lostDate) {
  if (!lostDate) return null;

  const rawClean = String(lostDate)
    .replace(/\+\d{2}(:\d{2})?$/, "")
    .replace(/\+00$/, "")
    .replace("T", " ")
    .trim();

  const parts = rawClean.split(" ");
  const dateParts = parts[0].split("-");
  const timeParts = parts[1] ? parts[1].split(":") : ["00", "00", "00"];

  const d = new Date(
    parseInt(dateParts[0], 10),
    parseInt(dateParts[1], 10) - 1,
    parseInt(dateParts[2], 10),
    parseInt(timeParts[0], 10),
    parseInt(timeParts[1], 10),
    parseInt(timeParts[2], 10) || 0,
  );

  return isNaN(d.getTime()) ? null : d;
}

export default function ProfileReportHistoryEditNext() {
  const router = useRouter();
  const { report: reportParam, viewOnly } = useLocalSearchParams();
  const isViewOnly = viewOnly === "true";
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState(null);

  const [collegesList, setCollegesList] = useState([]);
  const [spacesList, setSpacesList] = useState([]);
  const [gatesList, setGatesList] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [cantRemember, setCantRemember] = useState(false);
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [selectedGates, setSelectedGates] = useState([]);
  const [showLocation, setShowLocation] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [openCalendar, setOpenCalendar] = useState(false);
  const [openClock, setOpenClock] = useState(false);
  const [openSubSection, setOpenSubSection] = useState(null);

  const mainRotation = useSharedValue(0);
  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${mainRotation.value}deg` }],
  }));

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [collegesData, spacesData, gatesData] = await Promise.all([
          fetchBulsuColleges(),
          fetchSharedStudentSpaces(),
          fetchGates(),
        ]);

        setCollegesList(collegesData);
        setSpacesList(spacesData);
        setGatesList(gatesData);
      } catch (error) {
        console.error("Failed to load location dropdown records:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadDropdownData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // View-only mode: build the equivalent "draft" straight from the report
      // param — no AsyncStorage draft involved, nothing to redirect on.
      if (isViewOnly) {
        const fresh = reportParam ? JSON.parse(reportParam) : {};

        setDraft({
          reportId: fresh.lost_report_id,
          itemName: fresh.item_name ?? "",
          description: fresh.description ?? "",
          contents: fresh.contents ?? "",
          categoryId: fresh.category_id ?? "",
          locationLost: fresh.location_lost ?? "",
          lostDate: fresh.actual_lost_date ?? fresh.lost_date ?? null,
          imageUri: null,
        });

        const d = parseLostDateToDate(
          fresh.actual_lost_date ?? fresh.lost_date,
        );
        if (d) {
          setDate(d);
          setTime(d);
        }

        setErrors({});
        return;
      }

      const saved = getReportDraft();
      if (!saved) {
        Alert.alert("Incomplete form", "Please start from page 1.", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/profileReportHistory"),
          },
        ]);
        return;
      }

      setDraft(saved);

      if (saved.lostDate) {
        const d = parseLostDateToDate(saved.lostDate);

        console.log("=== DATE PICKER PARSE CONTEXT ===");
        console.log("- Source local timestamp value:", saved.lostDate);
        console.log(
          "- Successfully initialized Date context object:",
          d ? d.toString() : "invalid",
        );
        console.log("=================================");

        if (d) {
          setDate(d);
          setTime(d);
        }
      }

      setErrors({});
    }, [router, isViewOnly, reportParam]),
  );

  useEffect(() => {
    if (!draft || isLoadingData) return;

    const rawLocationField = draft.locationLost || draft.location_lost || "";

    // ─── ADDED: EXPLICIT LOG PRINTING FOR THE WHOLE ITEM DATA ───
    console.log("===========================================================");
    console.log(
      "👉 WHOLE ITEM DRAFT DATA CONTEXT:",
      JSON.stringify(draft, null, 2),
    );
    console.log("===========================================================");

    console.log("=============== FOUNDNEST EDIT PAGE 2 DEBUG ===============");
    console.log(
      "1. DISCOVERED LOCATIONlost DATABASE FIELD VALUE:",
      rawLocationField,
    );
    console.log("2. AVAILABLE COGNIZANT LISTS FROM BACKEND HELPERS:");
    console.log("   - collegesList Array:", collegesList);
    console.log("   - spacesList Array:", spacesList);
    console.log("   - gatesList Array:", gatesList);

    const parsed = parseLocationLost(
      rawLocationField,
      collegesList,
      spacesList,
      gatesList,
    );

    console.log("3. FINAL EVALUATED CHECKBOX CROSS-REFERENCES RECOVERED:");
    console.log("   - Match Check colleges Result:", parsed.colleges);
    console.log("   - Match Check spaces Result:", parsed.spaces);
    console.log("   - Match Check gates Result:", parsed.gates);
    console.log("===========================================================");

    setSelectedColleges(parsed.colleges);
    setSelectedSpaces(parsed.spaces);
    setSelectedGates(parsed.gates);
    setCantRemember(parsed.cantRemember);

    if (
      parsed.colleges.length > 0 ||
      parsed.spaces.length > 0 ||
      parsed.gates.length > 0
    ) {
      setShowLocation(true);
      mainRotation.value = 180;
    }
  }, [draft, collegesList, spacesList, gatesList, isLoadingData]);

  const handleMainLocationPress = () => {
    const nextState = !showLocation;
    setShowLocation(nextState);
    mainRotation.value = withTiming(nextState ? 180 : 0, { duration: 300 });
    if (nextState && errors.location) {
      setErrors((prev) => ({ ...prev, location: undefined }));
    }
  };

  const toggleSubSection = (section) => {
    if (cantRemember) return;
    setOpenSubSection(openSubSection === section ? null : section);
  };

  const clearLocationError = () => {
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: undefined }));
    }
  };

  const handleCantRememberChange = () => {
    const nextVal = !cantRemember;
    setCantRemember(nextVal);
    if (nextVal) {
      setSelectedColleges([]);
      setSelectedSpaces([]);
      setSelectedGates([]);
      setOpenSubSection(null);
    }
    clearLocationError();
  };

  const handleLocationSelectionChange =
    (currentSelection, setter) => (item) => {
      let newSelection = [...currentSelection];
      if (newSelection.includes(item)) {
        newSelection = newSelection.filter((i) => i !== item);
      } else {
        newSelection.push(item);
      }
      setter(newSelection);
      setCantRemember(false);
      clearLocationError();
    };

  const formatDataList = (sourceData) => {
    return Array.isArray(sourceData)
      ? sourceData.map((item) =>
          item && typeof item === "object"
            ? item.college_name ||
              item.shared_space_name ||
              item.gate_name ||
              item.name
            : item,
        )
      : [];
  };

  const handleBack = () => {
    const saved = getReportDraft();

    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    const localISO =
      `${combined.getFullYear()}-${pad(combined.getMonth() + 1)}-${pad(combined.getDate())}` +
      `T${pad(combined.getHours())}:${pad(combined.getMinutes())}:00`;

    setReportDraft({
      ...saved,
      locationLost: buildLocationLost({
        cantRemember,
        colleges: selectedColleges,
        spaces: selectedSpaces,
        gates: selectedGates,
      }),
      lostDate: localISO,
    });

    router.navigate({
      pathname: "/(tabs)/profileReportHistoryEdit",
      params: {
        report: saved?.reportParam ?? "",
        editSession: saved?.editSession ?? "",
        fromBack: "true",
      },
    });
  };

  const handleSubmit = async () => {
    if (!draft) {
      router.replace("/(tabs)/profileReportHistory");
      return;
    }

    const validation = validateReportPage2({
      dateLost: date,
      timeLost: time,
      cantRemember,
      colleges: selectedColleges,
      spaces: selectedSpaces,
      gates: selectedGates,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      if (validation.errors.location) {
        setShowLocation(true);
        mainRotation.value = withTiming(180, { duration: 300 });
      }
      Alert.alert(
        "Missing information",
        Object.values(validation.errors).join("\n"),
      );
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const locationLost = buildLocationLost({
        cantRemember,
        colleges: selectedColleges,
        spaces: selectedSpaces,
        gates: selectedGates,
      });

      const combined = new Date(date);
      combined.setHours(time.getHours(), time.getMinutes(), 0, 0);

      const pad = (n) => String(n).padStart(2, "0");
      const localISO =
        `${combined.getFullYear()}-${pad(combined.getMonth() + 1)}-${pad(combined.getDate())}` +
        `T${pad(combined.getHours())}:${pad(combined.getMinutes())}:00`;

      const formData = new FormData();
      formData.append("item_name", draft.itemName);
      formData.append("description", draft.description);
      formData.append("contents", draft.contents);
      formData.append("category_id", draft.categoryId);
      formData.append("location_lost", locationLost);
      formData.append("lost_date", localISO);

      if (draft.imageUri) {
        const fileName = draft.imageUri.split("/").pop();
        const ext = fileName?.split(".").pop()?.toLowerCase();
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        formData.append("image", {
          uri: draft.imageUri,
          name: fileName,
          type: mimeType,
        });
      }

      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/lost-reports/${draft.reportId}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update report.");
      }

      clearReportDraft();
      router.replace({
        pathname: "/(tabs)/reportSuccess",
        params: { source: "edit" },
      });
    } catch (error) {
      console.error("Update lost report error:", error);
      Alert.alert(
        "Update failed",
        error?.message ?? "Could not update your report. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draft || isLoadingData) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={AppColors.background} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <DatePicker
        modal
        open={openCalendar}
        date={date}
        mode="date"
        maximumDate={new Date()}
        onConfirm={(selectedDate) => {
          setOpenCalendar(false);
          setDate(selectedDate);
          if (errors.dateTime)
            setErrors((prev) => ({ ...prev, dateTime: undefined }));
        }}
        onCancel={() => setOpenCalendar(false)}
      />

      <DatePicker
        modal
        open={openClock}
        mode="time"
        date={time}
        onConfirm={(selectedTime) => {
          setOpenClock(false);
          setTime(selectedTime);
          if (errors.dateTime)
            setErrors((prev) => ({ ...prev, dateTime: undefined }));
        }}
        onCancel={() => setOpenClock(false)}
      />

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => router.navigate("/(tabs)/profileReportHistory")}
            activeOpacity={0.6}
            style={styles.titleBackButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={AppColors.surface} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isViewOnly ? "Report Details" : "Edit Lost Item Report"}
          </Text>
        </View>
        <Text style={styles.subTitle}>When & Where</Text>

        <Text style={styles.sectionTitle}>Date Lost</Text>
        <TouchableOpacity
          onPress={() => setOpenCalendar(true)}
          activeOpacity={isViewOnly ? 1 : 0.8}
          disabled={isViewOnly}
        >
          <View
            style={[
              styles.dataPickerButton,
            ]}
          >
            <Text style={styles.pickerValueText}>
              {date.toLocaleDateString()}
            </Text>
            {!isViewOnly && (
              <MaterialIcons
                name="calendar-month"
                size={24}
                color={AppColors.background}
              />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Time Lost</Text>
        <TouchableOpacity
          onPress={() => setOpenClock(true)}
          activeOpacity={isViewOnly ? 1 : 0.8}
          disabled={isViewOnly}
        >
          <View
            style={[
              styles.dataPickerButton,
            ]}
          >
            <Text style={styles.pickerValueText}>
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {!isViewOnly && (
              <MaterialIcons
                name="access-time"
                size={24}
                color={AppColors.background}
              />
            )}
          </View>
        </TouchableOpacity>
        <FieldError message={errors.dateTime} />

        <Text style={styles.sectionTitle}>Select Location</Text>

        <View style={styles.dropdownMainContainer}>
          <TouchableOpacity
            onPress={handleMainLocationPress}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.dataPickerButton,
                styles.locationMainSelector,
                showLocation && styles.dataPickerButtonActive,
                errors.location && !showLocation && styles.inputErrorBorder,
              ]}
            >
              <Text style={styles.selectLocationLabel}>Select Location</Text>
              <Animated.View style={mainAnimatedStyle}>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={24}
                  color={showLocation ? "#900014" : AppColors.background}
                />
              </Animated.View>
            </View>
          </TouchableOpacity>

          {showLocation && (
            <View style={styles.integratedMenuBlock}>
              <NestedDropdownHeader
                title="College Buildings"
                isOpen={openSubSection === "colleges"}
                disabled={cantRemember}
                onPress={() => toggleSubSection("colleges")}
              />
              {openSubSection === "colleges" && (
                <View style={styles.nestedCheckboxList}>
                  {formatDataList(collegesList).map((item, idx) => (
                    <CustomCheckbox
                      key={`college-${idx}`}
                      label={item}
                      value={selectedColleges.includes(item)}
                      disabled={isViewOnly}
                      onValueChange={() =>
                        handleLocationSelectionChange(
                          selectedColleges,
                          setSelectedColleges,
                        )(item)
                      }
                    />
                  ))}
                </View>
              )}

              <NestedDropdownHeader
                title="Shared Student Spaces"
                isOpen={openSubSection === "spaces"}
                disabled={cantRemember}
                onPress={() => toggleSubSection("spaces")}
              />
              {openSubSection === "spaces" && (
                <View style={styles.nestedCheckboxList}>
                  {formatDataList(spacesList).map((item, idx) => (
                    <CustomCheckbox
                      key={`space-${idx}`}
                      label={item}
                      value={selectedSpaces.includes(item)}
                      disabled={isViewOnly}
                      onValueChange={() =>
                        handleLocationSelectionChange(
                          selectedSpaces,
                          setSelectedSpaces,
                        )(item)
                      }
                    />
                  ))}
                </View>
              )}

              <NestedDropdownHeader
                title="Gates"
                isOpen={openSubSection === "gates"}
                disabled={cantRemember}
                onPress={() => toggleSubSection("gates")}
              />
              {openSubSection === "gates" && (
                <View style={styles.nestedCheckboxList}>
                  {formatDataList(gatesList).map((item, idx) => (
                    <CustomCheckbox
                      key={`gate-${idx}`}
                      label={item}
                      value={selectedGates.includes(item)}
                      disabled={isViewOnly}
                      onValueChange={() =>
                        handleLocationSelectionChange(
                          selectedGates,
                          setSelectedGates,
                        )(item)
                      }
                    />
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.nestedHeader, styles.cantRememberRow]}
                onPress={handleCantRememberChange}
                activeOpacity={0.7}
                disabled={isViewOnly}
              >
                <Text
                  style={[
                    styles.nestedHeaderTitle,
                    isViewOnly && styles.disabledText,
                  ]}
                >
                  Can't Remember
                </Text>
                <MaterialIcons
                  name={
                    cantRemember
                      ? "radio-button-checked"
                      : "radio-button-unchecked"
                  }
                  size={22}
                  color="#900014"
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <FieldError message={errors.location} />

        {!isViewOnly && (
          <View style={styles.infoCard}>
            <View style={styles.infoTitleRow}>
              <Feather
                name="info"
                size={20}
                color="#000000"
                style={styles.infoIcon}
              />
              <Text style={styles.infoTitle}>What happens next?</Text>
            </View>
            <Text style={styles.infoBody}>
              We’ll check for matching found items and notify you if we find a
              potential match. You’ll receive updates via the notification bell.
            </Text>
          </View>
        )}

        <View style={styles.nextSection}>
          <Text style={styles.pageIndicator}>Page 2 out of 2</Text>
          <View style={styles.buttonSection}>
            {isViewOnly ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() =>
                  router.navigate({
                    pathname: "/(tabs)/profileReportHistoryEdit",
                    params: {
                      report: reportParam,
                      viewOnly: "true",
                    },
                  })
                }
              >
                <Text style={styles.backButtonText}>Back to Page 1</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.cancelButton}
                  disabled={isSubmitting}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>Back to Page 1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={AppColors.surface} />
                  ) : (
                    <Text style={styles.submitButtonText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF1E0" },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF1E0",
  },
  scrollContent: { flexGrow: 1, paddingBottom: 48 },
  title: {
    backgroundColor: AppColors.background,
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.surface,
    paddingVertical: 20,
    paddingRight: 20,
    paddingLeft: 8,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.background,
  },
  titleBackButton: {
    paddingLeft: 16,
    paddingVertical: 20,
  },
  subTitle: {
    borderBottomWidth: 1,
    borderColor: "#000000",
    fontSize: 17,
    fontWeight: "900",
    color: AppColors.textOnLight,
    padding: 20,
    paddingLeft: 10,
    paddingBottom: 15,
    marginHorizontal: 10,
    marginBottom: 20,
  },
  nextSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.15)",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  pageIndicator: { fontSize: 15, fontWeight: "500", color: "#212121" },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    backgroundColor: AppColors.background, 
    borderRadius: 14,
    minWidth: 100,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.7 },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#900014",
  },
  submitButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "500" },
  backButtonText: { color: "#900014", fontSize: 15, fontWeight: "500" },
  buttonSection: { gap: 10, flexDirection: "row" },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: AppColors.textOnLight,
    paddingLeft: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  dataPickerButton: {
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 6,
  },
  pickerValueText: { fontSize: 15, color: "#333" },
  locationMainSelector: { marginHorizontal: 0, marginBottom: 0 },
  dataPickerButtonActive: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  selectLocationLabel: { fontWeight: "600", fontSize: 15, color: "#A2938A" },
  inputErrorBorder: { borderWidth: 1, borderColor: "#C62828" },
  dropdownMainContainer: {
    marginHorizontal: 20,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.06)",
  },
  integratedMenuBlock: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E0E0E0",
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginTop: 0,
  },
  nestedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  nestedHeaderDisabled: { opacity: 0.5 },
  nestedHeaderTitle: { fontSize: 15, fontWeight: "600", color: "#212121" },
  cantRememberRow: { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  nestedCheckboxList: {
    backgroundColor: "#F9F9F9",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: "#EEEEEE",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  checkboxLabel: { marginLeft: 12, fontSize: 15, color: "#212121" },
  disabledText: { color: "#A0A0A0" },
  fieldError: {
    color: "#C62828",
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: "#E3D5CA",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.05)",
  },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoIcon: { marginRight: 8 },
  infoTitle: { fontSize: 16, fontWeight: "bold", color: "#000000" },
  infoBody: {
    fontSize: 14,
    color: AppColors.activeIcon,
    lineHeight: 20,
    fontWeight: "400",
    paddingLeft: 28,
  },
});