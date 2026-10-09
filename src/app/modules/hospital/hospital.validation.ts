import { HospitalType } from '@prisma/client';
import { z } from 'zod';

const phoneField = (label: string) =>
  z
    .string()
    .trim()
    .min(6, `${label} must be at least 6 characters`)
    .max(20, `${label} must be at most 20 characters`);

const optionalTextField = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const nameField = z.string({ required_error: 'name is required' }).trim().min(2).max(120);

const addressField = z
  .string({ required_error: 'address is required' })
  .trim()
  .min(5, 'address must be at least 5 characters')
  .max(200, 'address must be at most 200 characters');

// Everything a hospital can fill in apart from its name and address.
const detailFields = z.object({
  type: z
    .nativeEnum(HospitalType, {
      errorMap: () => ({ message: 'type must be GOVERNMENT, PRIVATE or CLINIC' }),
    })
    .optional(),
  email: z
    .string()
    .trim()
    .email('email must be a valid email address')
    .max(160, 'email must be at most 160 characters')
    .optional(),
  district: z
    .string()
    .trim()
    .min(2, 'district must be at least 2 characters')
    .max(60, 'district must be at most 60 characters')
    .optional(),
  upazila: optionalTextField(60, 'upazila'),
  phone: phoneField('phone').optional(),
  emergencyPhone: phoneField('emergencyPhone').optional(),
  website: optionalTextField(200, 'website'),
  openHours: optionalTextField(60, 'openHours'),
  hasEmergencyService: z.boolean().optional(),
  description: optionalTextField(1000, 'description'),
  licenseNumber: optionalTextField(60, 'licenseNumber'),
});

const createHospitalProfileValidationSchema = z.object({
  body: detailFields.extend({ name: nameField, address: addressField }),
});

const updateHospitalProfileValidationSchema = z.object({
  body: detailFields.extend({ name: nameField.optional(), address: addressField.optional() }),
});

export const HospitalValidation = {
  createHospitalProfileValidationSchema,
  updateHospitalProfileValidationSchema,
};
