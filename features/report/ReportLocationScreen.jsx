import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import AppColors from "@/constants/AppColors";
import { fetchBulsuColleges } from "@/constants/CollegeBuildings";
import fetchGates from "@/constants/Gates";
import { isOnline } from "@/constants/offlineDb";
import {
  clearReportDraft,
  getReportDraft,
  setReportPage1Dirty,
} from "@/constants/reportDraft";
import fetchSharedStudentSpaces from "@/constants/SharedStudentSpaces";
import {
  buildLocationLost,
  submitLostReport,
  validateReportPage2,
} from "@/utils/lostReport";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
    style={[styles.checkboxContainer, disabled && styles.disabledOpacity]}
    onPress={() => onValueChange(!value)}
    activeOpacity={0.7}
    disabled={disabled}
  >
    <MaterialIcons
      name={value ? "check-box" : "check-box-outline-blank"}
      size={22}
      color={value ? AppColors.background : "#757575"}
    />
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

const NestedDropdownHeader = ({ title, isOpen, disabled, onPress }) => (
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

export default function ReportLocationScreen() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState(null);

  const [collegesList, setCollegesList] = useState([]);
  const [spacesList, setSpacesList] = useState([]);
  const [gatesList, setGatesList] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState(new Date());
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openClock, setOpenClock] = useState(false);
  const [cantRemember, setCantRemember] = useState(false);
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [selectedGates, setSelectedGates] = useState([]);
  const [showLocation, setShowLocation] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSubSection, setOpenSubSection] = useState(null);
  const [online, setOnline] = useState(true);

  // --- Confirm Discard Modal Config State ---
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    message: "",
    cancelLabel: "Cancel",
    confirmLabel: "OK",
    onConfirm: () => {},
  });

  const showCustomAlert = ({
    message,
    cancelLabel = "Cancel",
    confirmLabel = "OK",
    onConfirm = () => {},
  }) => {
    setModalConfig({
      visible: true,
      message,
      cancelLabel,
      confirmLabel,
      onConfirm: () => {
        onConfirm();
        setModalConfig((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  // The date picker already caps at today; when today is the selected date,
  // the time picker needs its own cap so the combined date+time can't land
  // in the future (any time is fine on a past date).
  const isDateToday = date.toDateString() === new Date().toDateString();

  // Flat, plain-text recap of every selected location, shown under the picker.
  const allSelectedLocations = [
    ...selectedColleges,
    ...selectedSpaces,
    ...selectedGates,
  ];

  const mainRotation = useSharedValue(0);
  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${mainRotation.value}deg` }],
  }));

  // ── LIVE NETWORK LISTENER ──
  useEffect(() => {
    isOnline().then(setOnline);

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      setOnline(isConnected);
    });

    return () => unsubscribe();
  }, []);

  // ── RE-LOAD DRAFT & LOCATION DATA ON FOCUS ──
  useFocusEffect(
    useCallback(() => {
      isOnline().then(setOnline);
      const saved = getReportDraft();
      if (!saved) {
        showCustomAlert({
          message: "Please complete page 1 before continuing.",
          cancelLabel: null,
          confirmLabel: "OK",
          onConfirm: () => router.replace("/(tabs)/report"),
        });
        return;
      }

      setDraft(saved);

      const loadDropdownData = async () => {
        try {
          setIsLoadingData(true);
          const [collegesData, spacesData, gatesData] = await Promise.all([
            fetchBulsuColleges(),
            fetchSharedStudentSpaces(),
            fetchGates(),
          ]);
          setCollegesList(collegesData);
          setSpacesList(spacesData);
          setGatesList(gatesData);
        } catch (error) {
          console.error("Failed to load location records:", error);
        } finally {
          setIsLoadingData(false);
        }
      };

      loadDropdownData();
    }, [router]),
  );

  const handleMainLocationPress = () => {
    if (!online) return;
    const nextState = !showLocation;
    setShowLocation(nextState);
    mainRotation.value = withTiming(nextState ? 180 : 0, { duration: 300 });
    if (nextState && errors.location)
      setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const toggleSubSection = (section) => {
    if (cantRemember || !online) return;
    setOpenSubSection(openSubSection === section ? null : section);
  };

  const handleCantRememberChange = () => {
    if (!online) return;
    const nextVal = !cantRemember;
    setCantRemember(nextVal);
    if (nextVal) {
      setSelectedColleges([]);
      setSelectedSpaces([]);
      setSelectedGates([]);
      setOpenSubSection(null);
    }
    if (errors.location)
      setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const handleLocationSelectionChange =
    (currentSelection, setter) => (item) => {
      if (!online) return;
      let newSelection = [...currentSelection];
      if (newSelection.includes(item)) {
        newSelection = newSelection.filter((i) => i !== item);
      } else {
        newSelection.push(item);
      }
      setter(newSelection);
      setCantRemember(false);
      if (errors.location)
        setErrors((prev) => ({ ...prev, location: undefined }));
    };

  const formatDataList = (sourceData) => {
    return Array.isArray(sourceData)
      ? sourceData
          .map((item) => {
            if (!item) return "";
            if (typeof item === "string") return item;
            return item.office_name || item.name || item.title || "";
          })
          .filter(Boolean)
      : [];
  };

  const executeSubmission = async () => {
    setErrors({});
    setIsSubmitting(true);

    try {
      const locationLost = buildLocationLost({
        cantRemember,
        colleges: selectedColleges,
        spaces: selectedSpaces,
        gates: selectedGates,
      });

      const response = await submitLostReport({
        imageUri: draft.imageUri,
        itemName: draft.itemName,
        description: draft.description,
        contents: draft.contents,
        categoryId: draft.categoryId,
        locationLost,
        dateLost: date,
        timeLost: time,
      });

      const fallbackReportPackage = {
        lost_report_id: response?.id || response?.lost_report_id || "",
        item_name: draft.itemName,
        description: draft.description,
        contents: draft.contents,
        category_id: draft.categoryId,
        location_lost: locationLost,
        lost_date: date.toISOString(),
        lost_item_image: draft.imageUri || null,
        matches: [],
      };

      clearReportDraft();
      setReportPage1Dirty(false);

      setDraft(null);
      setDate(new Date());
      setTime(new Date());
      setCantRemember(false);
      setSelectedColleges([]);
      setSelectedSpaces([]);
      setSelectedGates([]);
      setShowLocation(false);
      setOpenSubSection(null);
      setErrors({});

      router.replace({
        pathname: "/(tabs)/reportSuccess",
        params: {
          source: "create",
          reportObject: JSON.stringify(fallbackReportPackage),
        },
      });
    } catch (error) {
      console.error("Submit lost report failure:", error);
      showCustomAlert({
        message: error?.message ?? "Could not submit your report.",
        cancelLabel: "Dismiss",
        confirmLabel: null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      setOnline(false);
      showCustomAlert({
        message: "Cannot submit report while offline.",
        cancelLabel: "Dismiss",
        confirmLabel: null,
      });
      return;
    }

    if (!draft) {
      router.replace("/(tabs)/report");
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
      showCustomAlert({
        message: Object.values(validation.errors).join("\n"),
        cancelLabel: "Got It",
        confirmLabel: null,
      });
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }

    showCustomAlert({
      message:
        "Are you sure all report details are correct and ready to be submitted?",
      cancelLabel: "Review",
      confirmLabel: "Submit",
      onConfirm: executeSubmission,
    });
  };

  const alertModal = (
    <ConfirmDiscardModal
      visible={modalConfig.visible}
      message={modalConfig.message}
      cancelLabel={modalConfig.cancelLabel}
      confirmLabel={modalConfig.confirmLabel}
      onKeepEditing={() =>
        setModalConfig((prev) => ({ ...prev, visible: false }))
      }
      onDiscard={modalConfig.onConfirm}
    />
  );

  if (!draft || isLoadingData) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={AppColors.background} />
        {alertModal}
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
        open={openCalendar && online}
        date={date}
        mode="date"
        maximumDate={new Date()}
        onConfirm={(d) => {
          setOpenCalendar(false);
          setDate(d);
        }}
        onCancel={() => setOpenCalendar(false)}
      />
      <DatePicker
        modal
        open={openClock && online}
        mode="time"
        date={time}
        maximumDate={isDateToday ? new Date() : undefined}
        onConfirm={(t) => {
          setOpenClock(false);
          setTime(t);
        }}
        onCancel={() => setOpenClock(false)}
      />

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Lost Item Report Form</Text>

        <View pointerEvents={!online ? "none" : "auto"}>
          <Text style={styles.subTitle}>When & Where</Text>

          <Text style={styles.sectionTitle}>Date Lost</Text>
          <TouchableOpacity
            onPress={() => setOpenCalendar(true)}
            activeOpacity={0.8}
            disabled={!online}
          >
            <View
              style={[styles.dataPickerButton, !online && styles.disabledInput]}
            >
              <Text
                style={[styles.pickerValueText, !online && styles.disabledText]}
              >
                {date.toLocaleDateString()}
              </Text>
              <MaterialIcons
                name="calendar-month"
                size={24}
                color={online ? AppColors.background : "#A0A0A0"}
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Time Lost</Text>
          <TouchableOpacity
            onPress={() => setOpenClock(true)}
            activeOpacity={0.8}
            disabled={!online}
          >
            <View
              style={[styles.dataPickerButton, !online && styles.disabledInput]}
            >
              <Text
                style={[styles.pickerValueText, !online && styles.disabledText]}
              >
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <MaterialIcons
                name="access-time"
                size={24}
                color={online ? AppColors.background : "#A0A0A0"}
              />
            </View>
          </TouchableOpacity>
          <FieldError message={errors.dateTime} />

          <Text style={styles.sectionTitle}>Select Location</Text>
          <View style={styles.dropdownMainContainer}>
            <TouchableOpacity
              onPress={handleMainLocationPress}
              activeOpacity={0.9}
              disabled={!online}
            >
              <View
                style={[
                  styles.dataPickerButton,
                  styles.locationMainSelector,
                  showLocation && styles.dataPickerButtonActive,
                  errors.location && !showLocation && styles.inputErrorBorder,
                  !online && styles.disabledInput,
                ]}
              >
                <Text
                  style={[
                    styles.selectLocationLabel,
                    !online && styles.disabledText,
                  ]}
                >
                  Select Location
                </Text>
                <Animated.View style={mainAnimatedStyle}>
                  <MaterialIcons
                    name="keyboard-arrow-down"
                    size={24}
                    color={
                      !online
                        ? "#A0A0A0"
                        : showLocation
                          ? "#900014"
                          : AppColors.background
                    }
                  />
                </Animated.View>
              </View>
            </TouchableOpacity>

            {showLocation && (
              <View style={styles.integratedMenuBlock}>
                <NestedDropdownHeader
                  title="College Buildings"
                  isOpen={openSubSection === "colleges"}
                  disabled={cantRemember || !online}
                  onPress={() => toggleSubSection("colleges")}
                />
                {openSubSection === "colleges" && (
                  <View style={styles.nestedCheckboxList}>
                    {formatDataList(collegesList).map((item, idx) => (
                      <CustomCheckbox
                        key={`college-${idx}`}
                        label={item}
                        value={selectedColleges.includes(item)}
                        disabled={!online}
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
                  disabled={cantRemember || !online}
                  onPress={() => toggleSubSection("spaces")}
                />
                {openSubSection === "spaces" && (
                  <View style={styles.nestedCheckboxList}>
                    {formatDataList(spacesList).map((item, idx) => (
                      <CustomCheckbox
                        key={`space-${idx}`}
                        label={item}
                        value={selectedSpaces.includes(item)}
                        disabled={!online}
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
                  disabled={cantRemember || !online}
                  onPress={() => toggleSubSection("gates")}
                />
                {openSubSection === "gates" && (
                  <View style={styles.nestedCheckboxList}>
                    {formatDataList(gatesList).map((item, idx) => (
                      <CustomCheckbox
                        key={`gate-${idx}`}
                        label={item}
                        value={selectedGates.includes(item)}
                        disabled={!online}
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
                  disabled={!online}
                >
                  <Text
                    style={[
                      styles.nestedHeaderTitle,
                      !online && styles.disabledText,
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
                    color={online ? "#900014" : "#A0A0A0"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <FieldError message={errors.location} />

          <Text style={styles.selectedLocationsText}>
            {cantRemember
              ? "Selected: Can't Remember"
              : allSelectedLocations.length > 0
                ? `Selected: ${allSelectedLocations.join(", ")}`
                : "No location selected yet."}
          </Text>

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

          <View style={styles.nextSection}>
            <Text style={styles.pageIndicator}>Page 2 out of 2</Text>
            <View style={styles.buttonSection}>
              <TouchableOpacity
                style={styles.cancelButton}
                disabled={isSubmitting}
                onPress={() => router.navigate("/report")}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (isSubmitting || !online) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || !online}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={AppColors.surface} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {alertModal}
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
    padding: 20,
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
    backgroundColor: "#900014",
    borderRadius: 14,
    minWidth: 100,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#A0A0A0",
    opacity: 0.7,
  },
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
  dropdownMainContainer: { marginHorizontal: 20 },
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
  disabledText: { color: "#888888" },
  disabledInput: {
    backgroundColor: "#E2D7CC",
    borderColor: "#C5B8AC",
  },
  disabledOpacity: { opacity: 0.5 },
  fieldError: {
    color: "#C62828",
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  selectedLocationsText: {
    fontSize: 13,
    color: AppColors.textOnLight,
    marginHorizontal: 20,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: "#E3D5CA",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
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
    paddingLeft: 29,
  },
});
