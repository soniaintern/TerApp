import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DgAdvanceScreen from '../screens/dg/DgAdvanceScreen';
import DgAdvanceDetailScreen from '../screens/dg/DgAdvanceDetailScreen';
import DgInvoiceUploadScreen from '../screens/dg/DgInvoiceUploadScreen';
import DgTeamRequestScreen from '../screens/dg/DgTeamRequestScreen';

const Stack = createNativeStackNavigator();

export default function DgAdvanceNavigator() {
  // Native header hidden — each screen draws its own back header.
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DgAdvanceList" component={DgAdvanceScreen} />
      <Stack.Screen name="DgAdvanceDetail" component={DgAdvanceDetailScreen} />
      <Stack.Screen name="DgInvoiceUpload" component={DgInvoiceUploadScreen} />
      <Stack.Screen name="DgTeamRequest" component={DgTeamRequestScreen} />
    </Stack.Navigator>
  );
}
