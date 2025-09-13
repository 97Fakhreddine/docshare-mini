<script setup lang="ts">
import { ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { uploadDoc } from '@/api/documents'
import { createShare } from '@/api/shares'

const fileRef = ref<File | null>(null)
const emails = ref('')
const busy = ref(false)
const qc = useQueryClient()

function onPick(e: Event) {
  const t = e.target as HTMLInputElement
  const f = t.files?.[0] || null
  fileRef.value = f
}
function onDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0] || null
  fileRef.value = f || null
}

const m = useMutation({
  mutationFn: async () => {
    if (!fileRef.value) throw new Error('Please choose a file')
    busy.value = true
    // 1) upload
    const doc = await uploadDoc(fileRef.value)

    // 2) share with provided emails (if any)
    const list = (emails.value || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    for (const email of list) {
      try {
        await createShare({ documentId: doc.id, targetEmail: email })
      } catch (_) {
        // ignore 409 or validation issues per recipient
      }
    }

    // 3) refresh lists
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['mine'] }),
      qc.invalidateQueries({ queryKey: ['shared'] }),
    ])

    // reset UI
    fileRef.value = null
    emails.value = ''
    busy.value = false
  },
})
</script>

<template>
  <div class="rounded border p-4">
    <h3 class="font-semibold mb-2">Upload & share (viewer access)</h3>
    <p class="text-xs text-gray-500 mb-3">Allowed: PDF, PNG, JPG</p>

    <div
      class="border-2 border-dashed rounded p-8 text-center mb-3"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <input type="file" accept="application/pdf,image/png,image/jpeg" class="hidden" id="pick" @change="onPick" />
      <label for="pick" class="cursor-pointer block">
        <div v-if="!fileRef">Click to choose a file or drop it here</div>
        <div v-else class="font-medium">{{ fileRef.name }}</div>
      </label>
    </div>

    <label class="block text-sm font-medium mb-1">Share with emails (comma separated)</label>
    <input
      v-model="emails"
      class="w-full border rounded px-3 py-2 mb-3"
      placeholder="alice@example.com, bob@example.com"
      autocomplete="off"
    />

    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded bg-indigo-500 text-white disabled:opacity-50"
        :disabled="busy || !fileRef"
        @click="m.mutate()"
      >
        {{ busy ? 'Uploading…' : 'Upload & Share' }}
      </button>
      <button class="px-4 py-2 rounded border" :disabled="busy" @click="fileRef=null; emails=''">
        Clear
      </button>
    </div>
  </div>
</template>
