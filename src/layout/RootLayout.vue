<template>
  <div class="min-h-screen flex flex-col">
    <header class="fixed top-0 left-0 right-0 h-16 flex items-center gap-3 px-4 border-b bg-white z-50">
      <img src="@/assets/logo.svg" alt="logo" class="w-10 h-10" />
      <div class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">听闻绩效平台</div>
    </header>

    <main class="flex-1 pt-16">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// 根布局：Header 固定在顶部，使用 Tailwind 实用类

</script>

<style>
main {
  background: #F8FAFC;
}
</style>
