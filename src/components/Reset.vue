<script setup>
  import { ref } from 'vue';
  const emit = defineEmits();
  let email = ref('');
  let validated = ref(false);

  function reset() {
    if (email.value && password.value) {
      fetch('https://api.digitalleman.com/v2/auth/forgot-password', {
        body: JSON.stringify({
          email: email.value
        }),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      })
      .then((response) => response.json())
      .then((data) => {
        //if (data.jwt) emit('login', data.jwt);
      });   
    } else {
      validated.value = true;
    }
  }
</script>

<template>
  <div class="row">
    <div class="container">
      <div class="col-lg-4 offset-lg-4">
        <form class="needs-validation" :class="{ 'was-validated': validated }" novalidate @submit.prevent="reset">
          <div class="mt-3">
            <input class="form-control" id="email" placeholder="Email" required type="email" v-model.lazy="email">
            <div class="invalid-feedback">
              Email is required.
            </div>
          </div>
          <div class="mt-3">
            <input class="form-control" id="password" placeholder="Password" required type="password"
              v-model.lazy="password">
            <div class="invalid-feedback">
              Password is required.
            </div>
          </div>
          <div class="mt-3">
            <input class="form-control" id="passwordConfirmation" placeholder="Password Confirmation" required
              type="password" v-model.lazy="passwordConfirmation">
            <div class="invalid-feedback">
              Password confirmation is required.
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-primary">Reset Password</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>