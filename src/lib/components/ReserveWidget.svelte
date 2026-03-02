<script lang="ts">  import { calculateReserveStatus } from '$lib/settings';
  import type { Treasury } from '$lib/treasury';

  export let treasury: Treasury;
  export let currentBalance: number = 0;
  export let onEdit: () => void;

  $: reserveStatus = calculateReserveStatus(currentBalance, treasury.prudentReserve);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  const statusConfig = {
    healthy: { 
      badgeClass: 'nb-badge-green',
      barColor: '#00C853',
      label: 'HEALTHY',
      bgColor: '#00C853'
    },
    caution: { 
      badgeClass: 'nb-badge-yellow',
      barColor: '#FFE500',
      label: 'CAUTION',
      bgColor: '#FFE500'
    },
    low: { 
      badgeClass: 'nb-badge-red',
      barColor: '#FF1744',
      label: 'LOW',
      bgColor: '#FF1744'
    },
    unset: {
      badgeClass: 'nb-badge-white',
      barColor: '#CCCCCC',
      label: 'NOT SET',
      bgColor: '#FFFFFF'
    }
  };

  $: config = statusConfig[reserveStatus.status];
</script>

<div class="nb-card" style="margin-bottom: 20px;">  <!-- Header -->
  <div style="background: #0A0A0A; color: #FFE500; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">    <span style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem;">      Prudent Reserve
    </span>
    <span class="nb-badge {config.badgeClass}">{config.label}</span>
  </div>
  
  <div style="padding: 20px;">    {#if reserveStatus.status === 'unset'}      <!-- Not set state -->
      <div style="text-align: center; padding: 20px;">        <p style="font-size: 0.9rem; font-weight: 700; color: #444; margin-bottom: 16px;">          Set a prudent reserve target for this treasury
        </p>
        <button
          on:click={onEdit}
          class="nb-btn nb-btn-yellow"
          style="width: auto; display: inline-flex; padding: 12px 24px;"
        >          Set Target Amount →
        </button>
      </div>    {:else}      <!-- Progress Bar -->
      <div style="margin-bottom: 20px;">        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">          <span>Reserve Coverage</span>
          <span>{Math.round(reserveStatus.percentCovered)}%</span>
        </div>
        <div style="height: 24px; background: #E5E5E5; border: 3px solid #0A0A0A;">          <div 
            style="height: 100%; background: {config.barColor}; transition: width 0.5s ease; width: {Math.min(100, reserveStatus.percentCovered)}%;"
          ></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.65rem; font-weight: 600; color: #666; text-transform: uppercase;">          <span>0%</span>
          <span>Target: {formatCurrency(reserveStatus.targetReserve)}</span>
          <span>100%+</span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">        <div style="background: {config.bgColor}; border: 3px solid #0A0A0A; padding: 16px;">          <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">            {reserveStatus.surplus >= 0 ? 'Surplus' : 'Shortfall'}
          </div>
          <div style="font-size: 1.4rem; font-weight: 900;">            {formatCurrency(Math.abs(reserveStatus.surplus))}
          </div>
        </div>
        
        <div style="background: #FFFFFF; border: 3px solid #0A0A0A; padding: 16px;">          <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">            Target Reserve</div>
          <div style="font-size: 1.3rem; font-weight: 900;">            {formatCurrency(reserveStatus.targetReserve)}
          </div>
        </div>
        
        <div style="background: #FFFFFF; border: 3px solid #0A0A0A; padding: 16px;">          <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">            Current Balance</div>
          <div style="font-size: 1.3rem; font-weight: 900;">            {formatCurrency(reserveStatus.currentReserve)}
          </div>
        </div>
        
        <div style="background: #FFFFFF; border: 3px solid #0A0A0A; padding: 16px;">          <div style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">            Coverage</div>
          <div style="font-size: 1.3rem; font-weight: 900;">            {Math.round(reserveStatus.percentCovered)}%
          </div>
        </div>
      </div>

      <!-- Edit link -->
      <div style="margin-top: 16px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
        <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #888;">
          {treasury.prudentReserveMode === 'auto'
            ? `Auto · ${treasury.prudentReserveMonths ?? 3} months`
            : 'Fixed amount'}
        </span>
        <button
          on:click={onEdit}
          style="font-size: 0.75rem; font-weight: 700; color: #0052FF; text-decoration: underline; background: none; border: none; cursor: pointer;"
        >Edit Target →</button>
      </div>
    {/if}
  </div>
</div>