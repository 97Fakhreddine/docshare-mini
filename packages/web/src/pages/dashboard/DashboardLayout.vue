<script setup lang="ts">
import { PATH } from '@/router';
import { useRouter } from 'vue-router';
import { clearToken } from '@/lib/token';

const router = useRouter();
function logout() {
  clearToken();
  router.replace(PATH.LOGIN);
}
</script>

<template>
  <div class="min-h-screen grid grid-rows-[auto_1fr]">
    <header class="flex items-center justify-between px-4 py-3 border-b">
      <h1 class="font-semibold">DocShare Mini</h1>
      <button class="px-3 py-1 rounded border" @click="logout">Logout</button>
    </header>

    <div class="grid grid-cols-[220px_1fr]">
      <aside class="border-r p-4 space-y-2">
        <RouterLink :to="PATH.MINE" class="block px-2 py-1 rounded hover:bg-gray-100">
          My documents
        </RouterLink>
        <RouterLink :to="PATH.SHARED" class="block px-2 py-1 rounded hover:bg-gray-100">
          Shared with me
        </RouterLink>
      </aside>

      <main class="p-4">
        <RouterView />
      </main>
    </div>
  </div>
</template>