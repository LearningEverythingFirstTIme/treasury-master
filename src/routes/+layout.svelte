<script lang="ts">
  import '../app.css';
  import { user, loading } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  
  $: if (browser && !$loading && !$user && $page.url.pathname !== '/login') {
    goto('/login');
  }
</script>

<div class="min-h-screen">
  <slot />
</div>
