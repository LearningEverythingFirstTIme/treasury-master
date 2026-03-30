<script lang="ts">
  import { page } from '$app/stores';
  import { user, loading } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import {
    getUserTreasuries,
    subscribeTreasuryTransactions,
    addTransaction,
    deleteTransaction,
    updateTransactionWithReceipt,
    calculateBalance,
    getCategoryBreakdown,
    addCategory,
    removeCategory,
    updatePrudentReserve,
    type Treasury,
    type Transaction
  } from '$lib/treasury';
  import { DEFAULT_CATEGORIES } from '$lib/types';
  import ReserveWidget from '$lib/components/ReserveWidget.svelte';
  import { calculateAutoReserveTarget } from '$lib/settings';
  import { trigger, hapticsSupported } from '$lib/haptics';
  import { browser } from '$app/environment';
  
  let hapticsReady = false;
  
  $: if (browser) hapticsReady = hapticsSupported();
  
  function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') {
    if (hapticsReady) trigger(type);
  }
  
  $: treasuryId = $page.params.id as string;
  
  let treasury: Treasury | null = null;
  let transactions: Transaction[] = [];
  let loadingData = true;

  let showAddTransaction = false;
  let showManageCategories = false;
  let showEditReserve = false;
  let showEditTransaction = false;
  let editingTransaction: Transaction | null = null;

  let editAmount = '';
  let editType: 'income' | 'expense' = 'income';
  let editCategory = '';
  let editNote = '';
  let editDate = new Date().toISOString().split('T')[0];
  let editReceiptFile: File | null = null;
  let editReceiptPreview: string | null = null;
  let editReceiptAction: 'keep' | 'replace' | 'remove' = 'keep';

  let unsubscribeTransactions: (() => void) | null = null;
  let listenerError = '';

  let newAmount = '';
  let newType: 'income' | 'expense' = 'income';
  let newCategory = '';
  let newNote = '';
  let newDate = new Date().toISOString().split('T')[0];
  let newReceiptFile: File | null = null;
  let newReceiptPreview: string | null = null;

  let submitting = false;
  
  let lightboxImageUrl: string | null = null;

  let newCategoryName = '';
  let categoryType: 'income' | 'expense' = 'income';
  
  let newReserveAmount = '';
  let reserveMode: 'auto' | 'manual' = 'manual';
  let reserveMonths = 3;

  $: autoReserveCalc = calculateAutoReserveTarget(transactions, reserveMonths);

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
        // Cancel any previous listener before starting a new one
        if (unsubscribeTransactions) unsubscribeTransactions();
        unsubscribeTransactions = subscribeTreasuryTransactions(
          $user.uid,
          treasuryId,
          (txns) => {
            transactions = txns;
            listenerError = '';
            loadingData = false;
          },
          (err) => {
            console.error('Transaction listener error:', err);
            listenerError = 'Could not load transactions. Check your connection and try again.';
            loadingData = false;
          }
        );
      } else {
        loadingData = false;
      }
    } catch (err) {
      console.error('Error loading data:', err);
      loadingData = false;
    }
  }

  // Reload only the treasury document (for category updates) without re-subscribing
  async function reloadTreasury() {
    if (!$user) return;
    try {
      const treasuries = await getUserTreasuries($user.uid);
      treasury = treasuries.find((t: Treasury) => t.id === treasuryId) || null;
    } catch (err) {
      console.error('Error reloading treasury:', err);
    }
  }

  async function handleAddTransaction() {
    if (!$user || !newAmount || !newCategory || submitting) return;
    submitting = true;
    try {
      await addTransaction($user.uid, treasuryId, {
        amount: parseFloat(newAmount),
        type: newType,
        category: newCategory,
        note: newNote,
        date: new Date(newDate + 'T00:00:00')
      }, newReceiptFile);
      // No manual reload needed — the onSnapshot listener updates transactions automatically
      newAmount = '';
      newNote = '';
      newDate = new Date().toISOString().split('T')[0];
      newReceiptFile = null;
      newReceiptPreview = null;
      showAddTransaction = false;
    } finally {
      submitting = false;
    }
  }

  async function handleDeleteTransaction(id: string, receiptPath?: string | null) {
    if (confirm('Delete this transaction?')) {
      await deleteTransaction(id, receiptPath);
      haptic('warning');
      // No manual reload needed — the onSnapshot listener updates automatically
    }
  }

  function handleReceiptFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        alert('Only JPEG and PNG images are allowed');
        input.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        input.value = '';
        return;
      }
      newReceiptFile = file;
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        newReceiptPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  function clearReceiptFile() {
    newReceiptFile = null;
    newReceiptPreview = null;
  }

  function openEditModal(transaction: Transaction) {
    editingTransaction = transaction;
    editAmount = String(transaction.amount);
    editType = transaction.type;
    editCategory = transaction.category;
    editNote = transaction.note || '';
    editDate = transaction.date.toISOString().split('T')[0];
    editReceiptFile = null;
    editReceiptPreview = transaction.receiptUrl || null;
    editReceiptAction = 'keep';
    showEditTransaction = true;
    haptic('light');
  }

  function handleEditReceiptFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        alert('Only JPEG and PNG images are allowed');
        input.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        input.value = '';
        return;
      }
      editReceiptFile = file;
      editReceiptAction = 'replace';
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        editReceiptPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  function clearEditReceiptFile() {
    editReceiptFile = null;
    if (editingTransaction?.receiptUrl) {
      editReceiptPreview = editingTransaction.receiptUrl;
      editReceiptAction = 'keep';
    } else {
      editReceiptPreview = null;
      editReceiptAction = 'keep';
    }
  }

  function removeEditReceipt() {
    editReceiptFile = null;
    editReceiptPreview = null;
    editReceiptAction = 'remove';
  }

  async function handleEditTransaction() {
    if (!$user || !editingTransaction || !editAmount || !editCategory || submitting) return;
    submitting = true;
    try {
      await updateTransactionWithReceipt(
        $user.uid,
        editingTransaction.id,
        editingTransaction.receiptPath,
        {
          amount: parseFloat(editAmount),
          type: editType,
          category: editCategory,
          note: editNote,
          date: new Date(editDate + 'T00:00:00')
        },
        editReceiptAction === 'replace' ? editReceiptFile : null,
        editReceiptAction === 'remove'
      );
      // No manual reload needed — the onSnapshot listener updates transactions automatically
      showEditTransaction = false;
      editingTransaction = null;
    } finally {
      submitting = false;
    }
  }

  function openLightbox(url: string) {
    lightboxImageUrl = url;
  }

  function closeLightbox() {
    lightboxImageUrl = null;
  }

  function downloadReceipt(url: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'receipt.jpg';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim() || !treasury) return;
    await addCategory(treasury.id, newCategoryName.trim());
    await reloadTreasury();
    newCategoryName = '';
    haptic('success');
  }

  async function handleRemoveCategory(category: string) {
    if (!treasury) return;
    await removeCategory(treasury.id, category);
    await reloadTreasury();
    haptic('warning');
  }

  async function handleUpdateReserve() {
    if (!treasury) return;
    let amount: number;
    if (reserveMode === 'auto') {
      if (!autoReserveCalc.hasEnoughData) return;
      amount = autoReserveCalc.target;
    } else {
      if (!newReserveAmount) return;
      amount = parseFloat(newReserveAmount);
    }
    await updatePrudentReserve(treasury.id, amount, reserveMode, reserveMonths);
    await reloadTreasury();
    newReserveAmount = '';
    showEditReserve = false;
    haptic('success');
  }

  onDestroy(() => {
    if (unsubscribeTransactions) unsubscribeTransactions();
  });

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
          on:click={() => { showManageCategories = true; haptic('light'); }}
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
          on:click={() => { showAddTransaction = true; haptic('light'); }}
          class="nb-btn nb-btn-black"
          style="font-size: 1rem; padding: 18px 24px;"
        >
          + Add Transaction
        </button>
        <button
          on:click={() => { exportCSV(); haptic('light'); }}
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
          onEdit={() => {
            haptic('light');
            reserveMode = treasury?.prudentReserveMode ?? 'manual';
            reserveMonths = treasury?.prudentReserveMonths ?? 3;
            newReserveAmount = treasury?.prudentReserve ? String(treasury.prudentReserve) : '';
            showEditReserve = true;
          }}
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

      <!-- ── Listener error banner ──────────────────── -->
      {#if listenerError}
        <div style="background: #FF1744; border: 3px solid #0A0A0A; box-shadow: 4px 4px 0 #0A0A0A;
                    padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <p style="color: #fff; font-weight: 700; font-size: 0.9rem;">{listenerError}</p>
          <button
            on:click={() => { loadData(); haptic('light'); }}
            style="background: #fff; border: 2px solid #fff; color: #FF1744; font-weight: 900;
                   font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
                   cursor: pointer; padding: 6px 12px; min-height: 36px; flex-shrink: 0;"
          >Retry</button>
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
                {#if transaction.receiptUrl}
                  <button
                    on:click={() => { haptic('light'); openLightbox(transaction.receiptUrl!); }}
                    style="background: #FFE500; border: 2px solid #0A0A0A; cursor: pointer;
                           color: #0A0A0A; font-size: 1rem; padding: 4px 8px; min-height: 36px;
                           display: flex; align-items: center; justify-content: center;"
                    title="View receipt"
                  >📎</button>
                {/if}
                <span style="font-weight: 900; font-size: 1.05rem;
                              color: {transaction.type === 'income' ? '#00C853' : '#FF1744'};">
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
                <button
                  on:click={() => { haptic('light'); openEditModal(transaction); }}
                  style="background: none; border: 2px solid transparent; cursor: pointer;
                         color: #bbb; font-size: 1rem; padding: 4px 6px; min-height: 36px;
                         transition: color 0.1s ease, border-color 0.1s ease;"
                  on:mouseenter={(e) => { e.currentTarget.style.color = '#0A0A0A'; e.currentTarget.style.borderColor = '#0A0A0A'; }}
                  on:mouseleave={(e) => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.borderColor = 'transparent'; }}
                  title="Edit"
                >✏</button>
                <button
                  on:click={() => { haptic('light'); handleDeleteTransaction(transaction.id, transaction.receiptPath); }}
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
              on:click={() => { showAddTransaction = false; newReceiptFile = null; newReceiptPreview = null; haptic('light'); }}
              style="background: none; border: none; color: #FFE500; font-size: 1.4rem;
                     font-weight: 900; cursor: pointer; line-height: 1; min-height: 36px; padding: 0 4px;"
            >×</button>
          </div>

          <div style="padding: 24px 20px; display: flex; flex-direction: column; gap: 18px;">

            <!-- Type toggle -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 3px solid #0A0A0A;">
              <button
                on:click={() => { newType = 'income'; newCategory = ''; haptic('light'); }}
                style="padding: 14px; font-weight: 900; font-size: 0.85rem; text-transform: uppercase;
                       letter-spacing: 0.07em; cursor: pointer; transition: background 0.1s ease;
                       background: {newType === 'income' ? '#00C853' : '#FFFFFF'};
                       color: #0A0A0A; border: none; border-right: 2px solid #0A0A0A; min-height: 52px;"
              >
                ▲ Income
              </button>
              <button
                on:click={() => { newType = 'expense'; newCategory = ''; haptic('light'); }}
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

            <!-- Receipt Photo -->
            <div>
              <label for="receipt" class="nb-label">Receipt Photo (optional)</label>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                {#if newReceiptFile}
                  <div class="nb-input" style="display: flex; align-items: center; gap: 8px; color: #00C853; min-height: 52px;">
                    <span style="font-size: 1.2rem;">✅</span>
                    <span>{newReceiptFile.name}</span>
                  </div>
                {:else}
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <label 
                      for="receipt-camera"
                      class="nb-input"
                      style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; color: #666; min-height: 52px;"
                    >
                      <span style="font-size: 1.2rem;">📷</span>
                      <span>Take Photo</span>
                    </label>
                    <label 
                      for="receipt-file"
                      class="nb-input"
                      style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; color: #666; min-height: 52px;"
                    >
                      <span style="font-size: 1.2rem;">🗂️</span>
                      <span>Choose File</span>
                    </label>
                  </div>
                {/if}
                <input
                  id="receipt-camera"
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  on:change={handleReceiptFileSelect}
                  style="display: none;"
                />
                <input
                  id="receipt-file"
                  type="file"
                  accept="image/jpeg,image/png"
                  on:change={handleReceiptFileSelect}
                  style="display: none;"
                />
                {#if newReceiptPreview}
                  <div style="position: relative; border: 3px solid #0A0A0A; padding: 8px; background: #F5F5F0;">
                    <img 
                      src={newReceiptPreview} 
                      alt="Receipt preview"
                      style="max-width: 100%; max-height: 150px; display: block; margin: 0 auto;"
                    />
                    <button
                      type="button"
                      on:click={clearReceiptFile}
                      style="position: absolute; top: -10px; right: -10px; background: #FF1744; color: #fff;
                             border: 2px solid #0A0A0A; width: 28px; height: 28px; font-weight: 900;
                             cursor: pointer; display: flex; align-items: center; justify-content: center;
                             font-size: 1rem; line-height: 1;"
                    >×</button>
                  </div>
                {/if}
              </div>
            </div>

            <button
              on:click={() => { handleAddTransaction(); haptic('success'); }}
              disabled={!newAmount || !newCategory || submitting}
              class="nb-btn"
              style="background: {newType === 'income' ? '#00C853' : '#FF1744'};
                     color: {newType === 'income' ? '#0A0A0A' : '#fff'};
                     font-size: 1rem; {submitting ? 'opacity: 0.6;' : ''}"
            >
              {submitting ? 'Saving...' : 'Save Transaction ✓'}
            </button>

          </div>
        </div>
      </div>
    {/if}


    <!-- ══════════════════════════════════════════════ -->
    <!--  Edit Transaction Modal                        -->
    <!-- ══════════════════════════════════════════════ -->
    {#if showEditTransaction && editingTransaction}
      <div style="position: fixed; inset: 0; background: rgba(10,10,10,0.75); display: flex;
                  align-items: flex-end; justify-content: center; z-index: 50;">
        <div
          class="nb-card"
          style="width: 100%; max-width: 600px; max-height: 92vh; overflow-y: auto;
                 box-shadow: 0 -6px 0 #0A0A0A; border-bottom: none;"
        >
          <!-- Modal header strip -->
          <div class="nb-strip" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;">
            <span>Edit Transaction</span>
            <button
              on:click={() => { showEditTransaction = false; editingTransaction = null; editReceiptFile = null; editReceiptPreview = null; haptic('light'); }}
              style="background: none; border: none; color: #FFE500; font-size: 1.4rem;
                     font-weight: 900; cursor: pointer; line-height: 1; min-height: 36px; padding: 0 4px;"
            >×</button>
          </div>

          <div style="padding: 24px 20px; display: flex; flex-direction: column; gap: 18px;">

            <!-- Type toggle -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 3px solid #0A0A0A;">
              <button
                on:click={() => { editType = 'income'; editCategory = ''; haptic('light'); }}
                style="padding: 14px; font-weight: 900; font-size: 0.85rem; text-transform: uppercase;
                       letter-spacing: 0.07em; cursor: pointer; transition: background 0.1s ease;
                       background: {editType === 'income' ? '#00C853' : '#FFFFFF'};
                       color: #0A0A0A; border: none; border-right: 2px solid #0A0A0A; min-height: 52px;"
              >
                ▲ Income
              </button>
              <button
                on:click={() => { editType = 'expense'; editCategory = ''; haptic('light'); }}
                style="padding: 14px; font-weight: 900; font-size: 0.85rem; text-transform: uppercase;
                       letter-spacing: 0.07em; cursor: pointer; transition: background 0.1s ease;
                       background: {editType === 'expense' ? '#FF1744' : '#FFFFFF'};
                       color: {editType === 'expense' ? '#fff' : '#0A0A0A'}; border: none; min-height: 52px;"
              >
                ▼ Expense
              </button>
            </div>

            <!-- Amount -->
            <div>
              <label for="edit-amount" class="nb-label">Amount *</label>
              <div style="position: relative;">
                <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
                              font-weight: 900; font-size: 1.1rem; color: #0A0A0A; pointer-events: none;">$</span>
                <input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  bind:value={editAmount}
                  placeholder="0.00"
                  class="nb-input"
                  style="padding-left: 34px; font-size: 1.1rem;"
                />
              </div>
            </div>

            <!-- Category -->
            <div>
              <label for="edit-category" class="nb-label">Category *</label>
              <select id="edit-category" bind:value={editCategory} class="nb-select">
                <option value="">Select category...</option>
                {#if editType === 'income'}
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
              <label for="edit-date" class="nb-label">Date</label>
              <input id="edit-date" type="date" bind:value={editDate} class="nb-input" />
            </div>

            <!-- Note -->
            <div>
              <label for="edit-note" class="nb-label">Note (optional)</label>
              <input
                id="edit-note"
                type="text"
                bind:value={editNote}
                placeholder="Description..."
                class="nb-input"
              />
            </div>

            <!-- Receipt Photo -->
            <div>
              <label class="nb-label">Receipt Photo</label>
              
              {#if editingTransaction.receiptUrl && editReceiptAction === 'keep'}
                <!-- Show existing receipt with options -->
                <div style="border: 3px solid #0A0A0A; padding: 12px; background: #F5F5F0; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <img 
                      src={editingTransaction.receiptUrl} 
                      alt="Current receipt"
                      style="width: 60px; height: 60px; object-fit: cover; border: 2px solid #0A0A0A;"
                    />
                    <span style="font-size: 0.85rem; font-weight: 600; color: #555;">Current receipt</span>
                  </div>
                  <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button
                      type="button"
                      on:click={removeEditReceipt}
                      style="background: #FF1744; color: #fff; border: 2px solid #0A0A0A;
                             padding: 8px 14px; font-weight: 900; font-size: 0.75rem;
                             text-transform: uppercase; cursor: pointer;"
                    >Remove Receipt</button>
                    <label 
                      for="edit-receipt-replace"
                      style="background: #FFE500; color: #0A0A0A; border: 2px solid #0A0A0A;
                             padding: 8px 14px; font-weight: 900; font-size: 0.75rem;
                             text-transform: uppercase; cursor: pointer;"
                    >📷 Replace</label>
                    <input
                      id="edit-receipt-replace"
                      type="file"
                      accept="image/jpeg,image/png"
                      capture="environment"
                      on:change={handleEditReceiptFileSelect}
                      style="display: none;"
                    />
                    <label 
                      for="edit-receipt-replace-file"
                      style="background: #FFF; color: #0A0A0A; border: 2px solid #0A0A0A;
                             padding: 8px 14px; font-weight: 900; font-size: 0.75rem;
                             text-transform: uppercase; cursor: pointer;"
                    >🗂️ From File</label>
                    <input
                      id="edit-receipt-replace-file"
                      type="file"
                      accept="image/jpeg,image/png"
                      on:change={handleEditReceiptFileSelect}
                      style="display: none;"
                    />
                  </div>
                </div>
              {:else if editReceiptAction === 'replace' && editReceiptPreview}
                <!-- Show new receipt preview -->
                <div style="position: relative; border: 3px solid #0A0A0A; padding: 8px; background: #F5F5F0; margin-bottom: 10px;">
                  <div style="font-size: 0.75rem; font-weight: 700; color: #00C853; margin-bottom: 8px; text-transform: uppercase;">
                    New Receipt
                  </div>
                  <img 
                    src={editReceiptPreview} 
                    alt="New receipt preview"
                    style="max-width: 100%; max-height: 150px; display: block; margin: 0 auto;"
                  />
                  <button
                    type="button"
                    on:click={clearEditReceiptFile}
                    style="position: absolute; top: -10px; right: -10px; background: #FF1744; color: #fff;
                           border: 2px solid #0A0A0A; width: 28px; height: 28px; font-weight: 900;
                           cursor: pointer; display: flex; align-items: center; justify-content: center;
                           font-size: 1rem; line-height: 1;"
                  >×</button>
                </div>
              {:else if editReceiptAction === 'remove'}
                <!-- Show "removed" state with option to restore -->
                <div style="border: 3px solid #0A0A0A; padding: 12px; background: #FFF0F0; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: #FF1744;">
                      Receipt will be removed
                    </span>
                    <button
                      type="button"
                      on:click={() => { editReceiptAction = 'keep'; editReceiptPreview = editingTransaction.receiptUrl; }}
                      style="background: #FAFAF0; color: #0A0A0A; border: 2px solid #0A0A0A;
                             padding: 6px 12px; font-weight: 900; font-size: 0.72rem;
                             text-transform: uppercase; cursor: pointer;"
                    >Keep Receipt</button>
                  </div>
                </div>
              {:else}
                <!-- No existing receipt - show upload option -->
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  {#if editReceiptFile}
                    <div class="nb-input" style="display: flex; align-items: center; gap: 8px; color: #00C853; min-height: 52px;">
                      <span style="font-size: 1.2rem;">✅</span>
                      <span>{editReceiptFile.name}</span>
                    </div>
                  {:else}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                      <label 
                        for="edit-receipt-new"
                        class="nb-input"
                        style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; color: #666; min-height: 52px;"
                      >
                        <span style="font-size: 1.2rem;">📷</span>
                        <span>Take Photo</span>
                      </label>
                      <label 
                        for="edit-receipt-new-file"
                        class="nb-input"
                        style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; color: #666; min-height: 52px;"
                      >
                        <span style="font-size: 1.2rem;">🗂️</span>
                        <span>Choose File</span>
                      </label>
                    </div>
                  {/if}
                  <input
                    id="edit-receipt-new"
                    type="file"
                    accept="image/jpeg,image/png"
                    capture="environment"
                    on:change={handleEditReceiptFileSelect}
                    style="display: none;"
                  />
                  <input
                    id="edit-receipt-new-file"
                    type="file"
                    accept="image/jpeg,image/png"
                    on:change={handleEditReceiptFileSelect}
                    style="display: none;"
                  />
                  {#if editReceiptPreview}
                    <div style="position: relative; border: 3px solid #0A0A0A; padding: 8px; background: #F5F5F0;">
                      <img 
                        src={editReceiptPreview} 
                        alt="Receipt preview"
                        style="max-width: 100%; max-height: 150px; display: block; margin: 0 auto;"
                      />
                      <button
                        type="button"
                        on:click={clearEditReceiptFile}
                        style="position: absolute; top: -10px; right: -10px; background: #FF1744; color: #fff;
                               border: 2px solid #0A0A0A; width: 28px; height: 28px; font-weight: 900;
                               cursor: pointer; display: flex; align-items: center; justify-content: center;
                               font-size: 1rem; line-height: 1;"
                      >×</button>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            <button
              on:click={() => { handleEditTransaction(); haptic('success'); }}
              disabled={!editAmount || !editCategory || submitting}
              class="nb-btn"
              style="background: {editType === 'income' ? '#00C853' : '#FF1744'};
                     color: {editType === 'income' ? '#0A0A0A' : '#fff'};
                     font-size: 1rem; {submitting ? 'opacity: 0.6;' : ''}"
            >
              {submitting ? 'Saving...' : 'Save Changes ✓'}
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
              on:click={() => { showManageCategories = false; haptic('light'); }}
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
                  on:click={() => { categoryType = 'income'; haptic('light'); }}
                  style="padding: 10px; font-weight: 900; font-size: 0.78rem; text-transform: uppercase;
                         letter-spacing: 0.06em; cursor: pointer; border: none; border-right: 2px solid #0A0A0A;
                         background: {categoryType === 'income' ? '#00C853' : '#fff'};
                         color: #0A0A0A; min-height: 44px;"
                >Income</button>
                <button
                  on:click={() => { categoryType = 'expense'; haptic('light'); }}
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
                  on:click={() => { handleAddCategory(); haptic('success'); }}
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
                        on:click={() => { haptic('light'); handleRemoveCategory(category); }}
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

    <!-- ── Edit Reserve Modal ─────────────────────────── -->
    {#if showEditReserve}
      <div style="position: fixed; inset: 0; background: rgba(10,10,10,0.7); display: flex;
                  align-items: center; justify-content: center; padding: 20px; z-index: 50;"
           on:click|self={() => showEditReserve = false}>
        <div class="nb-card" style="width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto;">

          <!-- Header strip -->
          <div class="nb-strip" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;">
            <span>Set Prudent Reserve</span>
            <button
              on:click={() => { showEditReserve = false; haptic('light'); }}
              style="background: none; border: none; color: #FFE500; font-size: 1.4rem;
                     font-weight: 900; cursor: pointer; line-height: 1; min-height: 36px; padding: 0 4px;"
            >×</button>
          </div>

          <div style="padding: 24px 20px; display: flex; flex-direction: column; gap: 18px;">

            <!-- Mode toggle -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 3px solid #0A0A0A;">
              <button
                on:click={() => { reserveMode = 'auto'; haptic('light'); }}
                style="padding: 13px; font-weight: 900; font-size: 0.8rem; text-transform: uppercase;
                       letter-spacing: 0.06em; cursor: pointer; border: none; border-right: 2px solid #0A0A0A;
                       background: {reserveMode === 'auto' ? '#FFE500' : '#FFFFFF'};
                       color: #0A0A0A; min-height: 50px;"
              >⚡ Auto-Calculate</button>
              <button
                on:click={() => { reserveMode = 'manual'; haptic('light'); }}
                style="padding: 13px; font-weight: 900; font-size: 0.8rem; text-transform: uppercase;
                       letter-spacing: 0.06em; cursor: pointer; border: none;
                       background: {reserveMode === 'manual' ? '#0A0A0A' : '#FFFFFF'};
                       color: {reserveMode === 'manual' ? '#FAFAF0' : '#0A0A0A'}; min-height: 50px;"
              >✎ Fixed Amount</button>
            </div>

            {#if reserveMode === 'auto'}
              <!-- Auto mode -->
              <div>
                <label for="reserveMonths" class="nb-label">Months of Expenses to Maintain</label>
                <input
                  id="reserveMonths"
                  type="number"
                  min="1"
                  max="12"
                  bind:value={reserveMonths}
                  class="nb-input"
                  style="font-size: 1.5rem; font-weight: 900; text-align: center; max-width: 110px;"
                />
              </div>

              {#if autoReserveCalc.hasEnoughData}
                <div style="background: #F5F5F0; border: 3px solid #0A0A0A; padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 0.68rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #666;">
                      Avg Monthly Expenses
                    </span>
                    <span style="font-weight: 900;">{formatCurrency(autoReserveCalc.monthlyBurn)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 2px solid #0A0A0A; padding-top: 10px;">
                    <span style="font-size: 0.68rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #666;">
                      Calculated Target
                    </span>
                    <span style="font-weight: 900; font-size: 1.2rem;">{formatCurrency(autoReserveCalc.target)}</span>
                  </div>
                </div>
                <p style="font-size: 0.78rem; font-weight: 600; color: #666; line-height: 1.5;">
                  Based on your last 3 months of expenses. AA recommends 2–3 months.
                </p>
              {:else}
                <div style="background: #F5F5F0; border: 3px solid #0A0A0A; padding: 16px; text-align: center;">
                  <p style="font-size: 0.85rem; font-weight: 700; color: #888;">
                    No expense transactions found in the last 3 months.
                  </p>
                  <p style="font-size: 0.78rem; font-weight: 600; color: #aaa; margin-top: 4px;">
                    Add some transactions first, or use Fixed Amount instead.
                  </p>
                </div>
              {/if}

            {:else}
              <!-- Manual mode -->
              <div>
                <label for="reserveAmount" class="nb-label">Target Amount ($)</label>
                <div style="position: relative;">
                  <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
                                font-weight: 900; font-size: 1.2rem; color: #0A0A0A; pointer-events: none;">$</span>
                  <input
                    id="reserveAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    bind:value={newReserveAmount}
                    placeholder="0.00"
                    class="nb-input"
                    style="padding-left: 34px; font-size: 1.4rem; font-weight: 900;"
                  />
                </div>
              </div>
              <p style="font-size: 0.78rem; font-weight: 600; color: #666; line-height: 1.5;">
                Set a specific dollar amount as your prudent reserve target.
              </p>
            {/if}

            <!-- Actions -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px;">
              <button on:click={() => { showEditReserve = false; haptic('light'); }} class="nb-btn nb-btn-white">
                Cancel
              </button>
              <button
                on:click={() => { handleUpdateReserve(); haptic('success'); }}
                disabled={reserveMode === 'auto' ? !autoReserveCalc.hasEnoughData : !newReserveAmount}
                class="nb-btn nb-btn-yellow"
              >
                Save →
              </button>
            </div>

          </div>
        </div>
      </div>
    {/if}

    <!-- ══════════════════════════════════════════════ -->
    <!--  Receipt Lightbox Modal                        -->
    <!-- ══════════════════════════════════════════════ -->
    {#if lightboxImageUrl}
      <div 
        style="position: fixed; inset: 0; background: rgba(10,10,10,0.9); display: flex;
                    align-items: center; justify-content: center; z-index: 60; padding: 20px;"
        on:click={closeLightbox}
        on:keydown={(e) => e.key === 'Escape' && closeLightbox()}
        role="button"
        tabindex="0"
      >
        <!-- Close button -->
        <button
          on:click={closeLightbox}
          style="position: absolute; top: 20px; right: 20px; background: #FF1744; color: #fff;
                     border: 3px solid #0A0A0A; width: 44px; height: 44px; font-weight: 900;
                     cursor: pointer; font-size: 1.5rem; line-height: 1; z-index: 61;"
        >×</button>

        <!-- Download button -->
        <button
          on:click={() => downloadReceipt(lightboxImageUrl!)}
          style="position: absolute; top: 20px; right: 76px; background: #FFE500; color: #0A0A0A;
                     border: 3px solid #0A0A0A; padding: 10px 16px; font-weight: 900;
                     cursor: pointer; font-size: 0.8rem; text-transform: uppercase; 
                     letter-spacing: 0.06em; z-index: 61;"
        >↓ Download</button>

        <!-- Receipt image -->
        <img
          src={lightboxImageUrl}
          alt="Receipt"
          style="max-width: 90vw; max-height: 90vh; object-fit: contain; border: 3px solid #0A0A0A;"
          on:click|stopPropagation
        />
      </div>
    {/if}

  </div>
{/if}
