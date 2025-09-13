<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { uploadDoc } from '@/api/documents';

const emit = defineEmits<{ (e: 'uploaded'): void }>();

const fileRef = ref<File | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const progress = ref(0);

const canUpload = computed(() => !!fileRef.value && !mutation.isPending.value);

const mutation = useMutation({
  mutationFn: async (file: File) =>
    uploadDoc(file, (p) => (progress.value = p)),
  onSuccess: () => {
    reset();
    emit('uploaded');
  },
});

function reset() {
  fileRef.value = null;
  progress.value = 0;
  if (inputEl.value) inputEl.value.value = '';
}

function onFileSelected(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null;
  fileRef.value = f;
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0] ?? null;
  fileRef.value = f ?? null;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
}
</script>

<template>
  <div class="rounded-2xl border bg-white overflow-hidden">
    <div class="border-b px-4 py-3 font-semibold">Upload document</div>

    <div class="p-4 space-y-3">
      <p class="text-xs text-gray-500">Allowed: PDF, PNG, JPG</p>

      <div
        class="border-2 border-dashed rounded-lg h-36 grid place-items-center text-gray-600 hover:bg-gray-50 cursor-pointer"
        @click="inputEl?.click()"
        @drop="onDrop"
        @dragover="onDragOver"
      >
        <span v-if="!fileRef">Click to choose a file or drop it here</span>
        <span v-else class="truncate">{{ fileRef.name }}</span>
        <input
          ref="inputEl"
          class="hidden"
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          @change="onFileSelected"
        />
      </div>

      <div class="flex items-center gap-3">
        <button
          class="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50"
          :disabled="!canUpload"
          @click="() => fileRef && mutation.mutate(fileRef)"
        >
          <span v-if="mutation.isPending.value">Uploading…</span>
          <span v-else>Upload</span>
        </button>

        <button
          class="px-3 py-1.5 rounded border"
          :disabled="mutation.isPending.value || !fileRef"
          @click="reset"
        >
          Clear
        </button>

        <div
          v-if="mutation.isPending.value"
          class="flex-1 h-2 bg-gray-100 rounded"
        >
          <div
            class="h-2 bg-indigo-500 rounded"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>

      <p v-if="mutation.isError.value" class="text-sm text-red-600">
        {{ (mutation.error.value as any)?.message ?? 'Upload failed' }}
      </p>
    </div>
  </div>
</template>
