import { Redirect } from 'expo-router';
import { View, ActivityIndicator,Image, StyleSheet } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';


export default function Index() {
  const { user, loading } = useAuth();
    const { colors, theme } = useTheme(); 


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image 
          source={require('../../assets/images/logo-removebg.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        <ActivityIndicator size="large" color={colors.primary} />      </View>
    );
  }


  return <Redirect href={user ? "/(tabs)/groups" : "/(auth)/login"} />;
}


const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20, 
  },
  logo: {
    width: 120,
    height: 120,
  }
});