import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// react-native-date-picker throws "react-native-date-picker is not
// supported on this platform" the moment it's touched on web — it only
// ever supported Android/iOS. This re-implements the same modal
// date/time-picker prop API (modal, open, date, mode, maximumDate,
// onConfirm, onCancel) that both report screens already use, on top of a
// plain HTML <input type="date"|"time">, which every browser provides
// natively with no extra dependency.

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DatePicker({
  modal,
  open,
  date,
  mode = "date",
  maximumDate,
  minimumDate,
  onConfirm,
  onCancel,
}) {
  const isTime = mode === "time";
  const toValue = isTime ? toTimeValue : toDateValue;
  const [pendingValue, setPendingValue] = useState(() => toValue(date));

  // Reset the draft value to the current prop whenever the picker opens,
  // so re-opening after a Cancel doesn't keep a stale edit.
  useEffect(() => {
    if (open) setPendingValue(toValue(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!modal || !open) return null;

  function handleConfirm() {
    if (!pendingValue) {
      onCancel?.();
      return;
    }

    const result = new Date(date);
    if (isTime) {
      const [hours, minutes] = pendingValue.split(":").map(Number);
      result.setHours(hours, minutes, 0, 0);
    } else {
      const [year, month, day] = pendingValue.split("-").map(Number);
      result.setFullYear(year, month - 1, day);
    }
    onConfirm?.(result);
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{isTime ? "Select Time" : "Select Date"}</Text>

          <input
            type={isTime ? "time" : "date"}
            value={pendingValue}
            max={maximumDate ? toValue(maximumDate) : undefined}
            min={minimumDate ? toValue(minimumDate) : undefined}
            onChange={(e) => setPendingValue(e.target.value)}
            style={webInputStyle}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const webInputStyle = {
  fontSize: 16,
  padding: 12,
  borderRadius: 8,
  border: "1px solid #CCCCCC",
  width: "100%",
  boxSizing: "border-box",
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222222",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#444444",
  },
  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#900000",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
