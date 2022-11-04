<script setup>
  import { ref } from 'vue';
  const emit = defineEmits();
  let email = ref('');
  let validated = ref(false);
  let password = ref('');

  function login() {
    if (email.value && password.value) {
      fetch('https://api.digitalleman.com/v2/auth/local', {
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
    } else {
      validated.value = true;
    }
  }
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="container">
        <div class="col-lg-4 offset-lg-4">
          <h2>Sign In</h2>
          <form class="needs-validation" :class="{ 'was-validated': validated }" novalidate @submit.prevent="login">
            <div class="mt-3">
              <label class="form-label" for="email">Email</label>
              <input class="form-control" id="email" placeholder="Email" required type="email" v-model.lazy="email">
              <div class="invalid-feedback">
                Email is required.
              </div>
            </div>
            <div class="mt-3">
              <label class="form-label" for="password">Password</label>
              <input class="form-control" id="password" placeholder="Password" required type="password" v-model.lazy="password">
              <div class="invalid-feedback">
                Password is required.
              </div>
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