import { Image } from "expo-image";
import { cssInterop } from "nativewind";

// expo-image is a third-party native component, so NativeWind needs an
// explicit mapping before its className dimensions and layout styles apply.
cssInterop(Image, { className: "style" });

export { Image };
