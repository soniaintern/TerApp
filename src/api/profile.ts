import apiClient from './client';
import type { ProfileResponse } from '../types/api';

export const profileApi = {
  getProfile: () =>
    apiClient.get<ProfileResponse>('api/profile'),
};
