<script lang="ts">
  import { user, loading } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getUserTreasuries, createTreasury, type Treasury } from '$lib/treasury';
  
  let treasuries: Treasury[] = [];
  let showCreate = false;
  let newName = '';
  let newDescription = '';
  let creating = false;
  let loadError = '';
  let isLoading = true;
  
  onMount(() => {
    // Wait for auth to be ready, then load
    const unsubscribe = loading.subscribe((isAuthLoading) => {
      if (!isAuthLoading) {
        if (!$user) {
          goto('/login');
        } else {
          loadTreasuries();
        }
        unsubscribe();
      }
    });
  });
  
  $: if (!$loading && !$user) {
    goto('/login');
  }
  
  async function loadTreasuries() {
    if (!$user) return;
    isLoading = true;
    loadError = '';
    try {
      console.log('Loading treasuries for user:', $user.uid);
      treasuries = await getUserTreasuries($user.uid);
      console.log('Loaded treasuries:', treasuries);
    } catch (err: any) {
      console.error('Error loading treasuries:', err);
      loadError = err.message || 'Failed to load treasuries';
    } finally {
      isLoading = false;
    }
  }
  
  async function handleCreate() {
    if (!$user || !newName.trim()) return;
    creating = true;
    try {
      await createTreasury($user.uid, newName.trim(), newDescription.trim());
      await loadTreasuries();
      showCreate = false;
      newName = '';
      newDescription = '';
    } finally {
      creating = false;
    }
  }
</script>

{#if $loading || isLoading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="w-8 h-8 border-4 border-warm-300 border-t-warm-600 rounded-full animate-spin"></div>
  </div>
{:else if $user}
  <div class="min-h-screen p-4 pb-24">
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-warm-800">My Treasuries</h1>
        <p class="text-warm-600">Select a treasury to manage</p>
      </div>
      <a 
        href="/settings" 
        class="text-warm-600 hover:text-warm-800 p-2"
        title="Settings"
      >
        ⚙️
      </a>
    </header>
    
    {#if loadError}
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
        <p class="text-red-700">Error: {loadError}</p>
        <button 
          on:click={loadTreasuries}
          class="mt-2 text-red-600 underline"
        >
          Retry
        </button>
      </div>
    {/if}
    
    {#if treasuries.length === 0 && !showCreate}
      <div class="bg-white rounded-2xl shadow-md p-8 text-center">
        <div class="text-6xl mb-4">💰</div>
        <h2 class="text-xl font-semibold text-warm-800 mb-2">No treasuries yet</h2>
        <p class="text-warm-600 mb-6">Create your first treasury to start tracking</p>
        <button
          on:click={() => showCreate = true}
          class="bg-sage-600 text-white font-semibold py-4 px-8 rounded-xl hover:bg-sage-700 shadow-md"
        >
          Create First Treasury
        </button>
      </div>
    {:else}
      <div class="space-y-4">
        {#each treasuries as treasury}
          <a
            href="/treasury/{treasury.id}"
            class="block bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-semibold text-warm-800">{treasury.name}</h2>
                {#if treasury.description}
                  <p class="text-warm-600 text-sm mt-1">{treasury.description}</p>
                {/if}
              </div>
              <span class="text-3xl">→</span>
            </div>
          </a>
        {/each}
        
        {#if !showCreate}
          <button
            on:click={() => showCreate = true}
            class="w-full bg-warm-100 text-warm-800 font-semibold py-4 px-6 rounded-xl hover:bg-warm-200 border-2 border-dashed border-warm-300"
          >
            + Add New Treasury
          </button>
        {/if}
      </div>
    {/if}
    
    {#if showCreate}
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
          <h2 class="text-xl font-bold text-warm-800 mb-4">Create New Treasury</h2>
          
          <div class="space-y-4">
            <div>
              <label for="treasuryName" class="block text-sm font-medium text-warm-700 mb-1">Name *</label>
              <input
                id="treasuryName"
                type="text"
                bind:value={newName}
                placeholder="e.g., Matt Talbot Retreat"
                class="w-full px-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none"
              />
            </div>
            
            <div>
              <label for="treasuryDesc" class="block text-sm font-medium text-warm-700 mb-1">Description</label>
              <input
                id="treasuryDesc"
                type="text"
                bind:value={newDescription}
                placeholder="e.g., High volume, twice yearly"
                class="w-full px-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none"
              />
            </div>
            
            <div class="flex gap-3 pt-2">
              <button
                on:click={() => showCreate = false}
                class="flex-1 bg-warm-200 text-warm-800 font-semibold py-4 rounded-xl hover:bg-warm-300"
              >
                Cancel
              </button>
              <button
                on:click={handleCreate}
                disabled={!newName.trim() || creating}
                class="flex-1 bg-sage-600 text-white font-semibold py-4 rounded-xl hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
