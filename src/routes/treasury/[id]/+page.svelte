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
  
  $: treasuryId = $page.params.id as string;
  
  let treasury: Treasury | null = null;
  let transactions: Transaction[] = [];
  let loadingData = true;

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

  $: totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  $: totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

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
    try {
      const treasuries = await getUserTreasuries($user.uid);
      treasury = treasuries.find((t: Treasury) => t.id === treasuryId) || null;
      if (treasury) {
        transactions = await getTreasuryTransactions(treasuryId);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      loadingData = false;
    }
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }

  function exportCSV() {
    if (!treasury) return;

    // Escape a value for safe CSV embedding
    const esc = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // Metadata header block
    const meta = [
      ['Treasury', treasury.name],
      ['Description', treasury.description || ''],
      ['Exported', exportDate],
      ['Total Transactions', String(transactions.length)],
      [], // blank separator row
    ];

    // Column headers
    const columns = ['Date', 'Type', 'Category', 'Amount (USD)', 'Note'];

    // One row per transaction, already sorted date-desc from Firestore
    const rows = transactions.map(t => [
      formatDate(t.date),
      t.type === 'income' ? 'Income' : 'Expense',
      t.category,
      t.amount.toFixed(2),
      t.note || '',
    ]);

    // Summary block
    const summary = [
      [], // blank separator row
      ['SUMMARY'],
      ['Total Balance',  '', '', balance.toFixed(2),      ''],
      ['Total Income',   '', '', totalIncome.toFixed(2),  ''],
      ['Total Expense',  '', '', totalExpense.toFixed(2), ''],
    ];

    const csv = [...meta, columns, ...rows, ...summary]
      .map(row => row.map(cell => esc(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${treasury.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<!-- ══════════════════════════════════════════════════════ -->
<!--  Loading                                               -->
<!-- ══════════════════════════════════════════════════════ -->
{#if $loading || loadingData}
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAFAF0;">
    <div class="nb-spinner"></div>
  </div>

<!-- ══════════════════════════════════════════════════════ -->
<!--  Not found                                             -->
<!-- ══════════════════════════════════════════════════════ -->
{:else if !treasury}
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAFAF0; padding: 20px;">
    <div class="nb-card" style="padding: 40px 32px; text-align: center;">
      <p style="font-weight: 900; font-size: 1.1rem; text-transform: uppercase; margin-bottom: 20px;">
        Treasury not found
      </p>
      <a href="/" class="nb-btn nb-btn-black" style="width: auto; padding: 12px 24px;">← Back</a>
    </div>
  </div>

<!-- ══════════════════════════════════════════════════════ -->
<!--  Main view                                             -->
<!-- ══════════════════════════════════════════════════════ -->
{:else}
  <div style="min-height: 100vh; background: #FAFAF0; padding-bottom: 80px;">

    <!-- ── Sticky header ──────────────────────────────── -->
    <header style="position: sticky; top: 5px; z-index: 40; background: #0A0A0A;
                   border-bottom: 3px solid #0A0A0A;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; gap: 12px;">
        <a
          href="/"
          style="color: #FFE500; font-weight: 900; font-size: 1.3rem; text-decoration: none;
                 min-width: 44px; min-height: 44px; display: flex; align-items: center;"
        >←</a>
        <h1 style="color: #FAFAF0; font-size: 1rem; font-weight: 900; text-transform: uppercase;
                   letter-spacing: 0.04em; flex: 1; text-align: center; overflow: hidden;
                   text-overflow: ellipsis; white-space: nowrap; margin: 0;">
          {treasury.name}
        </h1>
        <button
          on:click={() => showManageCategories = true}
          style="color: #FFE500; background: none; border: none; cursor: pointer; font-size: 1.2rem;
                 min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;"
          title="Manage Categories"
        >⚙</button>
      </div>
    </header>

    <div style="max-width: 600px; margin: 0 auto; padding: 20px 20px 0;">

      <!-- ── Balance card ────────────────────────────── -->
      <div class="nb-card-yellow" style="padding: 28px 24px; margin-bottom: 14px;">
        <p style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; margin-bottom: 6px;">
          Current Balance
        </p>
        <p style="font-size: 3rem; font-weight: 900; letter-spacing: -0.02em; line-height: 1;
                  color: {balance < 0 ? '#FF1744' : '#0A0A0A'};">
          {formatCurrency(balance)}
        </p>
        <p style="font-size: 0.75rem; font-weight: 700; color: #444; margin-top: 10px;">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <!-- ── Income / Expense summary ────────────────── -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
        <div class="nb-card" style="padding: 16px 18px;">
          <p style="font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px;">
            Total In
          </p>
          <p style="font-size: 1.35rem; font-weight: 900; color: #00C853;">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div class="nb-card" style="padding: 16px 18px;">
          <p style="font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px;">
            Total Out
          </p>
          <p style="font-size: 1.35rem; font-weight: 900; color: #FF1744;">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      <!-- ── Action buttons ─────────────────────────── -->
      <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-bottom: 24px;">
        <button
          on:click={() => showAddTransaction = true}
          class="nb-btn nb-btn-black"
          style="font-size: 1rem; padding: 18px 24px;"
        >
          + Add Transaction
        </button>
        <button
          on:click={exportCSV}
          disabled={transactions.length === 0}
          class="nb-btn nb-btn-white"
          style="font-size: 0.8rem; padding: 18px 18px; white-space: nowrap;"
          title={transactions.length === 0 ? 'No transactions to export' : 'Download all transactions as CSV'}
        >
          Export CSV ↓
        </button>
      </div>

      <!-- ── Reserve Widget ─────────────────────────── -->
      {#if treasury}
        <ReserveWidget 
          {treasury} 
          currentBalance={balance}
        />
      {/if}

      <!-- ── Category Breakdown ──────────────────────── -->
      {#if Object.keys(categoryBreakdown).length > 0}
        <div class="nb-card" style="margin-bottom: 20px; overflow: hidden;">
          <div class="nb-strip">Category Breakdown</div>
          <div style="padding: 16px 20px; display: flex; flex-direction: column; gap: 12px;">
            {#each Object.entries(categoryBreakdown).sort((a: any, b: any) => b[1].amount - a[1].amount) as [category, data]}
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                  <span
                    class="nb-badge"
                    class:nb-badge-green={(data as any).type === 'income'}
                    class:nb-badge-red={(data as any).type === 'expense'}
                  >
                    {(data as any).type === 'income' ? 'IN' : 'OUT'}
                  </span>
                  <span style="font-weight: 700; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {category}
                  </span>
                  <span style="color: #777; font-size: 0.8rem; font-weight: 600; flex-shrink: 0;">
                    ×{(data as any).count}
                  </span>
                </div>
                <span style="font-weight: 900; font-size: 0.95rem; flex-shrink: 0; margin-left: 12px;
                              color: {(data as any).type === 'income' ? '#00C853' : '#FF1744'};">
                  {(data as any).type === 'income' ? '+' : '-'}{formatCurrency((data as any).amount)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- ── Transactions ────────────────────────────── -->
      <div class="nb-card" style="overflow: hidden;">
        <div class="nb-strip">Recent Transactions</div>

        {#if recentTransactions.length === 0}
          <div style="padding: 40px 20px; text-align: center;">
            <p style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
              No transactions yet
            </p>
            <p style="color: #aaa; font-size: 0.85rem; margin-top: 4px; font-weight: 600;">
              Add your first transaction above
            </p>
          </div>
        {:else}
          {#each recentTransactions as transaction, i}
            <div
              style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
                     border-top: {i === 0 ? 'none' : '2px solid #0A0A0A'};
                     border-left: 5px solid {transaction.type === 'income' ? '#00C853' : '#FF1744'};"
            >
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span
                    class="nb-badge"
                    class:nb-badge-green={transaction.type === 'income'}
                    class:nb-badge-red={transaction.type === 'expense'}
                  >
                    {transaction.category}
                  </span>
                  <span style="color: #777; font-size: 0.78rem; font-weight: 600;">
                    {formatDate(transaction.date)}
                  </span>
                </div>
                {#if transaction.note}
                  <p style="color: #555; font-size: 0.83rem; font-weight: 600; margin-top: 4px;
                             overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {transaction.note}
                  </p>
                {/if}
              </div>

              <div style="display: flex; align-items: center; gap: 10px; margin-left: 12px; flex-shrink: 0;">
                <span style="font-weight: 900; font-size: 1.05rem;
                              color: {transaction.type === 'income' ? '#00C853' : '#FF1744'};">
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
                <button
                  on:click={() => handleDeleteTransaction(transaction.id)}
                  style="background: none; border: 2px solid transparent; cursor: pointer;
                         color: #bbb; font-size: 1rem; padding: 4px 6px; min-height: 36px;
                         transition: color 0.1s ease, border-color 0.1s ease;"
                  on:mouseenter={(e) => { e.currentTarget.style.color = '#FF1744'; e.currentTarget.style.borderColor = '#FF1744'; }}
                  on:mouseleave={(e) => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.borderColor = 'transparent'; }}
                  title="Delete"
                >🗑</button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

    </div>


    <!-- ══════════════════════════════════════════════ -->
    <!--  Add Transaction Modal                         -->
    <!-- ══════════════════════════════════════════════ -->
    {#if showAddTransaction}
      <div style="position: fixed; inset: 0; background: rgba(10,10,10,0.75); display: flex;
                  align-items: flex-end; justify-content: center; z-index: 50;">
        <div
          class="nb-card"
          style="width: 100%; max-width: 600px; max-height: 92vh; overflow-y: auto;
                 box-shadow: 0 -6px 0 #0A0A0A; border-bottom: none;"
        >
          <!-- Modal header strip -->
          <div class="nb-strip" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;">
            <span>Add Transaction</span>
            <button
              on:click={() => showAddTransaction = false}
              style="background: none; border: none; color: #FFE500; font-size: 1.4rem;
                     font-weight: 900; cursor: pointer; line-height: 1; min-height: 36px; padding: 0 4px;"
            >×</button>
          </div>

          <div style="padding: 24px 20px; display: flex; flex-direction: column; gap: 18px;">

            <!-- Type toggle -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 3px solid #0A0A0A;">
              <button
                on:click={() => { newType = 'income'; newCategory = ''; }}
                style="padding: 14px; font-weight: 900; font-size: 0.85rem; text-transform: uppercase;
                       letter-spacing: 0.07em; cursor: pointer; transition: background 0.1s ease;
                       background: {newType === 'income' ? '#00C853' : '#FFFFFF'};
                       color: #0A0A0A; border: none; border-right: 2px solid #0A0A0A; min-height: 52px;"
              >
                ▲ Income
              </button>
              <button
                on:click={() => { newType = 'expense'; newCategory = ''; }}
                style="padding: 14px; font-weight: 900; font-size: 0.85rem; text-transform: uppercase;
                       letter-spacing: 0.07em; cursor: pointer; transition: background 0.1s ease;
                       background: {newType === 'expense' ? '#FF1744' : '#FFFFFF'};
                       color: {newType === 'expense' ? '#fff' : '#0A0A0A'}; border: none; min-height: 52px;"
              >
                ▼ Expense
              </button>
            </div>

            <!-- Amount -->
            <div>
              <label for="amount" class="nb-label">Amount *</label>
              <div style="position: relative;">
                <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
                              font-weight: 900; font-size: 1.1rem; color: #0A0A0A; pointer-events: none;">$</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  bind:value={newAmount}
                  placeholder="0.00"
                  class="nb-input"
                  style="padding-left: 34px; font-size: 1.1rem;"
                />
              </div>
            </div>

            <!-- Category -->
            <div>
              <label for="category" class="nb-label">Category *</label>
              <select id="category" bind:value={newCategory} class="nb-select">
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
              <label for="date" class="nb-label">Date</label>
              <input id="date" type="date" bind:value={newDate} class="nb-input" />
            </div>

            <!-- Note -->
            <div>
              <label for="note" class="nb-label">Note (optional)</label>
              <input
                id="note"
                type="text"
                bind:value={newNote}
                placeholder="Description..."
                class="nb-input"
              />
            </div>

            <button
              on:click={handleAddTransaction}
              disabled={!newAmount || !newCategory}
              class="nb-btn"
              style="background: {newType === 'income' ? '#00C853' : '#FF1744'};
                     color: {newType === 'income' ? '#0A0A0A' : '#fff'};
                     font-size: 1rem;"
            >
              Save Transaction ✓
            </button>

          </div>
        </div>
      </div>
    {/if}


    <!-- ══════════════════════════════════════════════ -->
    <!--  Manage Categories Modal                        -->
    <!-- ══════════════════════════════════════════════ -->
    {#if showManageCategories}
      <div style="position: fixed; inset: 0; background: rgba(10,10,10,0.75); display: flex;
                  align-items: center; justify-content: center; padding: 20px; z-index: 50;">
        <div class="nb-card" style="width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto;">

          <div class="nb-strip" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;">
            <span>Manage Categories</span>
            <button
              on:click={() => showManageCategories = false}
              style="background: none; border: none; color: #FFE500; font-size: 1.4rem;
                     font-weight: 900; cursor: pointer; line-height: 1; min-height: 36px; padding: 0 4px;"
            >×</button>
          </div>

          <div style="padding: 24px 20px; display: flex; flex-direction: column; gap: 24px;">

            <!-- Add new category -->
            <div>
              <p class="nb-label" style="font-size: 0.75rem; margin-bottom: 12px;">Add Custom Category</p>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;
                           border: 3px solid #0A0A0A; margin-bottom: 12px;">
                <button
                  on:click={() => categoryType = 'income'}
                  style="padding: 10px; font-weight: 900; font-size: 0.78rem; text-transform: uppercase;
                         letter-spacing: 0.06em; cursor: pointer; border: none; border-right: 2px solid #0A0A0A;
                         background: {categoryType === 'income' ? '#00C853' : '#fff'};
                         color: #0A0A0A; min-height: 44px;"
                >Income</button>
                <button
                  on:click={() => categoryType = 'expense'}
                  style="padding: 10px; font-weight: 900; font-size: 0.78rem; text-transform: uppercase;
                         letter-spacing: 0.06em; cursor: pointer; border: none;
                         background: {categoryType === 'expense' ? '#FF1744' : '#fff'};
                         color: {categoryType === 'expense' ? '#fff' : '#0A0A0A'}; min-height: 44px;"
                >Expense</button>
              </div>

              <div style="display: flex; gap: 10px;">
                <input
                  type="text"
                  bind:value={newCategoryName}
                  placeholder="Category name..."
                  class="nb-input"
                  style="flex: 1;"
                />
                <button
                  on:click={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  class="nb-btn nb-btn-black nb-btn-sm"
                  style="width: auto; flex-shrink: 0; padding: 0 20px;"
                >Add</button>
              </div>
            </div>

            <!-- Custom categories -->
            {#if treasury?.categories?.length}
              <div>
                <p class="nb-label" style="font-size: 0.75rem; margin-bottom: 10px;">Your Custom Categories</p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  {#each treasury.categories as category}
                    <div style="display: flex; align-items: center; justify-content: space-between;
                                 border: 2px solid #0A0A0A; padding: 10px 14px;">
                      <span style="font-weight: 700; font-size: 0.9rem;">{category}</span>
                      <button
                        on:click={() => handleRemoveCategory(category)}
                        style="background: none; border: none; cursor: pointer; color: #FF1744;
                               font-weight: 900; font-size: 0.72rem; text-transform: uppercase;
                               letter-spacing: 0.06em; text-decoration: underline; min-height: 36px;"
                      >Remove</button>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <p style="color: #888; font-weight: 600; font-size: 0.85rem; text-align: center;">
                No custom categories yet
              </p>
            {/if}

            <!-- Default categories reference -->
            <div style="border-top: 3px solid #0A0A0A; padding-top: 20px;">
              <p class="nb-label" style="font-size: 0.75rem; margin-bottom: 12px;">Default Categories</p>

              <p style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em;
                         color: #00C853; margin-bottom: 8px;">Income</p>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;">
                {#each DEFAULT_CATEGORIES.income as cat}
                  <span class="nb-badge nb-badge-green">{cat}</span>
                {/each}
              </div>

              <p style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em;
                         color: #FF1744; margin-bottom: 8px;">Expense</p>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                {#each DEFAULT_CATEGORIES.expense as cat}
                  <span class="nb-badge nb-badge-red">{cat}</span>
                {/each}
              </div>
            </div>

          </div>
        </div>
      </div>
    {/if}

  </div>
{/if}
