/* OBAVIA Membership — the single source of truth for tiers, pricing, discounts,
   the "better of membership vs. Hardship Bridge" rule, and Category-B feature flags.
   Plain JS, assigns globals so every surface (membership page, admin, portal, contract)
   reads the SAME numbers. No bundler, no imports. */
(function () {
  function r2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }
  function money(n){ return "$" + r2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function moneyShort(n){ var v = r2(n); return "$" + (v % 1 === 0 ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }

  // ---- Tiers (the dial lives here — change a number and every surface follows) ----
  var TIERS = [
    { id: "open", name: "Open", fee: 0, regularFee: 0, discountPct: 0, exotic: false,
      tagline: "Pay as you go",
      blurb: "Standard published rates. No commitment, no membership.",
      accent: "#9a917c", badgeBg: "rgba(245,240,230,.06)", badgeFg: "#c9c1ad", badgeBorder: "rgba(245,240,230,.24)" },
    { id: "keyholder", name: "Keyholder", fee: 29.99, regularFee: 79.99, discountPct: 5, exotic: false,
      tagline: "The everyday member rate",
      blurb: "5% off the everyday fleet, plus member protection and priority.",
      accent: "#b89b5e", badgeBg: "rgba(184,155,94,.14)", badgeFg: "#d8b66a", badgeBorder: "rgba(184,155,94,.55)" },
    { id: "blackkey", name: "Black Key", fee: 199.99, regularFee: 199.99, discountPct: 20, exotic: true,
      tagline: "Keys to everything",
      blurb: "20% off every class, plus Noir and exotic access.",
      accent: "#e7c97a", badgeBg: "#121212", badgeFg: "#e7c97a", badgeBorder: "#b89b5e" }
  ];
  // Founding-member rate: a real, bona fide anchor. $29.99 locked for life for early Keyholders;
  // $79.99 is the genuine price later Keyholders will pay. Not a separate tier.
  var FOUNDING = { label: "Founding Member", fee: 29.99, lockedForLife: true, appliesTo: "keyholder", regularFee: 79.99 };
  var BRIDGE = { pct: 20, weeks: 2, floor: 100 };   // Hardship Bridge: 20% off wks 1-2, never below $100
  var GATED_CLASS = "Noir";                          // exotic class — discount & priority gated to Black Key

  function tier(id){ for (var i=0;i<TIERS.length;i++) if (TIERS[i].id===id) return TIERS[i]; return TIERS[0]; }
  function paidTiers(){ return TIERS.filter(function(t){ return t.fee > 0; }); }

  // Effective monthly fee for a member (founding lock vs. regular price).
  function feeFor(tierId, founding){
    var t = tier(tierId);
    if (founding && FOUNDING.appliesTo === tierId) return FOUNDING.fee;
    return t.fee;
  }

  // Does this tier's % apply to a given vehicle CLASS? (exotic/Noir gated to Black Key)
  function discountApplies(tierId, vehClass){
    var t = tier(tierId);
    if (t.discountPct <= 0) return false;
    if (vehClass === GATED_CLASS) return t.exotic;
    return true;
  }
  function discountPct(tierId, vehClass){ return discountApplies(tierId, vehClass) ? tier(tierId).discountPct : 0; }
  function memberDiscount(tierId, weeklyRate, vehClass){ return r2((weeklyRate||0) * discountPct(tierId, vehClass) / 100); }

  function bridgeDiscount(weeklyRate, weekIndex, bridgeOn){
    if (!bridgeOn || !weekIndex || weekIndex > BRIDGE.weeks) return 0;
    var d = (weeklyRate||0) * BRIDGE.pct / 100;
    if ((weeklyRate - d) < BRIDGE.floor) d = Math.max(0, weeklyRate - BRIDGE.floor);
    return r2(d);
  }

  // The week's price: apply the BETTER of membership discount or Hardship Bridge — never both.
  function effectiveWeekly(o){
    o = o || {};
    var rate = o.weeklyRate || 0;
    var mem = memberDiscount(o.tierId || "open", rate, o.vehClass);
    var br  = bridgeDiscount(rate, o.weekIndex || 1, !!o.bridgeOn);
    var disc = Math.max(mem, br);
    return { base: r2(rate), discount: disc, net: r2(rate - disc),
             which: disc <= 0 ? "none" : (mem >= br ? "membership" : "bridge"),
             memberDiscount: mem, bridgeDiscount: br };
  }

  // "Show me the math": honest week-by-week savings, netting the monthly fee. Survives a calculator.
  function projection(o){
    o = o || {};
    var rate = o.weeklyRate || 0;
    var tierId = o.tierId || "keyholder";
    var founding = o.founding !== false;
    var weeks = Math.max(1, Math.round(o.weeks || 4));
    var perWeek = memberDiscount(tierId, rate, o.vehClass);
    var fee = feeFor(tierId, founding);
    var rows = [], cumGross = 0, breakeven = 0, WPM = 52/12; // ~4.333 weeks per billed month
    for (var w = 1; w <= weeks; w++){
      cumGross = r2(cumGross + perWeek);
      var months = Math.max(1, Math.ceil(w / WPM));
      var feesPaid = r2(fee * months);
      var net = r2(cumGross - feesPaid);
      if (!breakeven && fee > 0 && cumGross >= fee) breakeven = w;
      rows.push({ week: w, perWeek: perWeek, cumGross: cumGross, feesPaid: feesPaid, net: net, ahead: net >= 0 });
    }
    var last = rows[rows.length-1];
    return { perWeek: perWeek, fee: fee, weeks: weeks, breakevenWeek: breakeven,
             grossSaved: last.cumGross, feesPaid: last.feesPaid, netSaved: last.net,
             rows: rows, applies: perWeek > 0, discountPct: discountPct(tierId, o.vehClass) };
  }

  // ---- Perks ----
  // Category A — OBAVIA-controlled, no external dependency. Always live.
  var PERKS_A = [
    { id:"member_rate", name:"Member rate", desc:"A percentage off the weekly rate of whatever you drive \u2014 it scales with the car." },
    { id:"income_protection", name:"Zero-Downtime Guarantee", desc:"If your car goes down, a replacement is on its way within hours. Your income never waits on a repair.", headline:true },
    { id:"priority_access", name:"Priority access & free upgrades", desc:"First call on the unit you want, and a complimentary upgrade when a better one is sitting idle." },
    { id:"skip_line", name:"Skip the line", desc:"Re-rent without re-verifying \u2014 your identity and insurance are already on file." },
    { id:"swap", name:"Swap flexibility", desc:"Change units as your week changes: a sedan today, an SUV for the weekend." },
    { id:"reports", name:"Mileage & expense reports", desc:"Clean, tax-ready mileage and expense summaries from the car\u2019s own telematics." },
    { id:"pause", name:"Skip-a-week pause", desc:"Hand the keys back for a week without losing your member rate. Twice a year." },
    { id:"loyalty", name:"Loyalty milestones", desc:"Rent enough weeks and a credit \u2014 or a free week \u2014 lands on your account." }
  ];
  // Category B — partner / back-end-pending. Built in architecture, FLAGGED OFF in the customer view
  // until genuinely deliverable (daylight test: never advertise what OBAVIA can't yet deliver).
  var PERKS_B = [
    { id:"fuel", name:"Fuel discount", desc:"Cents off every gallon through the OBAVIA fuel card.", partner:"Fuel-card partnership" },
    { id:"rideshare_ins", name:"Rideshare insurance discount", desc:"A break on commercial / rideshare coverage.", partner:"Insurer partnership" },
    { id:"gig_essentials", name:"Gig-essential discounts", desc:"Car washes, EV charging, and accessories at member pricing.", partner:"Merchant partnerships" },
    { id:"referral", name:"Referral credits", desc:"Credit on your account for every driver you bring in.", partner:"Referral / credit back-end" }
  ];

  var DEFAULT_FLAGS = { fuel:false, rideshare_ins:false, gig_essentials:false, referral:false };
  function getFlags(){
    try { var f = JSON.parse(localStorage.getItem("obavia_perk_flags") || "null"); if (f) return Object.assign({}, DEFAULT_FLAGS, f); } catch(e){}
    return Object.assign({}, DEFAULT_FLAGS);
  }
  function setFlag(id, on){ var f = getFlags(); f[id] = !!on; try { localStorage.setItem("obavia_perk_flags", JSON.stringify(f)); } catch(e){} return f; }
  function perkLive(id){ var f = getFlags(); return id in f ? !!f[id] : true; }   // Category A always live
  function livePerksB(){ var f = getFlags(); return PERKS_B.filter(function(p){ return f[p.id]; }); }
  function allPerksBWithState(){ var f = getFlags(); return PERKS_B.map(function(p){ return Object.assign({}, p, { live: !!f[p.id] }); }); }

  // ---- Loyalty: rent a full month straight (4 consecutive weeks) → bank one "20% off a future
  // week" reward. Rewards accrue and don't expire; 3 months renting = 3 banked reward-weeks. ----
  var LOYALTY = { everyWeeks: 4, rewardPct: 20 };
  function loyaltyStatus(weeksRented, redeemed){
    var w = Math.max(0, Math.floor(weeksRented || 0));
    var earned = Math.floor(w / LOYALTY.everyWeeks);
    var used = Math.max(0, Math.floor(redeemed || 0));
    var banked = Math.max(0, earned - used);
    var into = w % LOYALTY.everyWeeks;                 // weeks into the current cycle
    var weeksToNext = into === 0 && w > 0 ? LOYALTY.everyWeeks : (LOYALTY.everyWeeks - into);
    return { earned: earned, redeemed: used, banked: banked, rewardPct: LOYALTY.rewardPct,
             everyWeeks: LOYALTY.everyWeeks, weeksIntoCycle: into, weeksToNext: weeksToNext,
             progressPct: Math.round((into / LOYALTY.everyWeeks) * 100) };
  }
  // Apply a banked reward to a week's rate (20% off), if one is available.
  function loyaltyApply(weeklyRate, banked){ return (banked > 0) ? r2(weeklyRate * (1 - LOYALTY.rewardPct / 100)) : r2(weeklyRate); }

  window.OBAVIA_MEMBERSHIP = {
    TIERS: TIERS, FOUNDING: FOUNDING, BRIDGE: BRIDGE, GATED_CLASS: GATED_CLASS,
    tier: tier, paidTiers: paidTiers, feeFor: feeFor,
    discountApplies: discountApplies, discountPct: discountPct, memberDiscount: memberDiscount,
    bridgeDiscount: bridgeDiscount, effectiveWeekly: effectiveWeekly, projection: projection,
    PERKS_A: PERKS_A, PERKS_B: PERKS_B,
    LOYALTY: LOYALTY, loyaltyStatus: loyaltyStatus, loyaltyApply: loyaltyApply,
    getFlags: getFlags, setFlag: setFlag, perkLive: perkLive, livePerksB: livePerksB, allPerksBWithState: allPerksBWithState,
    money: money, moneyShort: moneyShort, r2: r2
  };
})();
