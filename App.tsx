import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useAuthStore } from './src/store/authStore';
import { profileApi } from './src/api';
import { navigationRef } from './src/utils/navigationRef';
// react-native-web's Alert.alert is a no-op — patch it on web so error and
// validation alerts (e.g. "number not found") actually appear in the PWA.
import { installWebAlertPatch, WebAlertHost } from './src/utils/webAlert';
if (Platform.OS === 'web') installWebAlertPatch();

// Splash
import SplashScreen from './src/screens/SplashScreen';

// Auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import OtpScreen from './src/screens/auth/OtpScreen';
import PasswordLoginScreen from './src/screens/auth/PasswordLoginScreen';
import ChangePasswordScreen from './src/screens/home/ChangePasswordScreen';

// Home screens
import MyAccountScreen from './src/screens/home/MyAccountScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import ClaimGuideScreen from './src/screens/home/ClaimGuideScreen';

// Supervisor screens
import SupervisorNavigator from './src/navigation/SupervisorNavigator';

// Travel plan screens
import TravelPlanNavigator from './src/navigation/TravelPlanNavigator';

// DG Advance screens
import DgAdvanceNavigator from './src/navigation/DgAdvanceNavigator';

// TER screens
import TerScreen from './src/screens/ter/TerScreen';
import AddBillScreen from './src/screens/ter/AddBillScreen';
import EditBillScreen from './src/screens/ter/EditBillScreen';
import TerDetailScreen from './src/screens/ter/TerDetailScreen';
import ClaimDraftScreen from './src/screens/ter/ClaimDraftScreen';

// Track screens
import TrackScreen from './src/screens/track/TrackScreen';
import ViewTrackScreen from './src/screens/track/ViewTrackScreen';

import { palette } from './src/theme/tokens';

const AuthStack = createNativeStackNavigator();
const TerStack = createNativeStackNavigator();
const TrackStack = createNativeStackNavigator();
const MainTab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
      <AuthStack.Screen name="PasswordLogin" component={PasswordLoginScreen} />
    </AuthStack.Navigator>
  );
}

function TerNavigator() {
  const { isDark } = useTheme();
  const headerBg = isDark ? palette.darkSurface : '#186E93';
  return (
    <TerStack.Navigator screenOptions={{
      // Edge-to-edge: keep the header content below the status bar (clock/battery)
      statusBarTranslucent: true,
      headerStyle: { backgroundColor: headerBg },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '700' as const },
      headerShadowVisible: false,
    }}>
      <TerStack.Screen name="TerList" component={TerScreen} options={{ headerShown: false }} />
      {/* Native headers hidden — screens render their own in-content header
          below the status bar (ScreenBackHeader) to avoid edge-to-edge overlap */}
      <TerStack.Screen name="AddBill" component={AddBillScreen} options={{ headerShown: false }} />
      <TerStack.Screen name="EditBill" component={EditBillScreen} options={{ headerShown: false }} />
      <TerStack.Screen name="TerDetail" component={TerDetailScreen} options={{ headerShown: false }} />
      <TerStack.Screen name="ClaimDraft" component={ClaimDraftScreen} options={{ headerShown: false }} />
    </TerStack.Navigator>
  );
}

function TrackNavigator() {
  const { isDark } = useTheme();
  const headerBg = isDark ? palette.darkSurface : '#186E93';
  return (
    <TrackStack.Navigator screenOptions={{
      statusBarTranslucent: true,
      headerStyle: { backgroundColor: headerBg },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '700' as const },
      headerShadowVisible: false,
    }}>
      <TrackStack.Screen name="TrackList" component={TrackScreen} options={{ headerShown: false }} />
      <TrackStack.Screen name="ViewTrack" component={ViewTrackScreen} options={{ headerShown: false }} />
    </TrackStack.Navigator>
  );
}

const TAB_ICONS: Record<string, [string, string]> = {
  HomeTab: ['home-outline', 'home'],
  MyAccount: ['account-circle-outline', 'account-circle'],
  TerTab: ['file-document-edit-outline', 'file-document-edit'],
  TrackTab: ['map-search-outline', 'map-search'],
  ApprovalsTab: ['shield-account-outline', 'shield-account'],
  DgAdvanceTab: ['hand-coin-outline', 'hand-coin'],
};

