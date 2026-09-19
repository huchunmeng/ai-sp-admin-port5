<template>
  <div class="card" style="text-align:center;padding:60px 20px;color:var(--text-secondary)">
    <h3 style="margin-bottom:8px">{{ route.meta.title }}</h3>
    <p>该模块正在建设中</p>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
