import { Platform, Text, type TextProps } from "react-native";

type TextType =
  | "default"
  | "title"
  | "small"
  | "smallBold"
  | "subtitle"
  | "link"
  | "linkPrimary"
  | "code";
export type ThemedTextProps = TextProps & {
  className?: string;
  type?: TextType;
  themeColor?:
    | "text"
    | "background"
    | "backgroundElement"
    | "backgroundSelected"
    | "textSecondary";
};

export function ThemedText({
  className = "",
  themeColor = "text",
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = {
    text: "text-brand-800",
    background: "text-white",
    backgroundElement: "text-brand-800",
    backgroundSelected: "text-brand-800",
    textSecondary: "text-body",
  }[themeColor];
  const typeClass = {
    default: "text-[16px] leading-6 font-medium",
    title: "text-[48px] leading-[52px] font-semibold",
    small: "text-[14px] leading-5 font-medium",
    smallBold: "text-[14px] leading-5 font-bold",
    subtitle: "text-[32px] leading-[44px] font-semibold",
    link: "text-[14px] leading-[30px] text-brand-600",
    linkPrimary: "text-[14px] leading-[30px] text-brand-800",
    code: `font-mono text-[12px] ${Platform.OS === "android" ? "font-bold" : "font-medium"}`,
  }[type];
  return <Text className={`${color} ${typeClass} ${className}`} {...rest} />;
}
