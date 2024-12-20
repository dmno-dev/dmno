<template>

  <div class="footer-connect">
    <h4>We need <strong>YOU</strong> to help shape the future of DMNO!</h4>
    <div class="footer-connect__wrap">
      <div class="footer-connect__email">
        <div>Sign up for our email list</div>
        <form @submit.prevent="onSubmit">
          <input v-if="isSubmitting" placeholder="Sending..." />
          <template v-else>
            <input v-model="email" type="text" :placeholder="emailSubmitted ? 'Thanks!' : 'Your email'" />
            <TileButton size="s" @click.prevent="onSubmit"><Icon icon="ion:ios-paper-plane" /></TileButton>
          </template>

        </form>
      </div>
      <div class="footer-connect__discord">
        <div>Come chat with us</div>
        <div>
          <TileButton :href="DISCORD_URL" target="_blank">Join our Discord!</TileButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import TileButton from './TileButton.vue';

const DISCORD_URL = DMNO_PUBLIC_CONFIG.DISCORD_JOIN_URL;

const email = ref();
const isSubmitting = ref(false);
const emailSubmitted = ref(false);

async function onSubmit() {
  isSubmitting.value = true;
  try {
    const response = await fetch(`${DMNO_PUBLIC_CONFIG.SIGNUP_API_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        source: 'docs-site',
      }),
    });
    if (response?.ok) {
      // TODO: move to wrapped lib which is smarter about enabling posthog or not
      (window as any).posthog.identify?.(email.value, { email: email.value });
      email.value = '';
      emailSubmitted.value = true;
    } else {
      const errorMessage = (await response?.json())?.message || 'Something went wrong';
      alert(errorMessage);
    }
  } catch (err) {
    console.log(err);
    alert('Something went wrong');
    alert(err);
  } finally {
    isSubmitting.value = false;
  }
}

</script>

<style lang="less" scoped>
.footer-connect {
  border-radius: 8px;
  margin-top: 1rem;
  border: 1px solid var(--brand-pink);
  background: var(--brand-pink--t2);

  html[data-theme='light'] & {
  }

  padding: 1rem;
  font-size: 14px;

  h4 strong {
    color: var(--brand-pink);
  }

  .footer-connect__wrap {
    display: grid;
    gap: 1rem;

    // label
    > div > div:first-child {
      padding-bottom: .5rem;
    }

    @media (min-width: 50rem) {
      grid-template-columns: 1fr 1fr;
      gap: 2rem;

      > div {
        position: relative;

        &:before {
          content: '';
          position: absolute;
          left: -1rem;
          height: 100%;
          width: 1px;
          background: currentColor;
          opacity: 30%;
        }
        &:first-child {
          &:before { display: none; }
        }
      }
    }
  }


  h4 {
    font-size: 1.3rem;
    text-align: center;
    margin-bottom: 1rem;
  }

  input {
    border: 1px solid white;
    background: rgba(0,0,0,.8);
    border-radius: 4px;
    padding: .5rem 1rem;
    display: block;
    width: 100%;

    &:focus {
      border-color: var(--brand-pink);
      outline: none;
    }

    html[data-theme='light'] & {
      background: white;
      border-color: black;
      &:focus {
        border-color: var(--brand-pink);
      }
    }
  }

  .footer-connect__email {
    position: relative;
    .tile-button {
      position: absolute;
      right: 0;
      bottom: 0;
      margin-right: 6px;
      margin-bottom: 6px;
      height: 26px;
      width: 26px;
    }
  }
}
</style>
