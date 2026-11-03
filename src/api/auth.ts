import apiClient from './client';
import type { LoginResponse, VerifyOtpResponse } from '../types/api';

export const authApi = {
  sendOtp: (phone: string) =>
    apiClient.post<LoginResponse>('api/send-otp', { phone }),

  verifyOtp: (phone: string, otp: string) =>
    apiClient.post<VerifyOtpResponse>('api/verify-otp', { phone, otp }),

  // Password + DOB login — used when the employee never received the OTP
  loginPassword: (phone: string, password: string, dob: string) =>
    apiClient.post<VerifyOtpResponse>('api/login-password', { phone, password, dob }),
};
