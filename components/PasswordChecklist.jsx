import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

const COLORS = {
  light: { met: '#2E7D32', unmet: '#C0392B' }, // white card background
  dark:  { met: '#81C784', unmet: '#F9E055' }, // maroon card background
};

export default function PasswordChecklist({ password, variant = 'light' }) {
  const { met: metColor, unmet: unmetColor } = COLORS[variant];

  const rules = [
    { label: 'At least 8 characters',         met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one number',           met: /[0-9]/.test(password) },
    { label: 'At least one special character', met: /[^a-zA-Z0-9]/.test(password) },
  ];

  return (
    <View style={styles.checklist}>
      {rules.map((rule) => (
        <View key={rule.label} style={styles.checklistRow}>
          <Ionicons
            name={rule.met ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={rule.met ? metColor : unmetColor}
          />
          <Text style={[styles.checklistText, { color: rule.met ? metColor : unmetColor }]}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  checklist: { marginTop: 8, gap: 4, paddingLeft: 4 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checklistText: { fontSize: 13 },
});