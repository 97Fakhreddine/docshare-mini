import { http } from '@lib/http';

export type Me = { id: string; email: string; name?: string };

export async function getMe(): Promise<Me> {
  const { data } = await http.get('/auth/me');
  return data;
}
