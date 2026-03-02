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
    return `${months.toFixed(1)} mo`;
  }

  const statusConfig = {
    healthy: { 
      cardClass: 'nb-card-green', 
      badgeClass: 'nb-badge-green',
      barColor: '#00C853',
      label: 'HEALTHY',
      textColor: '#0A0A0A'
    },
    caution: { 
      cardClass: 'nb-card-yellow', 
      badgeClass: 'nb-badge-yellow',
      barColor: '#FFE500',
      label: 'CAUTION',
      textColor: '#0A0A0A'
    },
    low: { 
      cardClass: 'nb-card-red', 
      badgeClass: 'nb-badge-red',
      barColor: '#FF1744',
      label: 'LOW',
      textColor: '#FFFFFF'
    }
  };

  $: config = statusConfig[reserveStatus.status];
</script>

<div class="nb-card" style="margin-bottom: 20px;">
  <!-- Header -->
  <div style="background: #0A0A0A; color: #FFE500; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem;">
      Prudent Reserve
    </span>
    <span class="nb-badge {config.badgeClass}">{config.label}</span>
  </div>
  
  <div style="padding: 20px;">
    <!-- Progress Bar -->
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
        <span>Reserve Coverage</span>
        <span>{Math.round(reserveStatus.percentCovered)}%</span>
      </div>
      <div style="height: 24px; background: #E5E5E5; border: 3px solid #0A0A0A;">
        <div 
          style="height: 100%; background: {config.barColor}; transition: width 0.5s ease; width: {Math.min(100, reserveStatus.percentCovered)}%;"
        ></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.65rem; font-weight: 600; color: #666; text-transform: uppercase;">
        <span>0%</span>
        <span>Target: {settings.reserveMonths} mo</span>
        <span>100%+</span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div style="background: #FFE500; border: 3px solid #0A0A0A; padding: 16px;">
        <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Months Covered</div>
        <div style="font-size: 1.6rem; font-weight: 900;">{formatMonths(reserveStatus.monthsCovered)}</div>
      </div>
      
      <div style="background: #FFFFFF; border: 3px solid #0A0A0A; padding: 16px;">
        <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Target Reserve</div>
        <div style="font-size: 1.3rem; font-weight: 900;">{formatCurrency(reserveStatus.targetReserve)}</div>
      </div>
      
      <div style="background: #FFFFFF; border: 3px solid #0A0A0A; padding: 16px;">
        <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Current Balance</div>
        <div style="font-size: 1.3rem; font-weight: 900;">{formatCurrency(reserveStatus.currentReserve)}</div>
      </div>
      
      <div style="background: #FFFFFF; border: 3px solid #0A0A0A; padding: 16px;">
        <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Monthly Burn</div>
        <div style="font-size: 1.3rem; font-weight: 900;">{formatCurrency(monthlyBurn)}</div>
        {#if monthlyBurn === 0}
          <div style="font-size: 0.6rem; color: #666; margin-top: 4px;">No recent expenses</div>
        {/if}
      </div>
    </div>

    <!-- Explanation -->
    <div style="margin-top: 16px; padding: 12px; background: #F5F5F0; border: 2px solid #0A0A0A; font-size: 0.75rem; font-weight: 600; line-height: 1.5;">
      {#if reserveStatus.status === 'healthy'}
        ✓ Your reserve covers {formatMonths(reserveStatus.monthsCovered)} of expenses. AA suggests 2-3 months.
      {:else if reserveStatus.status === 'caution'}
        ! Reserve below target. Consider building savings to reach {settings.reserveMonths} months.
      {:else}
        ⚠ Reserve critically low. Discuss with your business meeting about building a prudent reserve.
      {/if}
    </div>
  </div>
</div>