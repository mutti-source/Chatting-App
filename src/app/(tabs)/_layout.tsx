import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

interface TabItemButtonProps {
  isFocused: boolean;
  iconName: any;
  label: string;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}

function TabItemButton({ isFocused, iconName, label, onPress, colors, isDark }: TabItemButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
      ]).start();
    }
  }, [isFocused]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const activeColor = colors.primary;
  const inactiveColor = colors.textSecondary;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabItem}
      activeOpacity={0.8}
    >
      <Animated.View style={[
        styles.iconWrapper, 
        isFocused && { 
          backgroundColor: isDark ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.12)' 
        },
        { transform: [{ scale }] }
      ]}>
        <Ionicons 
          name={iconName} 
          size={22} 
          color={isFocused ? activeColor : inactiveColor} 
        />
      </Animated.View>

      <Text 
        style={[
          styles.tabLabel, 
          { 
            color: isFocused ? activeColor : inactiveColor,
            fontWeight: isFocused ? '700' : '500',
          }
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomMargin = insets.bottom > 0 ? insets.bottom + 6 : 14;

  return (
    <View style={[
      styles.tabBarContainer, 
      { 
        bottom: bottomMargin,
        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.96)' : 'rgba(255, 255, 255, 0.96)',
        borderColor: colors.borderHighlight,
      }
    ]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: any = 'chatbubbles';
        let label = 'Chats';

        if (route.name === 'groups') {
          iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
          label = 'Chats';
        } else if (route.name === 'contacts') {
          iconName = isFocused ? 'people' : 'people-outline';
          label = 'Contacts';
        } else if (route.name === 'profile') {
          iconName = isFocused ? 'person' : 'person-outline';
          label = 'Profile';
        }

        return (
          <TabItemButton
            key={route.key}
            isFocused={isFocused}
            iconName={iconName}
            label={label}
            onPress={onPress}
            colors={colors}
            isDark={isDark}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="contacts" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 68,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  iconWrapper: {
    width: 44,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
});