import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  StyleSheet,
  Text, 
  TextInput, 
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../firebase/config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const cleanedEmail = email.trim().toLowerCase();
    try {
      await signInWithEmailAndPassword(auth, cleanedEmail, password);
    } catch (error: any) {
      console.error('Login Error:', error);
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please verify your credentials or create an account.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again in a few minutes.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 20 
          }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Ambient Glow */}
        <View style={[styles.glowOrb, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.06)' }]} />

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={[styles.logoIcon, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }]}>
            <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to continue chatting with your teams
          </Text>
        </View>
        
        {/* Form Card */}
        <View style={[
          styles.card, 
          { 
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.borderHighlight,
          }
        ]}>
          {/* Email Input */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
          <View style={[
            styles.inputContainer, 
            { 
              borderColor: errors.email ? colors.danger : colors.border,
              backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground,
            }
          ]}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={errors.email ? colors.danger : colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput 
              placeholder="name@example.com" 
              placeholderTextColor={colors.textSecondary}
              value={email} 
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }} 
              style={[styles.input, { color: colors.text }]} 
              autoCapitalize="none" 
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
          {errors.email && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.email}</Text>}

          {/* Password Input */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
          <View style={[
            styles.inputContainer, 
            { 
              borderColor: errors.password ? colors.danger : colors.border,
              backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground,
            }
          ]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={errors.password ? colors.danger : colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput 
              placeholder="Enter your password" 
              placeholderTextColor={colors.textSecondary}
              value={password} 
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
              }} 
              style={[styles.input, { color: colors.text }]} 
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.password}</Text>}

          {/* Login Button */}
          <TouchableOpacity 
            style={[
              styles.button, 
              { 
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              }
            ]} 
            onPress={handleLogin} 
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  glowOrb: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: 50,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { 
    fontSize: 26, 
    fontWeight: '700', 
    letterSpacing: -0.5,
    marginBottom: 6, 
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: { 
    paddingVertical: 15, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 10,
    elevation: 4,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700',
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 28,
  },
});