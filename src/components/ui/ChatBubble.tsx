import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Message } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Image, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';

interface ChatBubbleProps {
  message: Message;
  isAdmin: boolean;
  onLongPress: (message: Message) => void;
}

const ChatBubble = React.memo<ChatBubbleProps>(function({ message, isAdmin, onLongPress }) {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  
  const isMe = message.senderId === user?.uid;
  const isPrivate = message.visibleTo === 'ADMIN_ONLY';

  // Resolve photo URL (use message.senderPhotoUrl, or fallback to current user's profile if isMe)
  const avatarUrl = isMe 
    ? (message.senderPhotoUrl || userProfile?.photoUrl || user?.photoURL) 
    : message.senderPhotoUrl;

  const senderInitial = (message.senderName?.charAt(0) || 'U').toUpperCase();

  // --- AUDIO LOGIC ---
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  async function playSound() {
    if (!message.mediaUrl) return;
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      setIsLoadingAudio(true);
      try {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: message.mediaUrl });
        setSound(newSound);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            newSound.setPositionAsync(0);
          }
        });
        await newSound.playAsync();
        setIsPlaying(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingAudio(false);
      }
    }
  }

  useEffect(() => {
    return () => { 
      if (sound) sound.unloadAsync(); 
    };
  }, [sound]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '...';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = () => {
    if (message.mediaType === 'image' && message.mediaUrl) {
      return (
        <View style={styles.mediaWrapper}>
          <Image 
            source={{ uri: message.mediaUrl }} 
            style={styles.imageMedia} 
            resizeMode="cover"
          />
          {message.text ? (
            <Text style={[styles.caption, isMe ? styles.myText : { color: colors.text }]}>
              {message.text}
            </Text>
          ) : null}
        </View>
      );
    }
    
    if (message.mediaType === 'audio' && message.mediaUrl) {
      return (
        <View style={styles.audioContainer}>
          <TouchableOpacity 
            onPress={playSound} 
            disabled={isLoadingAudio}
            style={[styles.audioPlayBtn, { backgroundColor: isMe ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 122, 255, 0.15)' }]}
          >
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color={isMe ? '#FFFFFF' : colors.primary} />
            ) : (
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={18} 
                color={isMe ? '#FFFFFF' : colors.primary} 
              />
            )}
          </TouchableOpacity>
          <View style={styles.audioWave}>
            {[10, 18, 14, 22, 12, 18, 8, 16].map((h, i) => (
              <View 
                key={i} 
                style={[
                  styles.bar, 
                  { 
                    backgroundColor: isMe ? 'rgba(255, 255, 255, 0.75)' : colors.textSecondary, 
                    height: h 
                  }
                ]} 
              />
            ))}
          </View>
          <Text style={[styles.audioText, { color: isMe ? 'rgba(255, 255, 255, 0.8)' : colors.textSecondary }]}>
            Voice
          </Text>
        </View>
      );
    }

    const renderFormattedText = (rawText: string) => {
      const parts = rawText.split(/(@[\w\s]{2,20}?)(?=[.,\s]|$)/g);
      return (
        <Text style={[styles.messageText, isMe ? styles.myText : { color: colors.text }]}>
          {parts.map((part, index) => {
            if (part.startsWith('@')) {
              return (
                <Text 
                  key={index} 
                  style={[
                    styles.mentionHighlight, 
                    { 
                      color: isMe ? '#FFFFFF' : colors.primary,
                      backgroundColor: isMe ? 'rgba(255, 255, 255, 0.25)' : (isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)')
                    }
                  ]}
                >
                  {part}
                </Text>
              );
            }
            return <Text key={index}>{part}</Text>;
          })}
        </Text>
      );
    };

    return renderFormattedText(message.text);
  };

  const renderAvatar = () => (
    <View style={[
      styles.messageAvatar, 
      { 
        backgroundColor: isMe 
          ? (isDark ? '#2A2A2A' : '#E5E5EA') 
          : (isDark ? colors.surfaceHigh : '#E5E5EA'),
        borderColor: colors.borderHighlight,
      }
    ]}>
      {avatarUrl ? (
        <Image 
          source={{ uri: avatarUrl }} 
          style={styles.avatarImage} 
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.avatarInitialText, { color: colors.primary }]}>
          {senderInitial}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.outerRow, isMe ? styles.outerRowMe : styles.outerRowOther]}>
      {/* Receiver Avatar (Left) */}
      {!isMe && renderAvatar()}

      <TouchableOpacity 
        onLongPress={() => onLongPress(message)}
        activeOpacity={0.85}
        style={[
          styles.container, 
          isMe 
            ? [
                styles.bubbleMe, 
                { 
                  backgroundColor: colors.messageOwn,
                  shadowColor: colors.primary,
                }
              ] 
            : [
                styles.bubbleOther, 
                { 
                  backgroundColor: isDark ? colors.surfaceHigh : colors.messageOther,
                  borderColor: isDark ? colors.borderHighlight : 'transparent',
                }
              ],
          isPrivate && { borderWidth: 1.5, borderColor: colors.warning }
        ]}
      >
        {!isMe && (
          <Text style={[styles.sender, { color: colors.primary }]}>
            {message.senderName}
          </Text>
        )}
        
        {renderContent()}
        
        {/* Footer Row: Private Tag + Timestamp + Read Check */}
        <View style={styles.footer}>
          {isPrivate && (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={10} color={colors.warning} />
              <Text style={[styles.privateTag, { color: colors.warning }]}>Private</Text>
            </View>
          )}
          <Text style={[styles.time, { color: isMe ? 'rgba(255, 255, 255, 0.75)' : colors.textSecondary }]}>
            {formatTime(message.createdAt)}
          </Text>
          {isMe && (
            <Ionicons 
              name="checkmark-done" 
              size={14} 
              color="rgba(255, 255, 255, 0.85)" 
              style={{ marginLeft: 3 }} 
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Sender Avatar (Right) */}
      {isMe && renderAvatar()}
    </View>
  );
});

const styles = StyleSheet.create({
  outerRow: {
    width: '100%',
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  outerRowMe: {
    justifyContent: 'flex-end',
  },
  outerRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitialText: {
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '74%',
    minWidth: 80,
  },
  bubbleMe: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
    elevation: 3,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleOther: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
  },
  sender: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '700',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myText: { 
    color: '#FFFFFF',
  },
  caption: { 
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
  },
  mediaWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  imageMedia: {
    width: 200,
    height: 170,
    borderRadius: 12,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 160,
    paddingVertical: 4,
  },
  audioPlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioWave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  audioText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    gap: 2,
  },
  privateTag: {
    fontSize: 10,
    fontWeight: '700',
  },
  time: {
    fontSize: 10,
    fontWeight: '500',
  },
  mentionHighlight: {
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 3,
  },
});

export default ChatBubble;