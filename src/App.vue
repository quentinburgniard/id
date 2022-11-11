<script setup>
  import { ref, watch } from 'vue';
  import Login from './components/Login.vue'
  let token = ref(localStorage.getItem('token') || '');

  function login (jwt) {
    token.value = jwt;
  }

  watch(token, async (newToken) => {
    document.cookie = 't=' + newToken + ';domain=digitalleman.com;samesite=strict;secure';
    let redirect = new URLSearchParams(document.location.search).get('r');
    if (redirect) {
      redirect = 'https://' + redirect;
      if (!redirect.includes('digitalleman.com')) redirect += '?t=' + newToken;
      window.location.replace(redirect);
    }
  })
</script>

<template>
  <Login v-if="token == ''" @login="login"/>
</template>