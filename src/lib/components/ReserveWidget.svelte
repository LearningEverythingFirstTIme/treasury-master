<script lang="ts">
  import { calculateReserveStatus, calculateMonthlyBurnRate, type UserSettings } from '$lib/settings';
  import type { Transaction } from '$lib/types';

  export let transactions: Transaction[] = [];
  export let currentBalance: number = 0;
  export let settings: UserSettings;

  $: monthlyBurn = calculateMonthlyBurnRate(transactions);
  $: reserveStatus = calculateReserveStatus(currentBalance, monthlyBurn, settings.reserveMonths);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function formatMonths(months: number): string {
    if (months < 1) {
      const days = Math.round(months * 30);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${months.toFixed(1)} month${months !== 1 ? 's' : ''}`;
  }

  const statusConfig = {
    healthy: { color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800', label: 'Healthy', icon: '✓' },
    caution: { color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-800', label: 'Caution', icon: '!' },
    low: { color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-800', label: 'Low', icon: '⚠' }
  };

  $: config = statusConfig[reserveStatus.status];
</script>

<div class="rounded-xl border border-slate-200 overflow-hidden">
  <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
    <h3 class="font-semibold text-slate-800">Prudent Reserve</h3>
    <span class="text-xs text-slate-500">Target: {settings.reserveMonths} months</span>
  </div>
  
  <div class="p-5">
    <!-- Status Bar -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-slate-600">Reserve Coverage</span>
        <span class="text-sm font-medium {config.text}">{config.label}</span>
      </div>
      <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div 
          class="h-full {config.color} transition-all duration-500"
          style="width: {reserveStatus.percentCovered}%"
        ></div>
      </div>
      <div class="flex justify-between mt-1 text-xs text-slate-500">
        <span>0%</span>
        <span>{Math.round(reserveStatus.percentCovered)}%</span>
        <span>100%+</span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-4">
      <div class="{config.bg} rounded-lg p-3">
        <div class="text-xs text-slate-500 mb-1">Months Covered</div>
        <div class="text-xl font-bold {config.text}">{formatMonths(reserveStatus.monthsCovered)}</div>
      </div>
      
      <div class="bg-slate-50 rounded-lg p-3">
        <div class="text-xs text-slate-500 mb-1">Target Reserve</div>
        <div class="text-xl font-bold text-slate-800">{formatCurrency(reserveStatus.targetReserve)}</div>
      </div>
      
      <div class="bg-slate-50 rounded-lg p-3">
        <div class="text-xs text-slate-500 mb-1">Current Balance</div>
        <div class="text-xl font-bold text-slate-800">{formatCurrency(reserveStatus.currentReserve)}</div>
      </div>
      
      <div class="bg-slate-50 rounded-lg p-3">
        <div class="text-xs text-slate-500 mb-1">Monthly Burn Rate</div>
        <div class="text-xl font-bold text-slate-800">{formatCurrency(monthlyBurn)}</div>
        {#if monthlyBurn === 0}
          <div class="text-xs text-slate-400 mt-1">No recent expenses</div>
        {/if}
      </div>
    </div>

    <!-- Explanation -->
    <div class="mt-4 text-xs text-slate-500 leading-relaxed">
      {#if reserveStatus.status === 'healthy'}
        Your group has a healthy reserve covering {formatMonths(reserveStatus.monthsCovered)} of expenses. 
        AA suggests maintaining 2-3 months of operating expenses.
      {:else if reserveStatus.status === 'caution'}
        Your reserve is below target. Consider building up savings to reach {settings.reserveMonths} months of coverage.
      {:else}
        Your reserve is critically low. Discuss with your business meeting about building a prudent reserve.
      {/if}
    </div>
  </div>
</div>
