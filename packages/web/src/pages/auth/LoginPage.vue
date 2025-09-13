<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from '@/lib/auth';

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const { login } = useAuth();
const router = useRouter();
const route = useRoute();

async function onSubmit() {
  errorMsg.value = null;
  loading.value = true;
  try {
    await login(email.value, password.value);
    const next = (route.query.next as string) || '/app/mine';
    router.push(next);
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen grid place-items-center p-6">
    <form class="w-full max-w-sm space-y-4" @submit.prevent="onSubmit">
      <h1 class="text-2xl font-semibold">Sign in</h1>

      <div>
        <label class="block text-sm mb-1">Email</label>
        <input v-model="email" type="email" required class="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm mb-1">Password</label>
        <input v-model="password" type="password" required class="w-full border rounded px-3 py-2" />
      </div>

      <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

      <button class="w-full bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50"
              :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="text-sm">
        No account?
        <router-link class="text-blue-600" to="/register">Create one</router-link>
      </p>
    </form>
  </div>
</template>
