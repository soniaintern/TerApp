import { uploadMultipart } from './client';
import type { CreateBillResponse } from '../types/api';

export const billApi = {
  createBill: (formData: FormData) =>
    uploadMultipart('api/create-billItem', formData) as Promise<CreateBillResponse>,

  updateBill: (formData: FormData) =>
    uploadMultipart('api/update-billItem', formData) as Promise<CreateBillResponse>,
};
