<script setup>
  import { ref, watch } from 'vue';
  import Login from './components/Login.vue'
  let token = ref(localStorage.getItem('token') || '');

  function login (jwt) {
    token.value = jwt;
  }

  watch(token, async (newToken) => {
    document.cookie = 'token=' + newToken + ';samesite=strict;secure'; // ;domain=digitalleman.com
    localStorage.setItem('token', newToken);
    let redirect = new URLSearchParams(document.location.search).get('redirect');
    if (redirect) window.location.replace(redirect);
  })
</script>

<template>
  <Login v-if="token == ''" @login="login"/>
</template>
