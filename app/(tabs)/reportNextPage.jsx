import AppColors from "@/constants/AppColors";
import { bulsuColleges } from "@/constants/centerLocation";
import { gates } from "@/constants/Gates";
import { clearReportDraft, getReportDraft } from "@/constants/reportDraft";
import { sharedStudentSpaces } from "@/constants/SharedStudentSpaces";
import {
  buildLocationLost,
  submitLostReport,
  validateReportPage2,
} from "@/utils/lostReport";
import { Feather, MaterialIcons } from "@expo/vector-icons"; // Added Feather for the clean info icon
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const CustomCheckbox = ({ label, value, onValueChange }) => (
  <TouchableOpacity
    style={styles.checkboxContainer}
    onPress={() => onValueChange(!value)}
    activeOpacity={0.7}
  >
    <MaterialIcons
      name={value ? "check-box" : "check-box-outline-blank"}
      size={22}
      color={value ? AppColors.background : "#757575"}
    />
    <Text style={styles.checkboxLabel}>{label}</Text>
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

export default function ReportNextPage() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState(null);

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

  const mainRotation = useSharedValue(0);
  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${mainRotation.value}deg` }],
  }));

  useEffect(() => {
    const saved = getReportDraft();
    if (!saved) {
      Alert.alert(
        "Incomplete form",
        "Please complete page 1 before continuing.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/report") }],
      );
      return;
    }
    setDraft(saved);
  }, [router]);

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
      ? sourceData.map((item) => (item && item.name ? item.name : item))
      : [];
  };

  const handleSubmit = async () => {
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

      await submitLostReport({
        imageUri: draft.imageUri,
        itemName: draft.itemName,
        description: draft.description,
        contents: draft.contents,
        categoryId: draft.categoryId,
        locationLost,
        dateLost: date,
        timeLost: time,
      });

      clearReportDraft();
      Alert.alert(
        "Report submitted",
        "Your lost item report was sent successfully.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/") }],
      );
    } catch (error) {
      console.error("Submit lost report:", error);
      Alert.alert(
        "Submission failed",
        error?.message ?? "Could not submit your report. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draft) {
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
          if (errors.dateTime) {
            setErrors((prev) => ({ ...prev, dateTime: undefined }));
          }
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
          if (errors.dateTime) {
            setErrors((prev) => ({ ...prev, dateTime: undefined }));
          }
        }}
        onCancel={() => setOpenClock(false)}
      />

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Lost Item Report Form</Text>
        <Text style={styles.subTitle}>When & Where</Text>

        <Text style={styles.sectionTitle}>Date Lost</Text>
        <TouchableOpacity
          onPress={() => setOpenCalendar(true)}
          activeOpacity={0.8}
        >
          <View style={styles.dataPickerButton}>
            <Text style={styles.pickerValueText}>
              {date.toLocaleDateString()}
            </Text>
            <MaterialIcons
              name="calendar-month"
              size={24}
              color={AppColors.background}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Time Lost</Text>
        <TouchableOpacity
          onPress={() => setOpenClock(true)}
          activeOpacity={0.8}
        >
          <View style={styles.dataPickerButton}>
            <Text style={styles.pickerValueText}>
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <MaterialIcons
              name="access-time"
              size={24}
              color={AppColors.background}
            />
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
                  {formatDataList(bulsuColleges).map((item, idx) => (
                    <CustomCheckbox
                      key={`college-${idx}`}
                      label={item}
                      value={selectedColleges.includes(item)}
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
                  {formatDataList(sharedStudentSpaces).map((item, idx) => (
                    <CustomCheckbox
                      key={`space-${idx}`}
                      label={item}
                      value={selectedSpaces.includes(item)}
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
                  {formatDataList(gates).map((item, idx) => (
                    <CustomCheckbox
                      key={`gate-${idx}`}
                      label={item}
                      value={selectedGates.includes(item)}
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
              >
                <Text style={styles.nestedHeaderTitle}>Can't Remember</Text>
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

        {/* --- ADDED: "What happens next?" info card element right above the actions line --- */}
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
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Back</Text>
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
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF1E0",
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF1E0",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
  },
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
    borderColor: "rgba(0, 0, 0, 0.15)", // Lighter line matching layout rules
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  pageIndicator: {
    fontSize: 15,
    fontWeight: "500",
    color: "#212121",
  },
  // Substantial updates to action buttons style layouts to mirror image_0b7cfd.png buttons completely
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    backgroundColor: "#D37570", // Shaded muted-red style color fill representation from design
    borderRadius: 14,
    minWidth: 100,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#900014", // Crimson bordered structure
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  backButtonText: {
    color: "#900014", // Colored interior text properties
    fontSize: 15,
    fontWeight: "500",
  },
  buttonSection: {
    gap: 10,
    flexDirection: "row",
  },
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
  pickerValueText: {
    fontSize: 15,
    color: "#333",
  },
  locationMainSelector: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  dataPickerButtonActive: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  selectLocationLabel: {
    fontWeight: "600",
    fontSize: 15,
    color: "#A2938A",
  },
  inputErrorBorder: {
    borderWidth: 1,
    borderColor: "#C62828",
  },
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
  nestedHeaderDisabled: {
    opacity: 0.5,
  },
  nestedHeaderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212121",
  },
  cantRememberRow: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
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
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 15,
    color: "#212121",
  },
  disabledText: {
    color: "#A0A0A0",
  },
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
  infoIcon: {
    marginRight: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  infoBody: {
    fontSize: 14,
    color: AppColors.activeIcon,
    lineHeight: 20,
    fontWeight: "400",
    paddingLeft: 28,
  },
});