function MainTabs() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  // Dedicated approvers (L1/L2) only review — they do not apply TER, DG
  // advance or travel plans, so they get a reduced tab bar: Approvals
  // (TER claims + travel plans), DG Advance (advances paid to them — they
  // upload invoices there; approval itself happens on the TER portal) and My Account.
  const approverOnly = user?.is_supervisor === 1;
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Reset each tab to its root screen when switching away & back.
        // v7 removed `unmountOnBlur` (it was silently ignored here, which is why a
        // tab kept showing the last inner screen). `popToTopOnBlur` pops any nested
        // stack on blur, so returning to TER/Track lands on TerList/TrackList.
        popToTopOnBlur: true,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: isDark ? palette.darkTextTertiary : palette.textTertiary,
        tabBarStyle: {
          backgroundColor: isDark ? palette.darkSurface : palette.surface,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused, color }) => {
          const [outline, filled] = TAB_ICONS[route.name] || ['circle-outline', 'circle'];
          return (
            <MaterialCommunityIcons
              name={(focused ? filled : outline) as any}
              size={26}
              color={focused ? palette.primary : color}
            />
          );
        },
      })}
    >
      {approverOnly ? (
        <>
          {/* Approver-only shell: first tab is the approvals hub so they land on it */}
          <MainTab.Screen name="ApprovalsTab" component={SupervisorNavigator} options={{ tabBarLabel: 'Approvals' }} />
          <MainTab.Screen name="DgAdvanceTab" component={DgAdvanceNavigator} options={{ tabBarLabel: 'DG Advance' }} />
          <MainTab.Screen name="MyAccount" component={MyAccountScreen} options={{ tabBarLabel: 'My Account' }} />
        </>
      ) : (
        <>
          {/* Home is the first tab → the landing screen after login; My Account last */}
          <MainTab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
          <MainTab.Screen name="TerTab" component={TerNavigator} options={{ tabBarLabel: 'TER' }} />
          <MainTab.Screen name="TrackTab" component={TrackNavigator} options={{ tabBarLabel: 'Track' }} />
          <MainTab.Screen name="MyAccount" component={MyAccountScreen} options={{ tabBarLabel: 'My Account' }} />
        </>
      )}
    </MainTab.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuthStore();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <RootStack.Screen name="Main" component={MainTabs} />
          {/* Registered at root so the supervisor flow is reachable from
              anywhere (My Account link) via the container navigationRef. */}
          <RootStack.Screen name="SupervisorPanel" component={SupervisorNavigator} />
          {/* Employee travel plan flow (My Account link) */}
          <RootStack.Screen name="TravelPlans" component={TravelPlanNavigator} />
          {/* DG Advance (Home link) — advances raised on the portal; employee uploads invoices */}
          <RootStack.Screen name="DgAdvance" component={DgAdvanceNavigator} />
          {/* Change password (My Account link) — custom in-content back header */}
          <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
          {/* How-claims-work guide (Home link) — custom in-content back header */}
          <RootStack.Screen name="ClaimGuide" component={ClaimGuideScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Otp" component={OtpScreen} />
          <RootStack.Screen name="PasswordLogin" component={PasswordLoginScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
}

function AppContent() {
  const { isLoggedIn } = useAuthStore();
  const { isDark } = useTheme();
  return (
    <>
      {/* expo-status-bar is edge-to-edge aware — no manual translucent/backgroundColor */}
      <StatusBar style={isLoggedIn ? 'light' : isDark ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
      {/* Web-only: renders Alert.alert() calls as a themed modal (native no-op) */}
      <WebAlertHost />
    </>
  );
}

export default function App() {
  React.useEffect(() => {
    (async () => {
      await useAuthStore.getState().restoreSession();
      // The store persists only the token — fetch the full profile so role
      // gating (e.g. the Supervisor tab) works right after a session restore.
      const { token } = useAuthStore.getState();
      if (token) {
        try {
          const res = await profileApi.getProfile();
          if (res.data?.user) useAuthStore.getState().setUser(res.data.user);
          console.log('[auth] profile loaded, is_supervisor =', res.data?.user?.is_supervisor, 'role =', res.data?.user?.role);
        } catch (e) {
          console.log('[auth] profile fetch failed', (e as any)?.message);
        }
      }
    })();
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
  loadingText: { marginTop: 12, color: palette.textSecondary, fontSize: 14 },
});
