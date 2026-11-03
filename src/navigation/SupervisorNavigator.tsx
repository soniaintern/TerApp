import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SupervisorScreen from '../screens/supervisor/SupervisorScreen';
import ClaimReviewScreen from '../screens/supervisor/ClaimReviewScreen';
import TravelPlanReviewScreen from '../screens/supervisor/TravelPlanReviewScreen';
import ReviewHistoryScreen from '../screens/supervisor/ReviewHistoryScreen';
import type { SupervisorStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<SupervisorStackParamList>();

export default function SupervisorNavigator() {
  // Native headers hidden everywhere — screens render their own content, and
  // pushed review screens show an in-content back header (ScreenBackHeader).
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupervisorList" component={SupervisorScreen} />
      <Stack.Screen name="ClaimReview" component={ClaimReviewScreen} />
      <Stack.Screen name="TravelPlanReview" component={TravelPlanReviewScreen} />
      <Stack.Screen name="ReviewHistory" component={ReviewHistoryScreen} />
    </Stack.Navigator>
  );
}
