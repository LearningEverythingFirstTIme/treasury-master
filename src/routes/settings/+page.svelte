<script lang="ts">
  import { user, loading } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getUserSettings, updateReserveMonths, type UserSettings } from '$lib/settings';
  
  let settings: UserSettings | null = null;
  let saving = false;
  let message = '';
  
  onMount(() => {
    if (!$loading && !$user) {
      goto('/login');
    } else if ($user) {
      loadSettings();
    }
  });
  
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
      message = 'Settings saved!';
      setTimeout(() => message = '', 3000);
    } catch (err) {
      message = 'Error saving settings';
    } finally {
      saving = false;
    }
  }
</script>

{#if $loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="w-8 h-8 border-4 border-warm-300 border-t-warm-600 rounded-full animate-spin"></div>
  </div>
{:else if $user}
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6">
      <a href="/" class="text-warm-600 hover:text-warm-800 text-2xl">←</a>
      <h1 class="text-2xl font-bold text-warm-800 mt-2">Settings</h1>
    </header>
    
    {#if settings}
      <div class="bg-white rounded-2xl shadow-md p-6">
        <h2 class="text-lg font-semibold text-warm-800 mb-4">Prudent Reserve</h2>
        
        <div class="space-y-4">
          <div>
            <label for="reserveMonths" class="block text-sm font-medium text-warm-700 mb-2">
              Target Reserve (months of expenses)
            </label>
            <input
              id="reserveMonths"
              type="number"
              min="1"
              max="12"
              bind:value={settings.reserveMonths}
              class="w-full px-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none text-lg"
            />
            <p class="text-sm text-warm-500 mt-2">
              AA suggests maintaining 2-3 months of operating expenses as a prudent reserve.
            </p>
          </div>
          
          {#if message}
            <div class="text-sm text-sage-600 font-medium">{message}</div>
          {/if}
          
          <button
            on:click={handleSave}
            disabled={saving}
            class="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl hover:bg-sage-700 disabled:opacity-50 shadow-md"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
      
      <!-- Info Card -->
      <div class="mt-6 bg-sage-50 rounded-2xl p-6">
        <h3 class="font-semibold text-sage-800 mb-2">About Prudent Reserve</h3>
        <p class="text-sm text-sage-700 leading-relaxed">
          The prudent reserve is a savings buffer recommended by AA to ensure group continuity 
          during lean periods. Your monthly burn rate is calculated from the average of your 
          last 3 months of expenses.
        </p>
      </div>
    {:else}
      <div class="flex justify-center py-12">
        <div class="w-8 h-8 border-4 border-warm-300 border-t-warm-600 rounded-full animate-spin"></div>
      </div>
    {/if}
  </div>
{/if}
