/* OBAVIA shared foundation — design tokens, stage map, and the single shared
   record that threads A -> B -> C -> D. Both the system shell and every surface
   read these. This is the exact seam Claude Code wires to Supabase: the record
   that starts as an inquiry, becomes the customer, becomes the agreement. */
(function () {
  window.OBAVIA_TOKENS = {
    ink: "#121212", ivory: "#F5F0E6", gold: "#b89b5e", softInk: "#2b2824",
    paper: "#fffdf9", hairline: "rgba(18,18,18,.14)", hairlineStrong: "rgba(18,18,18,.28)",
    onInkDim: "rgba(245,240,230,.6)", goldTint: "rgba(184,155,94,.10)",
    ok: "#3a6235", okBg: "#eaf1e2", okBorder: "#cbdcbd",
    review: "#8a6d1f", reviewBg: "#f6edd4", reviewBorder: "#e3d09a",
    stop: "#9a3b2e", stopBg: "#f4e1da", stopBorder: "#e6c3b7",
    fontDisplay: "'Cormorant Garamond', serif", fontUI: "'Montserrat', sans-serif", radius: "4px"
  };

  // The four stages of the single journey, with the data each hands to the next.
  window.OBAVIA_STAGES = [
    { key: "A", id: "acquisition", label: "Acquisition", sub: "Public site + qualifier",
      emits: "Inquiry", needs: "\u2014", surface: "Obavia Home.dc.html?book=1" },
    { key: "B", id: "triage", label: "Triage", sub: "Admin accept / decline",
      emits: "Onboarding invite (+ prefill)", needs: "Inquiry", surface: "" },
    { key: "C", id: "onboarding", label: "Onboarding", sub: "Identity \u00b7 insurance \u00b7 payment",
      emits: "Verified records", needs: "Invite + prefill", surface: "Obavia Customer Portal.dc.html" },
    { key: "D", id: "agreement", label: "Agreement", sub: "Data-bound contract \u00b7 e-sign",
      emits: "Executed agreement \u2192 active rental", needs: "Verified records", surface: "Obavia Rental Agreement (Portal Edition).dc.html" }
  ];

  window.OBAVIA_RATE = { weekly: 350, bridge: 280, bridgeWeeks: 2, floor: 100, controllingLanguage: "en" };

  window.OBAVIA_newRecord = function () {
    return { id: null, stage: "A", inquiry: null, triage: null, customer: null, agreement: null, rental: null };
  };

  window.OBAVIA_SEED = null;

  window.OBAVIA_journeyFromInquiry = function (inq) {
    return {
      id: "OBV-" + Math.floor(1000 + Math.random() * 8999),
      stage: "C",
      inquiry: inq,
      triage: { decision: "accepted", decidedAt: new Date().toISOString().slice(0, 10), operator: "You", operatorLanguage: "en" },
      customer: { prefillName: inq.name, prefillPhone: inq.phone, prefillEmail: inq.email,
        purpose: inq.purpose, platforms: inq.platforms || [], selectedLanguage: inq.language,
        legalName: "", aka: "", nameMatchTier: 0, insActive: false, paymentRef: "" },
      agreement: null, rental: null
    };
  };
})();
