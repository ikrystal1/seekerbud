import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowUp } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../../theme";

const LINE_HEIGHT = 22;
const MIN_HEIGHT = LINE_HEIGHT;       // one line
const MAX_HEIGHT = LINE_HEIGHT * 5;   // five lines, then scroll inside

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
  const bottomPad = Platform.OS === "web" ? 8 : insets.bottom + 8;

  // Track content height so the field grows line-by-line
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);

  // Shrink the field as text is deleted
  useEffect(() => {
    if (!value) {
      setInputHeight(MIN_HEIGHT);
      return;
    }
    // On web onContentSizeChange doesn't always fire on shrink,
    // so compute height from line count as a fallback
    if (Platform.OS === "web") {
      const lines = value.split("\n").length;
      const h = Math.min(Math.max(lines * LINE_HEIGHT, MIN_HEIGHT), MAX_HEIGHT);
      setInputHeight(h);
    }
  }, [value]);

  const handleSubmit = () => {
    onSubmit();
    setInputHeight(MIN_HEIGHT);
  };

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          placeholder="Ask SeekerBud anything..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          scrollEnabled
          onContentSizeChange={(e) => {
            const h = e.nativeEvent.contentSize.height;
            setInputHeight(Math.min(Math.max(h, MIN_HEIGHT), MAX_HEIGHT));
          }}
          style={[
            styles.input,
            { height: inputHeight },
            Platform.OS === "web" && ({ outlineStyle: "none", resize: "none" } as any),
          ]}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isActive}
          style={[
            styles.sendBtn,
            { backgroundColor: isActive ? "#FFFFFF" : COLORS.surfaceVariant },
          ]}
          activeOpacity={0.8}
        >
          <ArrowUp size={18} color={isActive ? "#0B0B12" : COLORS.textSecondary} />
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
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
