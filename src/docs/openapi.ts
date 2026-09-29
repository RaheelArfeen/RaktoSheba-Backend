const bearerAuth = [{ bearerAuth: [] as string[] }];

const Envelope = (dataExample: unknown, message = 'Success') => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: { example: dataExample },
  },
});

const PaginatedEnvelope = (dataExample: unknown, message = 'Success') => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    meta: {
      type: 'object',
      properties: {
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        total: { type: 'integer', example: 42 },
      },
    },
    data: { type: 'array', example: dataExample },
  },
});

const jsonResponse = (description: string, schema: unknown) => ({
  description,
  content: { 'application/json': { schema } },
});

const errorResponse = (description: string, message: string, errors: unknown[] = []) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: message },
          errors: { type: 'array', example: errors },
        },
      },
    },
  },
});

const idParam = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', format: 'uuid' },
});

const pageParam = { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } };
const limitParam = { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } };

const bloodGroupEnum = [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
];

const userExample = {
  id: 'e6a1a7d2-1b2a-4c3d-9e5f-1a2b3c4d5e6f',
  email: 'donor1@example.com',
  role: 'DONOR',
};

const authTokensExample = {
  user: userExample,
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};

const donorProfileExample = {
  id: '2329d5ee-87d3-4eac-9238-564d7f457d85',
  userId: 'e6a1a7d2-1b2a-4c3d-9e5f-1a2b3c4d5e6f',
  bloodGroup: 'O_NEGATIVE',
  lastDonationAt: null,
  isAvailable: true,
  lat: 23.81,
  lng: 90.41,
  photoUrl: null,
  deletedAt: null,
  isEligible: true,
};

const hospitalExample = {
  id: 'ff1d0ec2-8fcf-42d3-bd1e-15f604df304b',
  userId: 'e6a1a7d2-1b2a-4c3d-9e5f-1a2b3c4d5e6f',
  name: 'City Medical Center',
  address: '123 Main St, Dhaka',
  verified: false,
  licenseDocUrl: null,
  deletedAt: null,
};

const bloodRequestExample = {
  id: 'a5546510-ba38-40c1-9378-802f13e88758',
  requesterId: 'e6a1a7d2-1b2a-4c3d-9e5f-1a2b3c4d5e6f',
  bloodGroup: 'A_POSITIVE',
  unitsNeeded: 2,
  urgency: 3,
  status: 'PENDING',
  lat: 23.8,
  lng: 90.4,
  createdAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
};

const donationExample = {
  id: '69993a44-6cba-4c8a-a686-34bdeed33d0a',
  donorId: '2329d5ee-87d3-4eac-9238-564d7f457d85',
  requestId: 'a5546510-ba38-40c1-9378-802f13e88758',
  scheduledAt: '2026-09-01T00:00:00.000Z',
  completedAt: null,
  status: 'SCHEDULED',
};

const notificationExample = {
  id: '7ed8b0fa-2ac9-4a69-afe8-e4fc9c0a10fe',
  userId: 'e6a1a7d2-1b2a-4c3d-9e5f-1a2b3c4d5e6f',
  requestId: 'a5546510-ba38-40c1-9378-802f13e88758',
  channel: 'email',
  sentAt: '2026-09-01T00:00:00.000Z',
  readAt: null,
  request: bloodRequestExample,
};

const paymentExample = {
  id: '64d35882-497a-49a0-b49e-7d5e7cabb534',
  userId: 'e6a1a7d2-1b2a-4c3d-9e5f-1a2b3c4d5e6f',
  requestId: null,
  amount: 25,
  currency: 'usd',
  gatewayRef: 'cs_test_a1jeGJeRgzGqPLywu5hPJjmNT4e7cPOASoWgkt0jdaf59mUM9ysaNoinpH',
  purpose: 'EMERGENCY_FUND',
  status: 'PAID',
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
};

const auditLogExample = {
  id: '66f1c56a-2450-4386-8277-0419a4cc9c5a',
  actorId: 'e6a1a7d2-1b2a-4c3d-9e5f-1a2b3c4d5e6f',
  action: 'VERIFY_HOSPITAL',
  targetType: 'Hospital',
  targetId: 'ff1d0ec2-8fcf-42d3-bd1e-15f604df304b',
  metadata: null,
  createdAt: '2026-09-02T00:00:00.000Z',
  actor: { id: 'e6a1a7d2-1b2a-4c3d-9e5f-1a2b3c4d5e6f', email: 'admin@example.com', role: 'ADMIN' },
};

