<script setup>
  import { ref, watch } from 'vue';
  import Login from './components/Login.vue'
  let token = ref(getToken());

  function getToken () {
    let token = '';
    document.cookie.split('; ').forEach(cookie => {
      let match = cookie.match(/^t=(.+)$/);
      if (match && match[1]) token = match[1];
    });
    return token;
  }

  function login (jwt) {
    token.value = jwt;
  }

  watch(token, async (newToken) => {
    document.cookie = 't=' + newToken + ';domain=digitalleman.com;max-age=604740;samesite=strict;secure';
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