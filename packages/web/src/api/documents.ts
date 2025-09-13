import { http } from '@lib/http';

export type DocDto = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
  ownerId: string;
};

export async function listMine(): Promise<DocDto[]> {
  const { data } = await http.get<DocDto[]>('/documents/mine');
  return data;
}

export async function downloadDoc(
  id: string
): Promise<{ blob: Blob; filename: string }> {
  const res = await http.get(`/documents/${id}/download`, {
    responseType: 'blob',
  });

  // Try to extract filename from Content-Disposition, fall back to id
  const dispo = (res.headers['content-disposition'] || '') as string;
  let filename = `document-${id}`;
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(dispo);
  if (match) {
    filename = decodeURIComponent(match[1] || match[2]);
  }

  return { blob: res.data as Blob, filename };
}

/** Documents that others have shared with me */
export async function listSharedWithMe(): Promise<DocDto[]> {
  const { data } = await http.get<DocDto[]>('/documents/shared');
  return data;
}

/** Upload (no sharing here – plain upload) */
export async function uploadDoc(file: File): Promise<DocDto> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await http.post<DocDto>('/documents/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export function downloadUrl(id: string) {
  return `${import.meta.env.VITE_API_URL}/documents/${id}/download`;
}