const analyticsExample = {
  donors: { total: 12, available: 9 },
  hospitals: { total: 3, verified: 2 },
  requests: {
    total: 20,
    byStatus: { PENDING: 4, VERIFIED: 3, MATCHED: 5, FULFILLED: 6, CANCELLED: 2 },
  },
  donationsCompleted: 6,
  bannedUsers: 0,
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'RaktoSheba API',
    version: '1.0.0',
    description:
      'Blood Donation & Emergency Platform API. Auth supports email/password (JWT access + refresh tokens) and Google OAuth. Roles: Admin, Hospital, Donor. Core flow: Hospital creates a request → Admin verifies → compatible/eligible/available donors are matched by ABO/Rh compatibility and geographic distance → a Donor accepts (transaction-locked to prevent double-assignment). Includes real Stripe payments, email notifications, audit logging, and soft-delete-aware pagination/search/sorting. All endpoints return { success, message, data } on success and { success, message, errors } on error.',
  },
  servers: [{ description: 'Current server', url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Donors' },
    { name: 'Hospitals' },
    { name: 'Blood Requests' },
    { name: 'Notifications' },
    { name: 'Admin' },
    { name: 'Payments' },
    { name: 'Public' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account (email/password)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'donor1@example.com' },
                  password: { type: 'string', example: 'secret123' },
                  role: { type: 'string', enum: ['ADMIN', 'HOSPITAL', 'DONOR'], example: 'DONOR' },
                },
              },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            'Registered',
            Envelope(authTokensExample, 'User registered successfully'),
          ),
          '400': errorResponse('Validation failed', 'Validation failed', [
            { path: 'body.email', message: 'Invalid email address' },
          ]),
          '409': errorResponse('Email already in use', 'An account with this email already exists'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email/password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'donor1@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse('Logged in', Envelope(authTokensExample, 'Logged in successfully')),
          '401': errorResponse('Invalid credentials', 'Invalid email or password'),
        },
      },
    },
    '/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange a refresh token for a new access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            'New access token',
            Envelope({ accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
          ),
          '401': errorResponse('Invalid/expired refresh token', 'jwt expired'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out (stateless — client discards tokens)',
        security: bearerAuth,
        responses: {
          '200': jsonResponse(
            'Logged out',
            Envelope(null, 'Logged out successfully. Discard your access and refresh tokens.'),
          ),
        },
      },
    },
    '/auth/google': {
      get: {
        tags: ['Auth'],
        summary: 'Start Google OAuth flow',
        description: 'Redirects to Google consent screen. Open in a real browser, not via API client.',
        responses: { '302': { description: 'Redirect to Google' } },
      },
    },
    '/auth/google/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Google OAuth callback (called by Google, not directly)',
        responses: {
          '200': jsonResponse(
            'Logged in with Google',
            Envelope(authTokensExample, 'Logged in with Google successfully'),
          ),
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: "Get the logged-in user's account",
        security: bearerAuth,
        responses: {
          '200': jsonResponse(
            'Profile',
            Envelope(
              {
                id: userExample.id,
                email: userExample.email,
                role: userExample.role,
                isVolunteer: false,
                isBanned: false,
                createdAt: '2026-09-01T00:00:00.000Z',
                updatedAt: '2026-09-01T00:00:00.000Z',
              },
              'Profile retrieved successfully',
            ),
          ),
          '401': errorResponse('Not authenticated', 'You are not authorized. Please log in.'),
        },
      },
      patch: {
        tags: ['Users'],
        summary: "Update the logged-in user's account email",
        security: bearerAuth,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { email: { type: 'string', example: 'newemail@example.com' } },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse('Updated', Envelope(userExample, 'Profile updated successfully')),
          '409': errorResponse('Email taken', 'This email is already in use'),
        },
      },
    },
    '/donors': {
      post: {
        tags: ['Donors'],
        summary: 'Create the current DONOR user’s donor profile',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bloodGroup'],
                properties: {
                  bloodGroup: { type: 'string', enum: bloodGroupEnum },
                  lastDonationAt: { type: 'string', format: 'date-time' },
                  lat: { type: 'number', example: 23.8 },
                  lng: { type: 'number', example: 90.4 },
                },
              },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            'Created',
            Envelope(donorProfileExample, 'Donor profile created successfully'),
          ),
          '409': errorResponse('Already exists', 'Donor profile already exists for this user'),
        },
      },
      get: {
        tags: ['Donors'],
        summary: 'List donors (Admin/Hospital only) — paginated, filterable, searchable',
        security: bearerAuth,
        parameters: [
          { name: 'bloodGroup', in: 'query', schema: { type: 'string', enum: bloodGroupEnum } },
          { name: 'isAvailable', in: 'query', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', description: 'Matches donor email', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['bloodGroup', 'lastDonationAt'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          pageParam,
          limitParam,
        ],
        responses: {
          '200': jsonResponse(
            'Donors',
            PaginatedEnvelope([donorProfileExample], 'Donors retrieved successfully'),
          ),
          '403': errorResponse('Forbidden', 'You do not have permission to perform this action.'),
        },
      },
    },
    '/donors/me': {
      get: {
        tags: ['Donors'],
        summary: "Get the current donor's own profile",
        security: bearerAuth,
        responses: {
          '200': jsonResponse(
            'Profile',
            Envelope(donorProfileExample, 'Donor profile retrieved successfully'),
          ),
          '404': errorResponse('Not found', 'Donor profile not found'),
        },
      },
      patch: {
        tags: ['Donors'],
        summary: "Update the current donor's own profile",
        security: bearerAuth,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  bloodGroup: { type: 'string', enum: bloodGroupEnum },
                  lastDonationAt: { type: 'string', format: 'date-time' },
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            'Updated',
            Envelope(donorProfileExample, 'Donor profile updated successfully'),
          ),
        },
      },
      delete: {
        tags: ['Donors'],
        summary: "Soft-delete the current donor's profile",
        security: bearerAuth,
        responses: {
          '200': jsonResponse('Deleted', Envelope(null, 'Donor profile deleted successfully')),
        },
      },
    },
    '/donors/me/availability': {
      patch: {
        tags: ['Donors'],
        summary: 'Toggle the current donor’s availability',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isAvailable'],
                properties: { isAvailable: { type: 'boolean' } },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            'Updated',
            Envelope(donorProfileExample, 'Availability updated successfully'),
          ),
        },
      },
    },
    '/donors/me/photo': {
      post: {
        tags: ['Donors'],
        summary: 'Upload/replace the current donor’s profile photo (Cloudinary)',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { photo: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            'Uploaded',
            Envelope(
              { ...donorProfileExample, photoUrl: 'https://res.cloudinary.com/.../donor-photos/xyz.png' },
              'Photo uploaded successfully',
            ),
          ),
          '400': errorResponse('Bad file', 'Only JPEG, PNG, WEBP, or PDF files are allowed'),
        },
      },
    },
    '/donors/{id}': {
      get: {
        tags: ['Donors'],
        summary: 'Get a donor by donor-profile id (Admin/Hospital only)',
        security: bearerAuth,
        parameters: [idParam('id', 'Donor profile id')],
        responses: {
          '200': jsonResponse('Donor', Envelope(donorProfileExample, 'Donor retrieved successfully')),
          '404': errorResponse('Not found', 'Donor not found'),
        },
      },
    },
    '/hospitals': {
      post: {
        tags: ['Hospitals'],
        summary: 'Create the current HOSPITAL user’s hospital profile',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'address'],
                properties: {
                  name: { type: 'string', example: 'City Medical Center' },
                  address: { type: 'string', example: '123 Main St, Dhaka' },
                },
              },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            'Created',
            Envelope(hospitalExample, 'Hospital profile created successfully'),
          ),
          '409': errorResponse('Already exists', 'Hospital profile already exists for this user'),
        },
      },
      get: {
        tags: ['Hospitals'],
        summary: 'List all hospitals (Admin only)',
        security: bearerAuth,
        responses: {
          '200': jsonResponse(
            'Hospitals',
            Envelope([hospitalExample], 'Hospitals retrieved successfully'),
          ),
        },
      },
    },
    '/hospitals/me': {
      get: {
        tags: ['Hospitals'],
        summary: "Get the current hospital's own profile",
        security: bearerAuth,
        responses: {
          '200': jsonResponse(
            'Profile',
            Envelope(hospitalExample, 'Hospital profile retrieved successfully'),
          ),
        },
      },
      patch: {
        tags: ['Hospitals'],
        summary: "Update the current hospital's own profile",
        security: bearerAuth,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' }, address: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            'Updated',
            Envelope(hospitalExample, 'Hospital profile updated successfully'),
          ),
        },
      },
    },
    '/hospitals/me/document': {
      post: {
        tags: ['Hospitals'],
        summary: 'Upload the hospital’s verification/license document (Cloudinary)',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { document: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            'Uploaded',
            Envelope(
              { ...hospitalExample, licenseDocUrl: 'https://res.cloudinary.com/.../hospital-documents/xyz.pdf' },
              'Document uploaded successfully',
            ),
          ),
        },
      },
    },
    '/requests': {
      post: {
        tags: ['Blood Requests'],
        summary: 'Create a blood request (Hospital only)',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bloodGroup', 'unitsNeeded'],
                properties: {
                  bloodGroup: { type: 'string', enum: bloodGroupEnum },
                  unitsNeeded: { type: 'integer', example: 2 },
                  urgency: { type: 'integer', minimum: 1, maximum: 5, example: 3 },
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            'Created',
            Envelope(bloodRequestExample, 'Blood request created successfully'),
          ),
        },
      },
      get: {
        tags: ['Blood Requests'],
        summary: 'List blood requests — paginated, filterable, sortable',
        security: bearerAuth,
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'VERIFIED', 'MATCHED', 'FULFILLED', 'CANCELLED'] } },
          { name: 'bloodGroup', in: 'query', schema: { type: 'string', enum: bloodGroupEnum } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'urgency'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          pageParam,
          limitParam,
        ],
        responses: {
          '200': jsonResponse(
            'Requests',
            PaginatedEnvelope([bloodRequestExample], 'Blood requests retrieved successfully'),
          ),
        },
      },
    },
    '/requests/{id}': {
      get: {
        tags: ['Blood Requests'],
        summary: 'Get a blood request by id',
        security: bearerAuth,
        parameters: [idParam('id', 'Blood request id')],
        responses: {
          '200': jsonResponse(
            'Request',
            Envelope(
              { ...bloodRequestExample, donation: null },
              'Blood request retrieved successfully',
            ),
          ),
          '404': errorResponse('Not found', 'Blood request not found'),
        },
      },
    },
    '/requests/{id}/verify': {
      patch: {
        tags: ['Blood Requests'],
        summary: 'Verify a PENDING request (Admin only) — fans out donor notifications',
        security: bearerAuth,
        parameters: [idParam('id', 'Blood request id')],
        responses: {
          '200': jsonResponse(
            'Verified',
            Envelope({ ...bloodRequestExample, status: 'VERIFIED' }, 'Blood request verified successfully'),
          ),
          '400': errorResponse('Wrong status', 'Cannot verify a request with status VERIFIED'),
        },
      },
    },
    '/requests/{id}/matches': {
      get: {
        tags: ['Blood Requests'],
        summary: 'Get compatible/eligible/available donors, sorted by distance (Admin/Hospital)',
        security: bearerAuth,
        parameters: [idParam('id', 'Blood request id')],
        responses: {
          '200': jsonResponse(
            'Matches',
            Envelope(
              [{ ...donorProfileExample, user: { id: userExample.id, email: userExample.email }, distanceKm: 1.5 }],
              'Matching donors retrieved successfully',
            ),
          ),
        },
      },
    },
    '/requests/{id}/accept': {
      post: {
        tags: ['Blood Requests'],
        summary: 'Accept a request as the compatible donor (Donor only, transaction-locked)',
        security: bearerAuth,
        parameters: [idParam('id', 'Blood request id')],
        responses: {
          '200': jsonResponse(
            'Accepted',
            Envelope(donationExample, 'Blood request accepted successfully'),
          ),
          '409': errorResponse(
            'Already matched',
            'This request has already been matched with another donor',
          ),
          '400': errorResponse(
            'Not eligible',
            'You are not yet eligible to donate (must wait 90 days between donations)',
          ),
        },
      },
    },
    '/requests/{id}/cancel': {
      patch: {
        tags: ['Blood Requests'],
        summary: 'Cancel a request (requester or Admin only)',
        security: bearerAuth,
        parameters: [idParam('id', 'Blood request id')],
        responses: {
          '200': jsonResponse(
            'Cancelled',
            Envelope({ ...bloodRequestExample, status: 'CANCELLED' }, 'Blood request cancelled successfully'),
          ),
          '403': errorResponse('Not owner', 'You can only cancel your own requests'),
        },
      },
    },
    '/notifications/me': {
      get: {
        tags: ['Notifications'],
        summary: "Get the current user's notifications",
        security: bearerAuth,
        responses: {
          '200': jsonResponse(
            'Notifications',
            Envelope([notificationExample], 'Notifications retrieved successfully'),
          ),
        },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read (owner only)',
        security: bearerAuth,
        parameters: [idParam('id', 'Notification id')],
        responses: {
          '200': jsonResponse(
            'Marked read',
            Envelope({ ...notificationExample, readAt: '2026-09-01T00:00:00.000Z' }, 'Notification marked as read'),
          ),
          '403': errorResponse('Not owner', 'You can only mark your own notifications as read'),
        },
      },
    },
    '/admin/users/{id}/ban': {
      patch: {
        tags: ['Admin'],
        summary: 'Ban a user (Admin only) — audit logged',
        security: bearerAuth,
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': jsonResponse(
            'Banned',
            Envelope({ ...userExample, isBanned: true }, 'User banned successfully'),
          ),
        },
      },
    },
    '/admin/users/{id}/unban': {
      patch: {
        tags: ['Admin'],
        summary: 'Unban a user (Admin only) — audit logged',
        security: bearerAuth,
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': jsonResponse(
            'Unbanned',
            Envelope({ ...userExample, isBanned: false }, 'User unbanned successfully'),
          ),
        },
      },
    },
    '/admin/hospitals/{id}/verify': {
      patch: {
        tags: ['Admin'],
        summary: 'Verify a hospital (Admin only) — audit logged',
        security: bearerAuth,
        parameters: [idParam('id', 'Hospital id')],
        responses: {
          '200': jsonResponse(
            'Verified',
            Envelope({ ...hospitalExample, verified: true }, 'Hospital verified successfully'),
          ),
          '400': errorResponse('Already verified', 'This hospital is already verified'),
        },
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Platform-wide analytics (Admin only)',
        security: bearerAuth,
        responses: {
          '200': jsonResponse(
            'Analytics',
            Envelope(analyticsExample, 'Analytics retrieved successfully'),
          ),
        },
      },
    },
    '/admin/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'Paginated audit log of admin/status-change actions (Admin only)',
        security: bearerAuth,
        parameters: [pageParam, limitParam],
        responses: {
          '200': jsonResponse(
            'Audit logs',
            PaginatedEnvelope([auditLogExample], 'Audit logs retrieved successfully'),
          ),
        },
      },
    },
    '/payments/initiate': {
      post: {
        tags: ['Payments'],
        summary: 'Create a real Stripe Checkout session',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'purpose'],
                properties: {
                  amount: { type: 'number', example: 25 },
                  purpose: { type: 'string', enum: ['PLATFORM_DONATION', 'EMERGENCY_FUND'] },
                  requestId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            'Session created',
            Envelope(
              { payment: paymentExample, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_...' },
              'Payment initiated successfully',
            ),
          ),
        },
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Stripe webhook (called by Stripe only, signed raw body)',
        description:
          'Not callable from Swagger UI/Postman directly — requires a Stripe-signed request. Test via the Stripe CLI (`stripe listen --forward-to`) or a real Checkout completion.',
        responses: { '200': { description: 'Event processed' } },
      },
    },
    '/payments/me': {
      get: {
        tags: ['Payments'],
        summary: "Get the current user's own payments — paginated",
        security: bearerAuth,
        parameters: [pageParam, limitParam],
        responses: {
          '200': jsonResponse(
            'Payments',
            PaginatedEnvelope([paymentExample], 'Payments retrieved successfully'),
          ),
        },
      },
    },
    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get a payment by id (owner or Admin only)',
        security: bearerAuth,
        parameters: [idParam('id', 'Payment id')],
        responses: {
          '200': jsonResponse('Payment', Envelope(paymentExample, 'Payment retrieved successfully')),
          '403': errorResponse('Not owner', 'You can only view your own payments'),
        },
      },
    },
    '/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List all payments (Admin only) — paginated, filterable by status',
        security: bearerAuth,
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED'] } },
          pageParam,
          limitParam,
        ],
        responses: {
          '200': jsonResponse(
            'Payments',
            PaginatedEnvelope([{ ...paymentExample, user: userExample }], 'Payments retrieved successfully'),
          ),
        },
      },
    },
    '/public/stats': {
      get: {
        tags: ['Public'],
        summary: 'Aggregate platform stats for the public website (no auth)',
        responses: {
          '200': jsonResponse(
            'Stats',
            Envelope(
              { totalDonors: 120, availableDonors: 85, verifiedHospitals: 12, completedDonations: 340, openRequests: 7 },
              'Platform stats retrieved successfully',
            ),
          ),
        },
      },
    },
    '/public/urgent-requests': {
      get: {
        tags: ['Public'],
        summary: 'Open verified requests, most urgent first — public fields only (no auth)',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 6 } }],
        responses: {
          '200': jsonResponse(
            'Urgent requests',
            Envelope(
              [
                {
                  id: '6f1c2b9e-0000-0000-0000-000000000000',
                  bloodGroup: 'O_NEGATIVE',
                  unitsNeeded: 2,
                  urgency: 3,
                  createdAt: '2026-09-01T10:00:00.000Z',
                  hospital: { name: 'Dhaka Medical College Hospital', address: 'Bakshibazar, Dhaka' },
                },
              ],
              'Urgent requests retrieved successfully',
            ),
          ),
        },
      },
    },
  },
};
