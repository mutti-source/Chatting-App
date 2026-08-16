import { useTheme } from '@/src/context/ThemeContext';
import { UserProfile } from '@/src/types';
import { uploadToCloudinary } from '@/src/utils/cloudinary';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  Image, 
  Keyboard,
  Platform,
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatInputProps {
  onSend: (text: string | null, mediaUrl: string | null, type: 'text' | 'image' | 'audio', mentions?: string[]) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  placeholder: string;
  disabled?: boolean;
  members?: UserProfile[];
}

export default function ChatInput({ onSend, onTyping, placeholder, disabled, members = [] }: ChatInputProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [text, setText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const typingTimeoutRef = useRef<any>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Parse @mention query only if members are available (Group chats only)
  const mentionQuery = useMemo(() => {
    if (!members || members.length === 0) return null;
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1) return null;
    const query = text.substring(lastAtIndex + 1);
    if (query.includes(' ') && query.length > 20) return null;
    return query.toLowerCase();
  }, [text, members]);

  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    if (mentionQuery === '') return members.slice(0, 5);
    return members.filter(m => m.name.toLowerCase().includes(mentionQuery)).slice(0, 5);
  }, [members, mentionQuery]);

  const handleSelectMention = (member: UserProfile) => {
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = text.substring(0, lastAtIndex);
      const newText = `${beforeAt}@${member.name} `;
      setText(newText);
      if (!mentionedIds.includes(member.uid)) {
        setMentionedIds(prev => [...prev, member.uid]);
      }
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (!isTypingRef.current && val.length > 0) {
      isTypingRef.current = true;
      onTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, 2000);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission Required", "Allow gallery access in settings.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled) {
      uploadAndSend(result.assets[0].uri, 'image', text); 
      setText(''); 
      setMentionedIds([]);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) { 
      console.error('Failed to start recording', err); 
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) uploadAndSend(uri, 'audio', null);
  };

  const uploadAndSend = async (uri: string, type: 'image' | 'audio', caption: string | null) => {
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(uri, type);
      await onSend(caption, url, type, mentionedIds);
    } catch (error) {
      Alert.alert("Error", "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendText = () => {
    if (text.trim()) {
      onSend(text.trim(), null, 'text', mentionedIds);
      setText('');
      setMentionedIds([]);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      isTypingRef.current = false;
      onTyping(false);
    }
  };

  if (disabled) {
    return (
      <View style={[
        styles.disabledContainer, 
        { 
          backgroundColor: isDark ? colors.card : '#F3F3F8', 
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopColor: colors.border,
        }
      ]}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
          This group is in broadcast / admin-only mode.
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? colors.surfaceLow : '#FFFFFF', 
        borderTopColor: colors.border,
        paddingBottom: keyboardVisible ? (Platform.OS === 'ios' ? 8 : 12) : Math.max(insets.bottom, 12)
      }
    ]}>

      {/* MENTION AUTOCOMPLETE POPUP */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <View style={[
          styles.mentionPopup, 
          { 
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.borderHighlight,
          }
        ]}>
          <Text style={[styles.mentionHeader, { color: colors.primary }]}>Mention member</Text>
          <FlatList
            data={filteredMembers}
            keyExtractor={item => item.uid}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.mentionRow, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectMention(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.mentionAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA' }]}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.mentionName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.mentionHandle, { color: colors.textSecondary }]}>@{item.name.toLowerCase().replace(/\s+/g, '')}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {isUploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Sending media...</Text>
        </View>
      ) : (
        <View style={styles.innerRow}>
          {/* Gallery / Image Button */}
          <TouchableOpacity 
            onPress={handlePickImage} 
            style={[styles.actionBtn, { backgroundColor: isDark ? colors.card : colors.inputBackground }]}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* Text Input Wrapper */}
          <View style={[
            styles.inputWrapper, 
            { 
              backgroundColor: isDark ? colors.card : colors.inputBackground,
              borderColor: isFocused ? colors.primary : colors.border,
            }
          ]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={text}
              onChangeText={handleTextChange}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              multiline
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>

          {/* Send or Mic Button */}
          {text.trim().length > 0 ? (
            <TouchableOpacity 
              onPress={handleSendText} 
              style={[styles.sendButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPressIn={startRecording} 
              onPressOut={stopRecording}
              style={[
                styles.micButton, 
                recording 
                  ? { backgroundColor: colors.danger, transform: [{ scale: 1.08 }] } 
                  : { backgroundColor: colors.primary }
              ]}
              activeOpacity={0.85}
            >
              <Ionicons name={recording ? "mic" : "mic-outline"} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  mentionPopup: {
    position: 'absolute',
    bottom: '100%',
    left: 12,
    right: 12,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    maxHeight: 180,
  },
  mentionHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  mentionAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mentionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  mentionHandle: {
    fontSize: 12,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  loadingContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionBtn: { 
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  inputWrapper: { 
    flex: 1, 
    borderRadius: 22, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    minHeight: 44, 
    maxHeight: 120,
    justifyContent: 'center',
    borderWidth: 1,
  },
  input: { 
    fontSize: 15, 
    lineHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: { 
    borderRadius: 22, 
    width: 44, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 1,
    elevation: 3,
    shadowColor: '#007AFF',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  micButton: { 
    borderRadius: 22, 
    width: 44, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 1,
    elevation: 3,
    shadowColor: '#007AFF',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  disabledContainer: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disabledText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});