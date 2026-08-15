import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { 
  Animated, 
  Image, 
  LogBox, 
  StyleSheet, 
  Text, 
  View 
} from 'react-native';
import appConfig from '../config/appConfig';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

const BouncingDots = ({ color }: { color: string }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -8,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(700 - delay),
        ])
      );
    };

    const anim1 = createBounce(dot1, 0);
    const anim2 = createBounce(dot2, 150);
    const anim3 = createBounce(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot3 }] }]} />
    </View>
  );
};

const AuthLayout = () => {
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/groups');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        {/* Ambient Glow Elements */}
        <View 
          style={[
            styles.glowOrb, 
            { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }
          ]} 
        />
        
        {/* Elevated Logo Card */}
        <View style={[
          styles.logoCard, 
          { 
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.borderHighlight,
            shadowColor: colors.primary,
          }
        ]}>
          <Image 
            source={require('../../assets/images/logo-removebg.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Brand Titles */}
        <View style={styles.textContainer}>
          <Text style={[styles.appName, { color: colors.text }]}>{appConfig.appName}</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Secure, fast, and rewarding communication.
          </Text>
        </View>
        
        {/* Bouncing Dots Loader */}
        <View style={styles.loaderContainer}>
          <BouncingDots color={colors.primary} />
        </View>
        
        {/* Status Bar */}
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      </View>
    );
  }

  return (
    <>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 220,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: colors.background }
        }} 
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="group/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="group/add-members" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
    </>
  );
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    position: 'relative',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: '30%',
    filter: 'blur(50px)',
  },
  logoCard: {
    width: 120,
    height: 120,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    elevation: 8,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  logo: {
    width: 78,
    height: 78,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  loaderContainer: {
    marginTop: 10,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});