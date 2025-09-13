export type DocumentSummary = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
  ownerId: string;
};

export type ShareCreateDTO = {
  documentId: string;
  targetEmail: string;
};

export const API = {
  auth: { register: '/auth/register', login: '/auth/login' },
  docs: {
    upload: '/documents/upload',
    mine: '/documents/mine',
    shared: '/documents/shared',
    download: (id: string) => `/documents/${id}/download`,
  },
  share: { create: '/shares' },
} as const;
