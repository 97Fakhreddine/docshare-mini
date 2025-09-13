<script setup lang="ts">
import { downloadDoc } from '@/api/documents'

const props = defineProps<{
  items: Array<{
    id: string
    filename: string
    mime: string
    size: number
    createdAt: string | Date
  }>
  isLoading?: boolean
  isError?: boolean
}>()

async function onDownload(id: string, fallbackName: string) {
  try {
    const { blob, filename } = await downloadDoc(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || fallbackName || `document-${id}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Download failed', e)
    alert('Unable to download file.')
  }
}
</script>

<template>
  <div class="mt-6">
    <div v-if="isLoading" class="text-sm text-gray-500">Loading…</div>
    <div v-else-if="isError" class="text-sm text-red-600">Could not load documents.</div>
    <div v-else-if="!items || !items.length" class="text-sm text-gray-500">No documents yet.</div>

    <table v-else class="w-full text-left text-sm border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 pr-3">File</th>
          <th class="py-2 pr-3">Type</th>
          <th class="py-2 pr-3">Size</th>
          <th class="py-2 pr-3">Uploaded</th>
          <th class="py-2 pr-0"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in items" :key="d.id" class="border-b hover:bg-gray-50">
          <td class="py-2 pr-3 truncate">{{ d.filename }}</td>
          <td class="py-2 pr-3">{{ d.mime }}</td>
          <td class="py-2 pr-3">{{ (d.size ?? 0).toLocaleString() }} B</td>
          <td class="py-2 pr-3">{{ new Date(d.createdAt).toLocaleString() }}</td>
          <td class="py-2 pr-0 text-right">
            <button
              class="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              @click="onDownload(d.id, d.filename)"
            >
              Download
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
