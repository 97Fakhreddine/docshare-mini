<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/lib/auth';

const name = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const { register } = useAuth();
const router = useRouter();

async function onSubmit() {
  errorMsg.value = null;
  loading.value = true;
  try {
    await register(name.value, email.value, password.value);
    router.push('/app/mine');
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen grid place-items-center p-6">
    <form class="w-full max-w-sm space-y-4" @submit.prevent="onSubmit">
      <h1 class="text-2xl font-semibold">Create account</h1>

      <div>
        <label class="block text-sm mb-1">Name</label>
        <input v-model="name" required class="w-full border rounded px-3 py-2" />
      </div>
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
        {{ loading ? 'Creating…' : 'Create account' }}
      </button>

      <p class="text-sm">
        Already have an account?
        <router-link class="text-blue-600" to="/login">Sign in</router-link>
      </p>
    </form>
  </div>
</template>
