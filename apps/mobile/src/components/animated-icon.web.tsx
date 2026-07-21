import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { View } from "react-native";

import { Image } from "@/components/app-image";

const DURATION = 300;
export function AnimatedSplashOverlay() {
  return null;
}
const keyframe = new Keyframe({
  0: { transform: [{ scale: 0 }] },
  60: { transform: [{ scale: 1.2 }], easing: Easing.elastic(1.2) },
  100: { transform: [{ scale: 1 }], easing: Easing.elastic(1.2) },
});
const logoKeyframe = new Keyframe({
  0: { opacity: 0 },
  60: { transform: [{ scale: 1.2 }], opacity: 0, easing: Easing.elastic(1.2) },
  100: { transform: [{ scale: 1 }], opacity: 1, easing: Easing.elastic(1.2) },
});
const glowKeyframe = new Keyframe({
  0: { transform: [{ rotateZ: "-180deg" }, { scale: 0.8 }], opacity: 0 },
  [DURATION / 1000]: {
    transform: [{ rotateZ: "0deg" }, { scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
  },
  100: { transform: [{ rotateZ: "7200deg" }] },
});

export function AnimatedIcon() {
  return (
    <View className="absolute top-[202px] w-full items-center">
      <View className="h-32 w-32 items-center justify-center">
        <Animated.View
          entering={glowKeyframe.duration(60 * 1000 * 4)}
          className="absolute h-[201px] w-[201px]"
        >
          <Image
            className="absolute h-[201px] w-[201px]"
            source={require("@/assets/images/logo-glow.png")}
          />
        </Animated.View>
        <Animated.View
          entering={keyframe.duration(DURATION)}
          className="absolute h-32 w-32"
        />
        <Animated.View
          entering={logoKeyframe.duration(DURATION)}
          className="items-center justify-center"
        >
          <Image
            className="absolute h-[71px] w-[76px]"
            source={require("@/assets/images/expo-logo.png")}
          />
        </Animated.View>
      </View>
    </View>
  );
}
