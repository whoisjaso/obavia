/* Where the buyer's $250 stands, and the faint line Me says under it. The Worker's word (GET /me
   `deposit_status`, worker/README.md) made the phone's; the local stand-in never sets it and Me reads its own
   sale instead. Four words or fewer per line, the car's name apart, in Bodoni, touching the words (the Bid
   sheet's stamp row). The same words as the push and the Desk (DOCTRINE CP9): "forfeited" is the push's word. */

export type DepositStanding = 'none' | 'held' | 'applied' | 'released' | 'forfeited' | 'disputed';

/** The Worker's `deposit_status` as the phone names it: captured is held, refunded is released; applied,
    forfeited and disputed are their own word; anything else (none, absent, a word the phone does not know) is none. */
export function depositStanding(status: string | null | undefined): DepositStanding {
  switch (status) {
    case 'captured': return 'held';
    case 'refunded': return 'released';
    case 'applied': case 'forfeited': case 'disputed': return status;
    default: return 'none';
  }
}

/** The line under the $250. `name`: the car's name, set on its own in Bodoni after the words; `back`: whether
    "Get it back" belongs on the glass (held only). The Worker sends no date with a refund, so released carries none. */
export function depositLine(standing: DepositStanding, car?: string): { words: string; name?: string; back: boolean } {
  switch (standing) {
    case 'held': return { words: 'held · back if you lose', back: true };
    case 'applied': return car ? { words: 'went to your', name: car, back: false } : { words: 'went to your car', back: false };
    case 'released': return { words: 'sent back', back: false };
    case 'forfeited': return car ? { words: 'forfeited', name: car, back: false } : { words: 'forfeited', back: false };
    case 'disputed': return { words: 'disputed', back: false };
    default: return { words: 'held at your first bid', back: false };
  }
}
