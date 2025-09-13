import { ref, computed } from 'vue';
import type { AuthTokens, Me } from '@/types/dto';
import { http } from './http';

const me = ref<Me | null>(null);

export function useAuth() {
  const isAuthed = computed(() => !!localStorage.getItem('access_token'));

  async function login(email: string, password: string) {
    const { data } = await http.post<AuthTokens>('/auth/login', {
      email,
      password,
    });
    localStorage.setItem('access_token', data?.access_token);
    await fetchMe();
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await http.post<AuthTokens>('/auth/register', {
      name,
      email,
      password,
    });
    localStorage.setItem('access_token', data?.access_token);
    await fetchMe();
  }
  async function fetchMe() {
    const { data } = await http.get<Me>('/auth/me');
    me.value = data;
  }
  function logout() {
    localStorage.removeItem('access_token');
    me.value = null;
  }
  return { me, isAuthed, login, register, fetchMe, logout };
}
