import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";

const COLORS = [
  "#8c52ff",
  "#c084fc",
  "#ff4d6d",
  "#ffd166",
  "#4ade80",
  "#60a5fa",
  "#f472b6",
  "#fbbf24",
];

const PARTICLE_COUNT = 48;

type ParticleConfig = {
  left: number;
  size: number;
  color: string;
  delay: number;
  drift: number;
  duration: number;
  rotate: number;
};

type Props = {
  active: boolean;
  onComplete?: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const ConfettiCelebration: React.FC<Props> = ({ active, onComplete }) => {
  const particles = useMemo<ParticleConfig[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
        left: Math.random() * SCREEN_WIDTH,
        size: 6 + Math.random() * 8,
        color: COLORS[index % COLORS.length],
        delay: Math.random() * 180,
        drift: (Math.random() - 0.5) * 120,
        duration: 1400 + Math.random() * 900,
        rotate: (Math.random() - 0.5) * 360,
      })),
    [active],
  );

  const progressRefs = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!active) return;

    progressRefs.forEach((value) => value.setValue(0));

    const animations = progressRefs.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: particles[index].duration,
        delay: particles[index].delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );

    Animated.parallel(animations).start(({ finished }) => {
      if (finished) {
        onComplete?.();
      }
    });
  }, [active, onComplete, particles, progressRefs]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {particles.map((particle, index) => {
        const progress = progressRefs[index];
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, SCREEN_HEIGHT + 40],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.drift],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${particle.rotate}deg`],
        });

        return (
          <Animated.View
            key={`confetti-${index}`}
            style={[
              styles.particle,
              {
                left: particle.left,
                width: particle.size,
                height: particle.size * 0.6,
                backgroundColor: particle.color,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  particle: {
    position: "absolute",
    top: 0,
    borderRadius: 2,
  },
});

export default ConfettiCelebration;
