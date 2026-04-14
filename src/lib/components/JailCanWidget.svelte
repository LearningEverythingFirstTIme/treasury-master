<script lang="ts">
  import type { Treasury, Transaction } from '$lib/treasury';
  import { calculateJailCanBalance, calculateJailCanLastEmptied } from '$lib/treasury';

  export let treasury: Treasury;
  export let transactions: Transaction[] = [];
  export let onEmpty: () => void = () => {};
  export let onAddDonation: () => void = () => {};

  $: jailCanBalance = calculateJailCanBalance(transactions);
  $: lastEmptied = calculateJailCanLastEmptied(transactions);

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

  function getWeeksSince(date: Date | null): number | null {
    if (!date) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  }

  $: weeksSince = getWeeksSince(lastEmptied);

  $: activityConfig = (() => {
    if (weeksSince === null) {
      return { color: '#CCCCCC', label: 'NEVER EMPTIED', badgeClass: 'nb-badge-white' };
    }
    if (weeksSince <= 1) {
      return { color: '#00C853', label: `${weeksSince} WEEK${weeksSince === 1 ? '' : 'S'}`, badgeClass: 'nb-badge-green' };
    }
    if (weeksSince <= 4) {
      return { color: '#FFE500', label: `${weeksSince} WEEKS`, badgeClass: 'nb-badge-yellow' };
    }
    return { color: '#FF1744', label: `${weeksSince} WEEKS`, badgeClass: 'nb-badge-red' };
  })();

  $: barWidth = (() => {
    if (weeksSince === null) return 15; // neutral small bar
    // Scale: 0 weeks = 0%, 8+ weeks = 100%
    return Math.min(100, Math.max(5, (weeksSince / 8) * 100));
  })();
</script>

<div class="nb-card" style="margin-bottom: 20px;">
  <!-- Header -->
  <div style="background: #0A0A0A; color: #FF6B35; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem;">
      🪣 Jail Can
    </span>
    <span class="nb-badge {activityConfig.badgeClass}">{activityConfig.label}</span>
  </div>

  <div style="padding: 20px;">
    <!-- Balance -->
    <div style="text-align: center; margin-bottom: 20px;">
      <p style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; margin-bottom: 6px; color: #666;">
        Jail Can Balance
      </p>
      <p style="font-size: 2.4rem; font-weight: 900; letter-spacing: -0.02em; line-height: 1; color: #FF6B35;">
        {formatCurrency(jailCanBalance)}
      </p>
    </div>

    <!-- Time since last emptied -->
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
        <span>Time Since Last Emptied</span>
        <span style="color: {activityConfig.color};">{weeksSince !== null ? `${weeksSince}w` : '—'}</span>
      </div>
      <div style="height: 20px; background: #E5E5E5; border: 3px solid #0A0A0A;">
        <div
          style="height: 100%; background: {activityConfig.color}; transition: width 0.5s ease; width: {barWidth}%;"
        ></div>
      </div>
      <div style="margin-top: 6px; font-size: 0.65rem; font-weight: 600; color: #888; text-transform: uppercase;">
        {#if lastEmptied}
          Last emptied: {formatDate(lastEmptied)}
        {:else}
          Never emptied
        {/if}
      </div>
    </div>

    <!-- Stats -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div style="background: #FFFFFF; border: 3px solid #0A0A0A; padding: 14px;">
        <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; color: #00C853;">
          Donations In
        </div>
        <div style="font-size: 1.2rem; font-weight: 900;">
          {formatCurrency(transactions.filter(t => t.category === 'Jail Can Donation' && t.type === 'income').reduce((s, t) => s + t.amount, 0))}
        </div>
      </div>
      <div style="background: #FFFFFF; border: 3px solid #0A0A0A; padding: 14px;">
        <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; color: #FF1744;">
          Disbursed Out
        </div>
        <div style="font-size: 1.2rem; font-weight: 900;">
          {formatCurrency(transactions.filter(t => t.category === 'Jail Can Disbursement' && t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <button
        on:click={onAddDonation}
        class="nb-btn nb-btn-black"
        style="font-size: 0.85rem; padding: 14px 16px;"
      >
        + Donation
      </button>
      <button
        on:click={onEmpty}
        class="nb-btn"
        style="background: #FF6B35; color: #fff; font-size: 0.85rem; padding: 14px 16px; border: 3px solid #0A0A0A; box-shadow: 4px 4px 0 #0A0A0A;"
        disabled={jailCanBalance <= 0}
      >
        Empty Can 🪣
      </button>
    </div>
  </div>
</div>
