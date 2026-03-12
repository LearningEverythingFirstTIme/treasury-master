<script lang="ts">
  import '../app.css';
  import { user, loading } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { trigger, hapticsSupported } from '$lib/haptics';

  let hapticsReady = false;
  
  $: if (browser) {
    hapticsReady = hapticsSupported();
  }

  function handleNavigate() {
    if (hapticsReady) trigger('light');
  }

  $: if (browser && !$loading && !$user && $page.url.pathname !== '/login') {
    goto('/login');
  }
</script>

<div class="min-h-screen" style="background: #FAFAF0;">
  <div style="height: 5px; background: linear-gradient(to right, #FFE500 33%, #FF3366 66%, #0052FF 100%);"></div>
  <slot />
</div>
