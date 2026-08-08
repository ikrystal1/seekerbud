import React from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowUp } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../../theme";

export function ChatInput({
  value,
  onChangeText,
  onSubmit,
  disabled,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isActive = value.trim().length > 0 && !disabled;

  return (
    <View
      style={[
        styles.outer,
        { paddingBottom: insets.bottom + 8 },
      ]}
    >
      <View style={styles.inner}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Ask SeekerBud anything..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          style={styles.input}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!isActive}
          style={[
            styles.sendBtn,
            { backgroundColor: isActive ? "#FFFFFF" : COLORS.surfaceVariant },
          ]}
          activeOpacity={0.8}
        >
          <ArrowUp
            size={18}
            color={isActive ? "#0B0B12" : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inner: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
