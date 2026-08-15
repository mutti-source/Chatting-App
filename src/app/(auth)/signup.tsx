import { Link } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
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
import { auth, db } from '../../firebase/config';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const validatePassword = (val: string) => {
    return val.length >= 6;
  };

  const validateName = (val: string) => {
    return val.trim().length >= 2;
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!validateName(name)) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const cleanedEmail = email.trim().toLowerCase();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanedEmail, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: name.trim(),
        email: cleanedEmail,
        role: 'user',
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Signup Error:', error);
      let errorMessage = error.message || 'Signup failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Must be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password sign-in is disabled in Firebase Console.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Database permission denied.';
      }
      
      Alert.alert('Signup Failed', errorMessage);
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
            paddingTop: insets.top + 30,
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
            <Ionicons name="person-add" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join the Electric Chat community today
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
          {/* Name Input */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
          <View style={[
            styles.inputContainer, 
            { 
              borderColor: errors.name ? colors.danger : colors.border,
              backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground,
            }
          ]}>
            <Ionicons 
              name="person-outline" 
              size={20} 
              color={errors.name ? colors.danger : colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput 
              placeholder="Alex Mercer" 
              placeholderTextColor={colors.textSecondary}
              value={name} 
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }} 
              style={[styles.input, { color: colors.text }]} 
              autoCapitalize="words"
            />
          </View>
          {errors.name && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text>}

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
              placeholder="At least 6 characters" 
              placeholderTextColor={colors.textSecondary}
              value={password} 
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
              }} 
              style={[styles.input, { color: colors.text }]} 
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.password}</Text>}

          {/* Confirm Password Input */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
          <View style={[
            styles.inputContainer, 
            { 
              borderColor: errors.confirmPassword ? colors.danger : colors.border,
              backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground,
            }
          ]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={errors.confirmPassword ? colors.danger : colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput 
              placeholder="Repeat your password" 
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword} 
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
              }} 
              style={[styles.input, { color: colors.text }]} 
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.confirmPassword}</Text>}

          {/* Signup Button */}
          <TouchableOpacity 
            style={[
              styles.button, 
              { 
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              }
            ]} 
            onPress={handleSignup} 
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Log In</Text>
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
    marginBottom: 24,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
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
    marginTop: 24,
  },
});