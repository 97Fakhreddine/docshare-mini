<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { listSharedWithMe } from '@/api/documents'
import DocList from '@/components/docs/DocList.vue'
import UploadShareCard from '@/components/share/UploadShareCard.vue'

const q = useQuery({
  queryKey: ['shared'],
  queryFn: () => listSharedWithMe(),
})
</script>

<template>
  <div class="space-y-6">
    <UploadShareCard />

    <section>
      <h2 class="font-semibold text-lg mb-2">Shared with me</h2>
      <DocList :items="q.data || []" :is-loading="q.isLoading" :is-error="q.isError" />
    </section>
  </div>
</template>
