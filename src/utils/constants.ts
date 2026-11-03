import { Platform } from 'react-native';

// Live production API is ter.finfect.biz; UAT stays the default. The
// production EAS profile overrides this via EXPO_PUBLIC_API_URL so no code
// edit is needed per environment.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ternew.etsbeta.com/';
export const API_URL = `${BASE_URL}api/`;
// Bill attachments are stored on S3 and served from this bucket root
export const S3_BASE = 'https://terfinfect.s3.us-east-2.amazonaws.com/';

/**
 * DG Advance location cascade (d2f). Tried in order — live first, with the
 * development host as the fallback. Live is not deployed yet, so requests
 * currently resolve on the development host; once live is pushed the app
 * switches over on its own with no code change.
 */
export const LOCATION_API_ENDPOINTS = [
  'https://api.d2f.co.in/api/get-location-data',
  'https://development-api.d2f.co.in/api/get-location-data',
];

export const TER_STATUS_MAP: Record<string, string> = {
  '0': 'Failed Payment',
  '1': 'Received',
  '2': 'Processing',
  '3': 'Sent to Accounts',
  '4': 'Pay Later / F&F',
  '5': 'Paid',
  '6': 'Cancelled',
  '7': 'Partially Paid',
  '8': 'Rejected',
  '9': 'Employee Not Found',
  '10': 'Rejected by HR',
  '11': 'Handover Created',
  '12': 'Unit Changed',
  '13': 'Rejected Payment',
  '14': 'Received', // UNID generated → automatically treated as received
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const getStatusColor = (status: string): string => {
  switch (status) {
    case '5': return 'text-success';
    case '3': return 'text-primary';
    case '0':
    case '8':
    case '13': return 'text-error';
    case '7': return 'text-warning';
    case '14': return 'text-accent';
    default: return 'text-text-secondary';
  }
};

export const getStatusBgColor = (status: string): string => {
  switch (status) {
    case '5': return 'bg-green-100 dark:bg-green-900/30';
    case '3': return 'bg-blue-100 dark:bg-blue-900/30';
    case '0':
    case '8':
    case '13': return 'bg-red-100 dark:bg-red-900/30';
    case '7': return 'bg-yellow-100 dark:bg-yellow-900/30';
    case '14': return 'bg-teal-100 dark:bg-teal-900/30';
    default: return 'bg-gray-100 dark:bg-gray-800';
  }
};
