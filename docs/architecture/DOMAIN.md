# Domain model (implement only what the active slice consumes)

Records: Person/Account · DealerOrganization (+Location, Membership, Role) · DealerCustomerRelationship (what this dealer may know) · Vehicle (VIN identity; resellable; never permanently banned) · Listing/InventoryRecord (a seller's current offering + authority) · Inquiry · ShoppingCase (episode with one dealer; many VehicleInterests) · Conversation/Message · FinancingRequest (real application, distinct from inquiry) · ProviderSubmission (versioned, permissioned, with result) · Deal · DocumentVersion · SignatureEvidence · PaymentFundingEvent (source-attributed) · DeliveryEvent · RegistrationCase · Obligation · Consent · ReviewFeedback · AuditEvent.

## Invariants
- VIN ≠ listing ID. Resale creates a new listing/relationship.
- One active exclusive allocation per InventoryRecord (DB constraint).
- Inquiry dedupe: (person, listing, active shopping case) unique.
- A dealer reads only rows reachable through its DealerCustomerRelationship (RLS).
- Executed DocumentVersion is immutable; corrections create new versions with supersession history.
- External effects: request → acknowledged → result; idempotency key; reconciliation job; timeout after provider acted is possible.
- No `sold` boolean. State dimensions: documentation / funding / delivery / commercial / registration / servicing, each transition with evidence class.

## State machine (write before screens; per slice)
Documentation: draft → awaiting_signatures → signed | correction_required
Funding: n/a → pending → authorized → received | exception (source: dealer_reported | provider_event)
Delivery: not_scheduled → scheduled → ready → delivered | disputed
Commercial: open → conditionally_proceeding → recorded_complete | cancelled | disputed
Registration: not_ready → ready → submitted (evidence) → returned | accepted → completed
Servicing: n/a → active → exception → closed
