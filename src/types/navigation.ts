import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  SupervisorPanel: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Otp: { phone: string };
};

export type MainTabParamList = {
  MyAccount: undefined;
  TerTab: undefined;
  TrackTab: undefined;
  SupervisorTab: undefined;
};

export type SupervisorStackParamList = {
  SupervisorList: undefined;
  ClaimReview: {
    sender_id: number;
    from_date: string;
    to_date: string;
    employee_name: string;
    month: string;
  };
  TravelPlanReview: {
    plan_id: number;
    employee_name: string;
    month: string;
  };
  ReviewHistory: undefined;
};

export type TerStackParamList = {
  TerList: undefined;
  AddBill: { categories: { id: number; name: string }[] };
  TerDetail: { data: any };
  EditBill: { bill: any; categories: { id: number; name: string }[] };
};

export type TrackStackParamList = {
  TrackList: undefined;
  ViewTrack: { data: any };
};

// Screen props
export type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type OtpScreenProps = NativeStackScreenProps<AuthStackParamList, 'Otp'>;
export type MyAccountScreenProps = BottomTabScreenProps<MainTabParamList, 'MyAccount'>;
