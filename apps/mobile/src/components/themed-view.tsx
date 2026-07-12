import { View, type ViewProps } from "react-native";

export type ThemedViewProps = ViewProps & {
  className?: string;
  lightColor?: string;
  darkColor?: string;
  type?:
    | "text"
    | "background"
    | "backgroundElement"
    | "backgroundSelected"
    | "textSecondary";
};

export function ThemedView({
  className = "",
  type = "background",
  ...otherProps
}: ThemedViewProps) {
  const surface = {
    text: "bg-brand-800",
    background: "bg-white",
    backgroundElement: "bg-wash",
    backgroundSelected: "bg-brand-100",
    textSecondary: "bg-wash",
  }[type];
  return <View className={`${surface} ${className}`} {...otherProps} />;
}
