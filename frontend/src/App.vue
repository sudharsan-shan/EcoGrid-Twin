<template>
  <div class="app-layout">
    <Navbar />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import { useTwinStore } from './store/twinStore'

const twinStore = useTwinStore()

onMounted(() => {
  twinStore.initialize()
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  padding: 20px 32px 40px 32px;
  max-width: 1550px;
  margin: 0 auto;
}

.main-content {
  width: 100%;
}
</style>
