<script lang="ts">
  import { user, loading, logout } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getUserSettings, updateReserveMonths, type UserSettings } from '$lib/settings';
  import { trigger, hapticsSupported } from '$lib/haptics';
  import { browser } from '$app/environment';
  
  let settings: UserSettings | null = null;
  let saving = false;
  let message = '';
  let hapticsReady = false;
  
  onMount(() => {
    if (browser) hapticsReady = hapticsSupported();
    
    if (!$loading && !$user) {
      goto('/login');
    } else if ($user) {
      loadSettings();
    }
  });

  function haptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
    if (hapticsReady) trigger(type);
  }
  
  $: if (!$loading && !$user) {
    goto('/login');
  }
  
  async function loadSettings() {
    if (!$user) return;
    settings = await getUserSettings($user.uid);
  }
  
  async function handleSave() {
    if (!$user || !settings) return;
    saving = true;
    message = '';
    
    try {
      await updateReserveMonths($user.uid, settings.reserveMonths);
      message = 'Saved!';
      setTimeout(() => message = '', 3000);
    } catch (err) {
      message = 'Error saving';
    } finally {
      saving = false;
    }
  }
</script>

{#if $loading}
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAFAF0;">
    <div class="nb-spinner"></div>
  </div>
{:else if $user}
  <div style="min-height: 100vh; background: #FAFAF0; padding-bottom: 80px;">
    <!-- Header -->
    <header style="background: #0A0A0A; border-bottom: 3px solid #0A0A0A; padding: 20px 20px 18px;">
      <div style="max-width: 600px; margin: 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
        <div>
          <p style="color: #FFE500; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 3px;">
            Treasury Management
          </p>
          <h1 style="color: #FAFAF0; font-size: 1.8rem; font-weight: 900; text-transform: uppercase; line-height: 1; letter-spacing: -0.01em;">
            Settings
          </h1>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <a 
            href="/" 
            style="background: #FAFAF0; border: 3px solid #FAFAF0; color: #0A0A0A; font-weight: 900;
                   font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer;
                   padding: 8px 14px; flex-shrink: 0; min-height: 44px; margin-top: 2px;
                   text-decoration: none; display: inline-flex; align-items: center;"
          >
            ← Back
          </a>
          <button
            on:click={() => { logout(); haptic('medium'); }}
            style="background: #FF1744; border: 3px solid #FF1744; color: #FFFFFF; font-weight: 900;
                   font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer;
                   padding: 8px 14px; flex-shrink: 0; min-height: 44px; margin-top: 2px;"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <div style="max-width: 600px; margin: 0 auto; padding: 24px 20px;">
      
      {#if settings}
        <!-- Prudent Reserve Card -->
        <div class="nb-card-yellow" style="padding: 28px; margin-bottom: 20px;">
          <h2 style="font-size: 1.1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px;">
            Prudent Reserve Target
          </h2>
          
          <div style="margin-bottom: 20px;">
            <label for="reserveMonths" class="nb-label" style="margin-bottom: 10px; display: block;">
              Target Reserve (months of expenses)
            </label>
            <input
              id="reserveMonths"
              type="number"
              min="1"
              max="12"
              bind:value={settings.reserveMonths}
              class="nb-input"
              style="font-size: 1.5rem; font-weight: 900; text-align: center; max-width: 120px;"
            />
            <p style="font-size: 0.8rem; font-weight: 600; color: #444; margin-top: 12px; line-height: 1.5;">
              AA suggests maintaining 2-3 months of operating expenses as a prudent reserve.
            </p>
          </div>
          
          {#if message}
            <div style="background: #0A0A0A; color: #00C853; padding: 12px 16px; margin-bottom: 16px; font-weight: 900; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.08em;">
              {message}
            </div>
          {/if}
          
          <button
            on:click={() => { handleSave(); haptic('success'); }}
            disabled={saving}
            class="nb-btn nb-btn-black"
            style={saving ? 'opacity: 0.5;' : ''}
          >
            {saving ? 'Saving...' : 'Save Settings →'}
          </button>
        </div>
        
        <!-- Info Card -->
        <div class="nb-card" style="padding: 24px;">
          <h3 style="font-size: 0.9rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">
            About Prudent Reserve
          </h3>
          
          <p style="font-size: 0.85rem; font-weight: 600; line-height: 1.6; color: #444;">
            The prudent reserve is a savings buffer recommended by AA to ensure group continuity 
            during lean periods. Your monthly burn rate is calculated from the average of your 
            last 3 months of expenses.
          </p>
          
          <div style="margin-top: 16px; padding: 16px; background: #F5F5F0; border: 2px solid #0A0A0A;">
            <div style="font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; color: #666;">
              How It Works
            </div>
            <ul style="font-size: 0.8rem; font-weight: 600; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
              <li>Monthly burn = Average of last 3 months expenses</li>
              <li>Target reserve = Burn rate × Target months</li>
              <li>Coverage = Current balance ÷ Monthly burn</li>
            </ul>
          </div>
        </div>
        
      {:else}
        <div style="display: flex; justify-content: center; padding: 60px 20px;">
          <div class="nb-spinner"></div>
        </div>
      {/if}
      
    </div>
  </div>
{/if}
