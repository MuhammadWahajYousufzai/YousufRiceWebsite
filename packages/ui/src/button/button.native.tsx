import * as React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { ButtonProps } from "./types";

const variants = {
  default: { backgroundColor: "#047857", borderColor: "#047857" },
  secondary: { backgroundColor: "#e4e4e7", borderColor: "#e4e4e7" },
  outline: { backgroundColor: "transparent", borderColor: "#d4d4d8" },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  destructive: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
};

const textVariants = {
  default: { color: "#ffffff" },
  secondary: { color: "#09090b" },
  outline: { color: "#09090b" },
  ghost: { color: "#09090b" },
  destructive: { color: "#ffffff" },
};

const sizes = {
  default: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 8 },
  sm: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 6 },
  lg: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 12 },
  icon: { width: 44, height: 44 },
};

export function Button({
  children,
  onPress,
  disabled,
  variant = "default",
  size = "default",
  className,
  accessibilityLabel,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variants[variant],
        sizes[size],
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, textVariants[variant]]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
