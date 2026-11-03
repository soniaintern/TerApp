import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TravelPlansScreen from '../screens/travel/TravelPlansScreen';
import TravelPlanFormScreen from '../screens/travel/TravelPlanFormScreen';
import TravelPlanDetailScreen from '../screens/travel/TravelPlanDetailScreen';

const Stack = createNativeStackNavigator();

export default function TravelPlanNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Native headers hidden — screens render their own back header */}
      <Stack.Screen name="TravelPlanList" component={TravelPlansScreen} />
      <Stack.Screen name="TravelPlanForm" component={TravelPlanFormScreen} />
      <Stack.Screen name="TravelPlanDetail" component={TravelPlanDetailScreen} />
    </Stack.Navigator>
  );
}
