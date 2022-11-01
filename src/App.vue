<script setup>
  import { ref, watch } from 'vue';
  import Login from './components/Login.vue'
  let token = ref(localStorage.getItem('token') || '');

  function login (jwt) {
    token.value = jwt;
  }

  watch(token, async (newToken) => {
    document.cookie = 't=' + newToken + ';domain=' + location.hostname.match(/[^.]+[.][^.]+$/)[0] + ';samesite=strict;secure';
    localStorage.setItem('t', newToken);
    let redirect = new URLSearchParams(document.location.search).get('r');
    if (redirect) window.location.replace(redirect + '?t=' + newToken);
  })
</script>

<template>
  <Login v-if="token == ''" @login="login"/>
</template>