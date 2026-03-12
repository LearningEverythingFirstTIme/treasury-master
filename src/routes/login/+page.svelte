<script lang="ts">
  import { user, loading, login, signup, logout } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { trigger, hapticsSupported } from '$lib/haptics';
  import { browser } from '$app/environment';

  let email = '';
  let password = '';
  let isLogin = true;
  let error = '';
  let hapticsReady = false;

  if (browser) hapticsReady = hapticsSupported();

  function haptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
    if (hapticsReady) trigger(type);
  }

  async function handleSubmit() {
    error = '';
    haptic('light');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      goto('/');
    } catch (e: any) {
      error = e.message || 'Authentication failed';
      haptic('error');
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-6" style="background: #FAFAF0;">
  <div class="w-full max-w-sm">

    <!-- Identity block -->
    <div class="mb-8">
      <div
        style="display: inline-block; background: #FFE500; border: 3px solid #0A0A0A;
               box-shadow: 4px 4px 0 #0A0A0A; padding: 5px 14px; margin-bottom: 18px;"
      >
        <span style="font-size: 0.63rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em;">
          AA Treasury Management
        </span>
      </div>
      <h1 style="font-size: 2.8rem; font-weight: 900; text-transform: uppercase; line-height: 0.95;
                 letter-spacing: -0.02em; color: #0A0A0A;">
        Jim's<br>Treasury<br>Tracker
      </h1>
    </div>

    <!-- Form card -->
    <div class="nb-card" style="padding: 28px;">

      {#if $loading}
        <div style="display: flex; justify-content: center; padding: 24px 0;">
          <div class="nb-spinner"></div>
        </div>

      {:else if $user}
        <p style="font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">
          Signed in
        </p>
        <p style="font-weight: 600; color: #555; margin-bottom: 20px; word-break: break-all; font-size: 0.9rem;">
          {$user.email}
        </p>
        <button on:click={() => { goto('/'); haptic('light'); }} class="nb-btn nb-btn-yellow" style="margin-bottom: 10px;">
          Go to Treasuries →
        </button>
        <button on:click={() => { logout(); haptic('medium'); }} class="nb-btn nb-btn-white">
          Sign Out
        </button>

      {:else}
        <p style="font-size: 0.95rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 22px;">
          {isLogin ? 'Sign In' : 'Create Account'}
        </p>

        <form on:submit|preventDefault={handleSubmit} style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label for="email" class="nb-label">Email</label>
            <input id="email" type="email" bind:value={email} required class="nb-input" placeholder="your@email.com" />
          </div>

          <div>
            <label for="password" class="nb-label">Password</label>
            <input id="password" type="password" bind:value={password} required minlength="6" class="nb-input" placeholder="••••••••" />
          </div>

          {#if error}
            <div style="background: #FF1744; border: 3px solid #0A0A0A; padding: 12px 14px;
                        color: #fff; font-weight: 700; font-size: 0.85rem;">
              {error}
            </div>
          {/if}

          <button type="submit" class="nb-btn nb-btn-yellow" style="margin-top: 6px;">
            {isLogin ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <div style="margin-top: 22px; padding-top: 18px; border-top: 3px solid #0A0A0A; text-align: center;">
          <button
            on:click={() => { isLogin = !isLogin; error = ''; haptic('light'); }}
            style="background: none; border: none; cursor: pointer; font-weight: 800; font-size: 0.78rem;
                   text-transform: uppercase; letter-spacing: 0.06em; text-decoration: underline;
                   text-underline-offset: 4px; color: #0A0A0A; min-height: 44px;"
          >
            {isLogin ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          </button>
        </div>
      {/if}

    </div>
  </div>
</div>
