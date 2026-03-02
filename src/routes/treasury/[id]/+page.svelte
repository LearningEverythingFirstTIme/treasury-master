<script lang="ts">
  import { page } from '$app/stores';
  import { user, loading } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { 
    getUserTreasuries, 
    getTreasuryTransactions, 
    addTransaction, 
    deleteTransaction,
    calculateBalance,
    getCategoryBreakdown,
    addCategory,
    removeCategory,
    type Treasury,
    type Transaction
  } from '$lib/treasury';
  import { DEFAULT_CATEGORIES } from '$lib/types';
  import ReserveWidget from '$lib/components/ReserveWidget.svelte';
  import { getUserSettings, type UserSettings } from '$lib/settings';
  
  $: treasuryId = $page.params.id as string;
  
  let treasury: Treasury | null = null;
  let transactions: Transaction[] = [];
  let loadingData = true;
  let settings: UserSettings | null = null;
  
  let showAddTransaction = false;
  let showManageCategories = false;
  
  let newAmount = '';
  let newType: 'income' | 'expense' = 'income';
  let newCategory = '';
  let newNote = '';
  let newDate = new Date().toISOString().split('T')[0];
  
  let newCategoryName = '';
  let categoryType: 'income' | 'expense' = 'income';
  
  $: balance = calculateBalance(transactions);
  $: categoryBreakdown = getCategoryBreakdown(transactions);
  $: recentTransactions = transactions.slice(0, 20);
  
  $: incomeCategories = [...DEFAULT_CATEGORIES.income, ...(treasury?.categories || [])];
  $: expenseCategories = [...DEFAULT_CATEGORIES.expense, ...(treasury?.categories || [])];
  
  onMount(() => {
    if (!$loading && !$user) {
      goto('/login');
    } else if ($user) {
      loadData();
    }
  });
  
  $: if (!$loading && !$user) {
    goto('/login');
  }
  
  async function loadData() {
    if (!$user) return;
    loadingData = true;
    
    const [treasuries, userSettings] = await Promise.all([
      getUserTreasuries($user.uid),
      getUserSettings($user.uid)
    ]);
    
    settings = userSettings;
    treasury = treasuries.find((t: Treasury) => t.id === treasuryId) || null;
    
    if (treasury) {
      transactions = await getTreasuryTransactions(treasuryId);
    }
    
    loadingData = false;
  }
  
  async function handleAddTransaction() {
    if (!$user || !newAmount || !newCategory) return;
    
    await addTransaction($user.uid, treasuryId, {
      amount: parseFloat(newAmount),
      type: newType,
      category: newCategory,
      note: newNote,
      date: new Date(newDate)
    });
    
    await loadData();
    
    newAmount = '';
    newNote = '';
    newDate = new Date().toISOString().split('T')[0];
    showAddTransaction = false;
  }
  
  async function handleDeleteTransaction(id: string) {
    if (confirm('Delete this transaction?')) {
      await deleteTransaction(id);
      await loadData();
    }
  }
  
  async function handleAddCategory() {
    if (!newCategoryName.trim() || !treasury) return;
    await addCategory(treasury.id, newCategoryName.trim());
    await loadData();
    newCategoryName = '';
  }
  
  async function handleRemoveCategory(category: string) {
    if (!treasury) return;
    await removeCategory(treasury.id, category);
    await loadData();
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
</script>

{#if $loading || loadingData}
  <div class="min-h-screen flex items-center justify-center">
    <div class="w-8 h-8 border-4 border-warm-300 border-t-warm-600 rounded-full animate-spin"></div>
  </div>
{:else if !treasury}
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="text-center">
      <p class="text-warm-600 mb-4">Treasury not found</p>
      <a href="/" class="text-sage-600 hover:text-sage-700 font-medium">← Back to treasuries</a>
    </div>
  </div>
{:else if !settings}
  <div class="min-h-screen flex items-center justify-center">
    <div class="w-8 h-8 border-4 border-warm-300 border-t-warm-600 rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen pb-24">
    <!-- Header -->
    <header class="bg-white shadow-sm p-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <a href="/" class="text-warm-600 hover:text-warm-800 text-2xl">←</a>
        <div class="text-center">
          <h1 class="text-lg font-bold text-warm-800 truncate max-w-[200px]">{treasury.name}</h1>
        </div>
        <button
          on:click={() => showManageCategories = true}
          class="text-warm-600 hover:text-warm-800 text-xl"
          title="Manage Categories"
        >
          ⚙️
        </button>
      </div>
    </header>
    
    <div class="p-4 space-y-6">
      <!-- Balance Card -->
      <div class="bg-gradient-to-br from-sage-500 to-sage-600 rounded-2xl shadow-lg p-6 text-white">
        <p class="text-sage-100 text-sm font-medium mb-1">Current Balance</p>
        <p class="text-4xl font-bold" class:text-red-200={balance < 0}>
          {formatCurrency(balance)}
        </p>
        <div class="mt-4 flex gap-4 text-sm">
          <div class="bg-white/20 rounded-lg px-3 py-2">
            <span class="text-sage-100">{transactions.length} transactions</span>
          </div>
        </div>
      </div>
      
      <!-- Quick Add Button -->
      <button
        on:click={() => showAddTransaction = true}
        class="w-full bg-sage-600 text-white font-semibold py-5 rounded-2xl hover:bg-sage-700 shadow-md text-lg"
      >
        + Add Transaction
      </button>
      
      <!-- Reserve Widget -->
      <ReserveWidget 
        {transactions} 
        currentBalance={balance} 
        {settings} 
      />
      
      <!-- Category Breakdown -->
      {#if Object.keys(categoryBreakdown).length > 0}
        <div class="bg-white rounded-2xl shadow-md p-5">
          <h2 class="text-lg font-semibold text-warm-800 mb-4">Category Breakdown</h2>
          
          <div class="space-y-3">
            {#each Object.entries(categoryBreakdown).sort((a: any, b: any) => b[1].amount - a[1].amount) as [category, data]}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="w-3 h-3 rounded-full"
                    class:bg-sage-500={(data as any).type === 'income'}
                    class:bg-red-400={(data as any).type === 'expense'}
                  ></div>
                  <span class="text-warm-800">{category}</span>
                  <span class="text-warm-500 text-sm">({(data as any).count})</span>
                </div>
                <span class="font-medium" class:text-sage-600={(data as any).type === 'income'} class:text-red-500={(data as any).type === 'expense'}>
                  {(data as any).type === 'income' ? '+' : '-'}{formatCurrency((data as any).amount)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Recent Transactions -->
      <div class="bg-white rounded-2xl shadow-md overflow-hidden">
        <div class="p-5 border-b border-warm-200">
          <h2 class="text-lg font-semibold text-warm-800">Recent Transactions</h2>
        </div>
        
        {#if recentTransactions.length === 0}
          <div class="p-8 text-center">
            <p class="text-warm-500">No transactions yet</p>
            <p class="text-warm-400 text-sm mt-1">Add your first transaction above</p>
          </div>
        {:else}
          <div class="divide-y divide-warm-100">
            {#each recentTransactions as transaction}
              <div class="p-4 flex items-center justify-between hover:bg-warm-50">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-xs font-medium px-2 py-1 rounded-full"
                      class:bg-sage-100={transaction.type === 'income'}
                      class:text-sage-700={transaction.type === 'income'}
                      class:bg-red-100={transaction.type === 'expense'}
                      class:text-red-700={transaction.type === 'expense'}
                    >
                      {transaction.category}
                    </span>
                    <span class="text-warm-400 text-sm">{formatDate(transaction.date)}</span>
                  </div>
                  {#if transaction.note}
                    <p class="text-warm-600 text-sm mt-1 truncate">{transaction.note}</p>
                  {/if}
                </div>
                
                <div class="flex items-center gap-3 ml-4">
                  <span
                    class="font-semibold text-lg"
                    class:text-sage-600={transaction.type === 'income'}
                    class:text-red-500={transaction.type === 'expense'}
                  >
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                  <button
                    on:click={() => handleDeleteTransaction(transaction.id)}
                    class="text-warm-400 hover:text-red-500 p-2"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Add Transaction Modal -->
    {#if showAddTransaction}
      <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
        <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-warm-800">Add Transaction</h2>
            <button
              on:click={() => showAddTransaction = false}
              class="text-warm-500 hover:text-warm-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div class="space-y-5">
            <!-- Type Toggle -->
            <div class="grid grid-cols-2 gap-2 p-1 bg-warm-100 rounded-xl">
              <button
                on:click={() => newType = 'income'}
                class="py-3 rounded-lg font-semibold transition-colors"
                class:bg-sage-600={newType === 'income'}
                class:text-white={newType === 'income'}
                class:text-warm-700={newType !== 'income'}
              >
                Income
              </button>
              <button
                on:click={() => newType = 'expense'}
                class="py-3 rounded-lg font-semibold transition-colors"
                class:bg-red-500={newType === 'expense'}
                class:text-white={newType === 'expense'}
                class:text-warm-700={newType !== 'expense'}
              >
                Expense
              </button>
            </div>
            
            <!-- Amount -->
            <div>
              <label for="amount" class="block text-sm font-medium text-warm-700 mb-2">Amount *</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-warm-500 text-lg">$</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  bind:value={newAmount}
                  placeholder="0.00"
                  class="w-full pl-10 pr-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none text-lg"
                />
              </div>
            </div>
            
            <!-- Category -->
            <div>
              <label for="category" class="block text-sm font-medium text-warm-700 mb-2">Category *</label>
              <select
                id="category"
                bind:value={newCategory}
                class="w-full px-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none text-lg bg-white"
              >
                <option value="">Select category...</option>
                {#if newType === 'income'}
                  {#each incomeCategories as cat}
                    <option value={cat}>{cat}</option>
                  {/each}
                {:else}
                  {#each expenseCategories as cat}
                    <option value={cat}>{cat}</option>
                  {/each}
                {/if}
              </select>
            </div>
            
            <!-- Date -->
            <div>
              <label for="date" class="block text-sm font-medium text-warm-700 mb-2">Date</label>
              <input
                id="date"
                type="date"
                bind:value={newDate}
                class="w-full px-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none text-lg"
              />
            </div>
            
            <!-- Note -->
            <div>
              <label for="note" class="block text-sm font-medium text-warm-700 mb-2">Note</label>
              <input
                id="note"
                type="text"
                bind:value={newNote}
                placeholder="Optional description..."
                class="w-full px-4 py-4 rounded-xl border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none text-lg"
              />
            </div>
            
            <button
              on:click={handleAddTransaction}
              disabled={!newAmount || !newCategory}
              class="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-lg"
            >
              Save Transaction
            </button>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Manage Categories Modal -->
    {#if showManageCategories}
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-warm-800">Manage Categories</h2>
            <button
              on:click={() => showManageCategories = false}
              class="text-warm-500 hover:text-warm-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          <!-- Add New Category -->
          <div class="bg-warm-50 rounded-xl p-4 mb-6">
            <h3 class="font-medium text-warm-800 mb-3">Add Custom Category</h3>
            
            <div class="flex gap-2 mb-3">
              <button
                on:click={() => categoryType = 'income'}
                class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                class:bg-sage-600={categoryType === 'income'}
                class:text-white={categoryType === 'income'}
                class:bg-warm-200={categoryType !== 'income'}
                class:text-warm-700={categoryType !== 'income'}
              >
                Income
              </button>
              <button
                on:click={() => categoryType = 'expense'}
                class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                class:bg-red-500={categoryType === 'expense'}
                class:text-white={categoryType === 'expense'}
                class:bg-warm-200={categoryType !== 'expense'}
                class:text-warm-700={categoryType !== 'expense'}
              >
                Expense
              </button>
            </div>
            
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={newCategoryName}
                placeholder="Category name..."
                class="flex-1 px-3 py-2 rounded-lg border border-warm-300 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none"
              />
              <button
                on:click={handleAddCategory}
                disabled={!newCategoryName.trim()}
                class="bg-sage-600 text-white px-4 py-2 rounded-lg hover:bg-sage-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
          
          <!-- Custom Categories List -->
          {#if treasury?.categories?.length}
            <div>
              <h3 class="font-medium text-warm-800 mb-3">Your Custom Categories</h3>
              
              <div class="space-y-2">
                {#each treasury.categories as category}
                  <div class="flex items-center justify-between bg-warm-50 rounded-lg px-3 py-2">
                    <span class="text-warm-800">{category}</span>
                    <button
                      on:click={() => handleRemoveCategory(category)}
                      class="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <p class="text-warm-500 text-center py-4">No custom categories yet</p>
          {/if}
          
          <!-- Default Categories -->
          <div class="mt-6 pt-6 border-t border-warm-200">
            <h3 class="font-medium text-warm-800 mb-3">Default Categories</h3>
            
            <div class="space-y-1">
              <p class="text-sm text-warm-500 mb-2">Income:</p>
              <div class="flex flex-wrap gap-2">
                {#each DEFAULT_CATEGORIES.income as cat}
                  <span class="bg-sage-100 text-sage-700 text-sm px-2 py-1 rounded">{cat}</span>
                {/each}
              </div>
              
              <p class="text-sm text-warm-500 mb-2 mt-3">Expense:</p>
              <div class="flex flex-wrap gap-2">
                {#each DEFAULT_CATEGORIES.expense as cat}
                  <span class="bg-red-100 text-red-700 text-sm px-2 py-1 rounded">{cat}</span>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
