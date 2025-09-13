<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { listMine, listSharedWithMe, type Doc, downloadUrl } from '@/api/documents';
import { createShare } from '@/api/shares';
import DocList from '@/components/docs/DocList.vue';

const qc = useQueryClient();

/* My docs (that I can share) */
const { data: mineData, isLoading: loadingMine, isError: errorMine } = useQuery({
  queryKey: ['docs', 'mine'],
  queryFn: listMine,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
});
const myDocs = computed<Doc[]>(() => mineData.value ?? []);

/* Docs shared with me */
const { data: sharedData, isLoading: loadingShared, isError: errorShared } = useQuery({
  queryKey: ['docs', 'shared'],
  queryFn: listSharedWithMe,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
});
const sharedDocs = computed<Doc[]>(() => sharedData.value ?? []);

/* Share (invalidate lists after) */
const shareInput = ref<Record<string, string>>({});
const mShare = useMutation({
  mutationFn: ({ id, email }: { id: string; email: string }) => createShare(id, email),
  onSuccess: () => {
    // After sharing: you still own it; in practice only recipient’s shared list changes,
    // but we keep our UI fresh if backend returns additional meta later.
    qc.invalidateQueries({ queryKey: ['docs', 'mine'] });
    qc.invalidateQueries({ queryKey: ['docs', 'shared'] });
  },
});

function share(docId: string) {
  const emails = (shareInput.value[docId] ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return;

  // simple sequential shares; keep the UI minimal
  (async () => {
    for (const email of emails) {
      await mShare.mutateAsync({ id: docId, email });
    }
    shareInput.value[docId] = '';
  })();
}

function onDownload(id: string) {
  window.open(downloadUrl(id), '_self');
}
</script>

<template>
  <section class="space-y-10">
    <!-- 1) My documents (I can share these) -->
    <div>
      <h2 class="text-lg font-semibold mb-1">My documents (you can share these)</h2>
      <p class="text-gray-500 mb-4">
        Choose one of your documents and share with a registered user (viewer access).
      </p>

      <p v-if="loadingMine" class="text-gray-500">Loading your documents…</p>
      <p v-else-if="errorMine" class="text-red-600">Failed to load your documents.</p>
      <p v-else-if="myDocs.length === 0" class="text-gray-500">
        You don’t have any documents yet.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b">
              <th class="py-2">File</th>
              <th class="py-2">Share with (emails)</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in myDocs" :key="doc.id" class="border-b">
              <td class="py-2">{{ doc.filename }}</td>
              <td class="py-2">
                <input
                  v-model="shareInput[doc.id]"
                  placeholder="alice@example.com, bob@example.com"
                  class="w-full border rounded px-2 py-1"
                />
              </td>
              <td class="py-2">
                <button
                  class="px-3 py-1 rounded bg-indigo-500 text-white disabled:opacity-50"
                  @click="share(doc.id)"
                >
                  Share
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2) Documents shared with me -->
    <div>
      <h2 class="text-lg font-semibold mb-1">Documents shared with me</h2>
      <p class="text-gray-500 mb-4">
        These are documents other users shared with you. You have viewer access only.
      </p>

      <p v-if="loadingShared" class="text-gray-500">Loading shared documents…</p>
      <p v-else-if="errorShared" class="text-red-600">Failed to load shared documents.</p>
      <p v-else-if="sharedDocs.length === 0" class="text-gray-500">
        No one has shared documents with you yet.
      </p>
      <DocList v-else :items="sharedDocs" @download="onDownload" />
    </div>
  </section>
</template>
