<template>
  
  <div class="footer-connect">
    <h4>We need <span class="gradient-text">YOU</span> to help shape the future of DMNO!</h4>
    <div class="footer-connect__wrap">
      <div class="footer-connect__email">
        <div>Sign up for our email list</div>
        <form @submit.prevent="onSubmit">
          <input v-if="isSubmitting" placeholder="Sending..." />
          <template v-else>
            <input type="text" v-model="email" :placeholder="emailSubmitted ? 'Thanks!' : 'Your email'" />
            <a href="#" @click="onSubmit" class="button" v-html="ArrowIconSvg">
            </a>
          </template>
          
        </form>
      </div>
      <div class="footer-connect__discord">
        <div>Come chat with us</div>
        <a class="button" :href="DISCORD_URL" target="_blank">Join our Discord!</a>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import ArrowIconSvg from "~icons/ion/ios-paper-plane?raw";

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

<style lang="less">
.footer-connect {
  border-radius: 8px;
  margin-top: 2rem;
  // border: 1px solid var(--brand-white);

  // border-image-source: linear-gradient(30deg, var(--brand-purple), var(--brand-cyan));
  // border-image-slice: 1;

  // border-color: var(--brand-cyan);
  background: black;

  // background: linear-gradient(35deg, var(--brand-blue--dark) 0%, var(--brand-cyan--dark) 100%);
  
  html[data-theme='light'] & {
    border: 1px solid black;
    background: white;
    color: black;
  }

  color:white;
  padding: 2rem;
  font-size: 14px;
  

  .footer-connect__wrap {
    display: grid;
    gap: 2rem;
    @media (min-width: 50rem) {
      grid-template-columns: 1fr 1fr;
      gap: 4rem;


      
      > div {
        position: relative;
        &:before {
          content: '';
          position: absolute;
          left: -2rem;
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
  
  a.button, input {
    margin-top: .5rem;
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
    a.button {
      position: absolute;
      right: 0;
      bottom: 0;
      margin-right: 6px;
      margin-bottom: 6px;
      width: 26px;
      height: 26px;
      border-radius: 2px;
      display: flex;
      align-items: center;
      >svg {
        display: block;
        width: inherit;
        height: inherit;
        padding: 4px;
        // margin-left: -1px;
      }
    }
  }

  a.button {
    // border: 1px solid var(--brand-purple);
    // background: linear-gradient(35deg, var(--brand-purple) 0%, var(--brand-blue) 100%);
    background: var(--brand-purple);
    display: block;
    width: 100%;
    // height: 40px;
    border-radius: 4px;
    text-decoration: none;
    text-align: center;
    color: white;
    font-weight: bold;
    padding: 8px 0;
    &:hover {
      transform: translate3d(-2px, -2px, 0);
      // border-color: var(--brand-pink);
      background: var(--brand-pink);
      box-shadow: 2px 2px 0 var(--tile-drop-shadow);
    }
    &:focus {
      outline: 1px solid var(--brand-pink);
    }
    &:active {
      transform: translate3d(0, 0, 0);
      box-shadow: none;
    }
  }

}
</style>
