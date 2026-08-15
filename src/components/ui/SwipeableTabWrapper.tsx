import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';

interface SwipeableTabWrapperProps {
  currentTab: 'groups' | 'contacts' | 'profile';
  children: React.ReactNode;
}

export default function SwipeableTabWrapper({ currentTab, children }: SwipeableTabWrapperProps) {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.92)).current;

  // Smooth entrance animation on mount / tab activation
  useEffect(() => {
    translateX.setValue(0);
    opacity.setValue(0.9);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      })
    ]).start();
  }, [currentTab]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only engage when horizontal gesture is intentional and exceeds vertical scroll
        return (
          Math.abs(gestureState.dx) > 22 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.2
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // Damped interactive translation for buttery tactile feedback
        const dampedDx = gestureState.dx * 0.35;
        translateX.setValue(dampedDx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const SWIPE_THRESHOLD = 45;
        const VELOCITY_THRESHOLD = 0.22;

        let navigated = false;

        // Swipe Left (Next tab)
        if (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) {
          if (currentTab === 'groups') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.navigate('/(tabs)/contacts');
            navigated = true;
          } else if (currentTab === 'contacts') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.navigate('/(tabs)/profile');
            navigated = true;
          }
        }
        // Swipe Right (Previous tab)
        else if (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) {
          if (currentTab === 'profile') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.navigate('/(tabs)/contacts');
            navigated = true;
          } else if (currentTab === 'contacts') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.navigate('/(tabs)/groups');
            navigated = true;
          }
        }

        // Spring reset back to resting position with 0 JS lag
        Animated.spring(translateX, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }).start();
      }
    })
  ).current;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity, 
          transform: [{ translateX }] 
        }
      ]} 
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
