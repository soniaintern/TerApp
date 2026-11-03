import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: 'token',
  USER: 'user',
  REGISTERED: 'registered',
  PFU: 'pfu',
  USER_ID: 'id',
  USER_STATUS: 'status',
  LAST_WORKING_DATE: 'lastWorkingDate',
  USER_NAME: 'name',
  EMPLOYEE_ID: 'employeeId',
  AX_ID: 'axId',
  IAG_CODE: 'iag_code',
  TELEPHONE: 'telephoneNo',
  LOCATION: 'location',
  DESIGNATION: 'designation',
};

export const storage = {
  async set(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  async remove(key: string) {
    await AsyncStorage.removeItem(key);
  },
  async setMultiple(pairs: Record<string, string>) {
    const entries = Object.entries(pairs).map(([k, v]) => [k, v] as [string, string]);
    await (AsyncStorage as any).multiSet(entries);
  },
  async clearAll() {
    const keys = Object.values(KEYS);
    await (AsyncStorage as any).multiRemove(keys);
  },
  KEYS,
};
