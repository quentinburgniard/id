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
  <div class="row">
    <div class="col-lg-4 offset-lg-4">
      <div class="ds-title">
        <h1 class="_ds-title title">Sign In</h1>
      </div>
    </div>
  </div>
  <form class="ds-form" @submit.prevent="login">
    <div class="row">
      <div class="col-lg-4 offset-lg-4">
        <div class="_ds-form text">
          <label for="email">Email</label>
          <input autocapitalize="none" id="email" name="email" placeholder="contact@quentinburgniard.com" required type="email" v-model.lazy="email">
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-4 offset-lg-4">
        <div class="_ds-form text">
          <label for="password">Password</label>
          <input id="password" name="password" required type="password" v-model.lazy="password">
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-4 offset-lg-4">
        <button class="ds-link" type="submit">
          <div class="_ds-link body">
            <div class="_ds-link title">Sign In</div>
          </div>
          <div class="_ds-link action-icon">
            <i class="bi bi-box-arrow-in-right"></i>
          </div>
        </button>
      </div>
    </div>
  </form>
  <div class="ds-menu z-index-medium" id="ds-menu">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <a alt="Français" class="ds-link" href="/">
            <div class="_ds-link caption-icon">
              <i class="bi bi-globe"></i>
            </div>
            <div class="_ds-link body">
              <div class="_ds-link title">Français</div>
            </div>
            <div class="_ds-link action-icon">
              <i class="bi bi-chevron-right"></i>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>