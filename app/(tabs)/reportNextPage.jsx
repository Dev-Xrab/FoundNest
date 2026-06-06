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
import { MaterialIcons } from "@expo/vector-icons";
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
  >
    <MaterialIcons
      name={value ? "check-box" : "check-box-outline-blank"}
      size={24}
      color={AppColors.background}
    />
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

const ExpandableDropdown = ({
  title,
  data,
  selectedItems = [],
  onSelectionChange,
  disabled = false,
}) => {
  const rotation = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const formattedData = Array.isArray(data)
    ? data.map((item) =>
        typeof item === "object" && item !== null && item.name
          ? item.name
          : item,
      )
    : [];

  const [isOpen, setIsOpen] = useState(false);

  const handlePress = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    rotation.value = withTiming(nextState ? 180 : 0, { duration: 300 });
  };

  const toggleCheckbox = (item) => {
    if (disabled) return;

    let newSelection = [...selectedItems];
    if (newSelection.includes(item)) {
      newSelection = newSelection.filter((i) => i !== item);
    } else {
      newSelection.push(item);
    }
    onSelectionChange?.(newSelection);
  };

  return (
    <View style={[styles.dropdownWrapper, disabled && styles.dropdownDisabled]}>
      <TouchableOpacity onPress={handlePress} disabled={disabled}>
        <View style={styles.dataPickerButton}>
          <Text style={disabled && styles.disabledText}>{title}</Text>
          <Animated.View style={animatedStyle}>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color={disabled ? "#aaa" : AppColors.background}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {isOpen && formattedData.length > 0 && (
        <View style={styles.dropdownList}>
          {formattedData.map((item, index) => (
            <CustomCheckbox
              key={`${title}-${index}`}
              label={item}
              value={!disabled && selectedItems.includes(item)}
              onValueChange={() => toggleCheckbox(item)}
            />
          ))}
        </View>
      )}
    </View>
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

  const clearLocationError = () => {
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: undefined }));
    }
  };

  const handleCantRememberChange = (value) => {
    setCantRemember(value);
    if (value) {
      setSelectedColleges([]);
      setSelectedSpaces([]);
      setSelectedGates([]);
    }
    clearLocationError();
  };

  const handleLocationSelectionChange = (setter) => (items) => {
    setter(items);
    if (items.length > 0) {
      setCantRemember(false);
    }
    clearLocationError();
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
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/"),
          },
        ],
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
        <TouchableOpacity onPress={() => setOpenCalendar(true)}>
          <View style={styles.dataPickerButton}>
            <Text>{date.toLocaleDateString()}</Text>
            <MaterialIcons
              name="calendar-month"
              size={24}
              color={AppColors.background}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Time Lost</Text>
        <TouchableOpacity onPress={() => setOpenClock(true)}>
          <View style={styles.dataPickerButton}>
            <Text>
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

        <TouchableOpacity
          onPress={handleMainLocationPress}
          style={styles.dropdownWrapper}
        >
          <View
            style={[
              styles.dataPickerButton,
              showLocation && styles.dataPickerButtonActive,
              errors.location && !showLocation && styles.inputErrorBorder,
            ]}
          >
            <Text style={styles.selectLocationLabel}>Select Location</Text>
            <Animated.View style={mainAnimatedStyle}>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={24}
                color={AppColors.background}
              />
            </Animated.View>
          </View>
        </TouchableOpacity>

        {showLocation && (
          <View style={styles.nestedLocations}>
            <ExpandableDropdown
              title="College Buildings"
              data={bulsuColleges}
              selectedItems={selectedColleges}
              disabled={cantRemember}
              onSelectionChange={handleLocationSelectionChange(
                setSelectedColleges,
              )}
            />

            <ExpandableDropdown
              title="Shared Student Space"
              data={sharedStudentSpaces}
              selectedItems={selectedSpaces}
              disabled={cantRemember}
              onSelectionChange={handleLocationSelectionChange(
                setSelectedSpaces,
              )}
            />

            <ExpandableDropdown
              title="Gates"
              data={gates}
              selectedItems={selectedGates}
              disabled={cantRemember}
              onSelectionChange={handleLocationSelectionChange(
                setSelectedGates,
              )}
            />

            <CustomCheckbox
              label="Can't Remember Location"
              value={cantRemember}
              onValueChange={handleCantRememberChange}
            />
          </View>
        )}
        <FieldError message={errors.location} />

        <View style={styles.nextSection}>
          <Text style={styles.pageIndicator}>Page 2 out of 2</Text>
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={styles.cancelButton}
              disabled={isSubmitting}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Back</Text>
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
                <Text style={styles.buttonText}>Submit</Text>
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
    paddingVertical: 30,
    borderTopWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.24)",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  pageIndicator: {
    fontWeight: "bold",
  },
  submitButton: {
    padding: 10,
    paddingHorizontal: 30,
    backgroundColor: AppColors.background,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  cancelButton: {
    padding: 10,
    paddingHorizontal: 30,
    backgroundColor: AppColors.background,
    borderRadius: 10,
  },
  buttonText: {
    color: AppColors.surface,
  },
  buttonSection: {
    gap: 8,
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
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  dataPickerButtonActive: {
    backgroundColor: "#c7c7c7",
  },
  selectLocationLabel: {
    fontWeight: "600",
  },
  inputErrorBorder: {
    borderWidth: 1,
    borderColor: "#C62828",
  },
  nestedLocations: {
    marginTop: 5,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 15,
    marginTop: 5,
    paddingRight: 10,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: AppColors.textOnLight,
  },
  dropdownWrapper: {
    marginBottom: 10,
  },
  dropdownDisabled: {
    opacity: 0.55,
  },
  disabledText: {
    color: "#8C7A70",
  },
  dropdownList: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    paddingTop: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -15,
    paddingBottom: 10,
  },
  fieldError: {
    color: "#C62828",
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 8,
  },
});
