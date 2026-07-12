import { Pressable, Text } from "react-native";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

export function AppButton({
  children,
  disabled,
  onPress,
  size = "md",
  variant = "primary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
  size?: "sm" | "md" | "lg";
  variant?: ButtonVariant;
}) {
  const buttonClass = {
    primary: "bg-brand-800 active:bg-brand-900",
    outline: "border border-brand-600 bg-white active:bg-brand-50",
    ghost: "border border-line bg-transparent active:bg-wash",
    danger: "border border-coral-500 bg-white active:bg-coral-50",
  }[variant];
  const textClass = {
    primary: "text-white",
    outline: "text-brand-700",
    ghost: "text-body",
    danger: "text-coral-700",
  }[variant];
  const sizeClass = {
    sm: "min-h-[38px] px-4",
    md: "min-h-[46px] px-5",
    lg: "min-h-[54px] px-6",
  }[size];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center rounded-button ${sizeClass} ${buttonClass} ${disabled ? "opacity-45" : ""}`}
    >
      <Text className={`text-center text-[14px] font-bold ${textClass}`}>
        {children}
      </Text>
    </Pressable>
  );
}
