<script setup lang="ts">
import NxWelcome from './NxWelcome.vue';

import {setToken} from '@/lib/token';
import { PATH } from '@/router';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const next = (route.query.next as string | undefined) ?? '';
router.replace(next.startsWith('/') ? next : PATH.MINE);
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Suspense>
      <component :is="Component" />
      <template #fallback>
        <div class="p-4 text-gray-500">Loading…</div>
      </template>
    </Suspense>
  </RouterView>
</template>
