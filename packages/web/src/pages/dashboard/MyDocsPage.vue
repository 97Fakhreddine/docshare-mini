<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { listMine } from '@/api/documents';
import UploadMyDocCard from '@/components/upload/UploadMyDocCard.vue';
import DocList from '@/components/docs/DocList.vue';

const q = useQuery({
  queryKey: ['mine'],
  queryFn: listMine,
});
</script>

<template>
  <div class="space-y-6">
    <UploadMyDocCard @uploaded="q.refetch()" />

    <section>
      <h2 class="mb-2 text-lg font-semibold">My documents</h2>
      <div v-if="q.isLoading.value" class="text-sm text-gray-500">Loading…</div>
      <div v-else-if="q.isError.value" class="text-sm text-red-600">
        Failed to load.
      </div>
      <DocList v-else :items="q.data.value ?? []" />
    </section>
  </div>
</template>
