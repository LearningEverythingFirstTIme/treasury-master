<script lang="ts">
  import { user, loading, login, signup, logout } from '$lib/auth';
  import { goto } from '$app/navigation';
  
  let email = '';
  let password = '';
  let isLogin = true;
  let error = '';
  
  async function handleSubmit() {
    error = '';
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      goto('/');
    } catch (e: any) {
      error = e.message || 'Authentication failed';
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-warm-800 mb-2">Jim's Treasury Tracker</h1>
      <p class="text-warm-600">Simple, peaceful money management</p>
    </div>
    
    {#if $loading}
      <div class="text-center py-8">
        <div class="inline-block w-8 h-8 border-4 border-warm-300 border-t-warm-600 rounded-full animate-spin"></div>
      </div>
    {:else if $user}
      <div class="text-center">
        <p class="text-warm-700 mb-4">Welcome back! You're signed in as {$user.email}</p>
        <button
          on:click={() => goto('/')}
          class="w-full bg-sage-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-sage-700 mb-3"
        >
          Go to My Treasuries
        </button>
        <button
          on:click={logout}
          class="w-full bg-warm-200 text-warm-800 font-semibold py-4 px-6 rounded-xl hover:bg-warm-300"
        >
          Sign Out
        </button>
      </div>
    {:else}
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-warm-700 mb-1">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            class="w-full px-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none"
            placeholder="your@email.com"
          />
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-warm-700 mb-1">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            required
            minlength="6"
            class="w-full px-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none"
            placeholder="••••••••"
          />
        </div>
        
        {#if error}
          <p class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
        {/if}
        
        <button
          type="submit"
          class="w-full bg-sage-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-sage-700 shadow-md"
        >
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      
      <div class="mt-6 text-center">
        <button
          on:click={() => isLogin = !isLogin}
          class="text-sage-600 hover:text-sage-700 font-medium"
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    {/if}
  </div>
</div>
