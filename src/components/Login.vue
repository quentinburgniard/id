<script setup>
  import { ref } from 'vue';
  const emit = defineEmits();
  let email = ref('');
  let password = ref('');

  function login() {
    if (email.value && password.value) {
      fetch('https://api-v2.preview.quentinburgniard.com/api/auth/local', {
        body: JSON.stringify({
          identifier: email.value,
          password: password.value
        }),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      })
      .then((response) => response.json())
      .then((data) => {
        if (data.jwt) emit('login', data.jwt);
      });   
    }
  }
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="container">
        <div class="col-lg-4 offset-lg-4">
          <h2>Sign In</h2>
          <form @submit.prevent="login">
            <div class="mt-3">
              <label class="form-label" for="email">Email</label>
              <input class="form-control" id="email" placeholder="Email" type="email" v-model.lazy="email">
            </div>
            <div class="mt-3">
              <label class="form-label" for="password">Password</label>
              <input class="form-control" id="password" placeholder="Password" type="password" v-model.lazy="password">
            </div>
            <div class="mt-3">
              <button class="btn btn-primary">Sign In</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>