<script lang="ts">
  import { user, loading, logout } from '$lib/auth';
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
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAFAF0;">
    <div class="nb-spinner"></div>
  </div>

{:else if $user}
  <div style="min-height: 100vh; background: #FAFAF0; padding-bottom: 80px;">

    <!-- ── Header ───────────────────────────────────── -->
    <header style="background: #0A0A0A; border-bottom: 3px solid #0A0A0A; padding: 20px 20px 18px;">
      <div style="max-width: 600px; margin: 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
        <div>
          <p style="color: #FFE500; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 3px;">
            Treasury Management
          </p>
          <h1 style="color: #FAFAF0; font-size: 1.8rem; font-weight: 900; text-transform: uppercase; line-height: 1; letter-spacing: -0.01em;">
            My Treasuries
          </h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <a 
            href="/settings" 
            style="background: #0052FF; border: 3px solid #0052FF; color: #FFFFFF; font-weight: 900;
                   font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer;
                   padding: 8px 14px; flex-shrink: 0; min-height: 44px; margin-top: 2px;
                   text-decoration: none; display: inline-flex; align-items: center;"
          >
            ⚙️
          </a>
          <button
            on:click={logout}
            style="background: #FFE500; border: 3px solid #FFE500; color: #0A0A0A; font-weight: 900;
                   font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer;
                   padding: 8px 14px; flex-shrink: 0; min-height: 44px; margin-top: 2px;
                   transition: background 0.1s ease;"
            on:mouseenter={(e) => (e.currentTarget.style.background = '#fff')}
            on:mouseleave={(e) => (e.currentTarget.style.background = '#FFE500')}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <div style="max-width: 600px; margin: 0 auto; padding: 24px 20px;">

      <!-- ── Error ───────────────────────────────────── -->
      {#if loadError}
        <div style="background: #FF1744; border: 3px solid #0A0A0A; box-shadow: 4px 4px 0 #0A0A0A;
                    padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
          <p style="color: #fff; font-weight: 700;">{loadError}</p>
          <button
            on:click={loadTreasuries}
            style="background: #fff; border: 2px solid #fff; color: #FF1744; font-weight: 900;
                   font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
                   cursor: pointer; padding: 6px 12px; min-height: 36px;"
          >
            Retry
          </button>
        </div>
      {/if}

      <!-- ── Empty state ─────────────────────────────── -->
      {#if treasuries.length === 0 && !showCreate}
        <div class="nb-card-yellow" style="padding: 48px 32px; text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 16px; line-height: 1;">💰</div>
          <h2 style="font-size: 1.4rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 8px;">
            No Treasuries Yet
          </h2>
          <p style="color: #444; font-weight: 600; margin-bottom: 28px; font-size: 0.9rem;">
            Create your first treasury to start tracking
          </p>
          <button on:click={() => showCreate = true} class="nb-btn nb-btn-black">
            + Create First Treasury
          </button>
        </div>

      {:else}
        <!-- ── Treasury list ────────────────────────── -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          {#each treasuries as treasury, i}
            <a
              href="/treasury/{treasury.id}"
              class="nb-card"
              style="display: flex; align-items: center; justify-content: space-between;
                     padding: 22px 24px; text-decoration: none; color: #0A0A0A;
                     transition: transform 0.08s ease, box-shadow 0.08s ease;"
              on:mouseenter={(e) => {
                e.currentTarget.style.transform = 'translate(-2px,-2px)';
                e.currentTarget.style.boxShadow = '8px 8px 0 #0A0A0A';
              }}
              on:mouseleave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '6px 6px 0 #0A0A0A';
              }}
            >
              <div style="flex: 1; min-width: 0;">
                <!-- Accent strip alternates yellow / pink / blue -->
                <div style="display: inline-block; background: {['#FFE500','#FF3366','#0052FF'][i % 3]};
                             border: 2px solid #0A0A0A; padding: 2px 10px; margin-bottom: 10px;">
                  <span style="font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em;
                                color: {i % 3 === 1 ? '#fff' : '#0A0A0A'};">
                    Treasury {i + 1}
                  </span>
                </div>
                <h2 style="font-size: 1.2rem; font-weight: 900; text-transform: uppercase; line-height: 1.1; margin: 0;">
                  {treasury.name}
                </h2>
                {#if treasury.description}
                  <p style="color: #555; font-size: 0.85rem; font-weight: 600; margin-top: 4px;">
                    {treasury.description}
                  </p>
                {/if}
              </div>
              <div style="font-size: 1.8rem; font-weight: 900; margin-left: 16px; flex-shrink: 0;">→</div>
            </a>
          {/each}

          {#if !showCreate}
            <button
              on:click={() => showCreate = true}
              style="width: 100%; background: #FAFAF0; border: 3px dashed #0A0A0A; color: #0A0A0A;
                     font-weight: 900; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.07em;
                     cursor: pointer; padding: 20px; min-height: 52px;
                     transition: background 0.1s ease;"
              on:mouseenter={(e) => (e.currentTarget.style.background = '#FFE500')}
              on:mouseleave={(e) => (e.currentTarget.style.background = '#FAFAF0')}
            >
              + Add New Treasury
            </button>
          {/if}
        </div>
      {/if}

    </div>

    <!-- ── Create modal ───────────────────────────────── -->
    {#if showCreate}
      <div style="position: fixed; inset: 0; background: rgba(10,10,10,0.7); display: flex;
                  align-items: center; justify-content: center; padding: 20px; z-index: 50;">
        <div class="nb-card" style="width: 100%; max-width: 440px; padding: 32px;">

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
            <h2 style="font-size: 1.1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em;">
              New Treasury
            </h2>
            <button
              on:click={() => showCreate = false}
              style="background: none; border: none; cursor: pointer; font-size: 1.5rem;
                     font-weight: 900; line-height: 1; padding: 4px 8px; min-height: 44px;"
            >
              ×
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label for="treasuryName" class="nb-label">Name *</label>
              <input
                id="treasuryName"
                type="text"
                bind:value={newName}
                placeholder="e.g., Matt Talbot Retreat"
                class="nb-input"
              />
            </div>

            <div>
              <label for="treasuryDesc" class="nb-label">Description (optional)</label>
              <input
                id="treasuryDesc"
                type="text"
                bind:value={newDescription}
                placeholder="e.g., High volume, twice yearly"
                class="nb-input"
              />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px;">
              <button on:click={() => showCreate = false} class="nb-btn nb-btn-white">
                Cancel
              </button>
              <button
                on:click={handleCreate}
                disabled={!newName.trim() || creating}
                class="nb-btn nb-btn-yellow"
              >
                {creating ? 'Creating...' : 'Create →'}
              </button>
            </div>
          </div>

        </div>
      </div>
    {/if}

  </div>
{/if}
