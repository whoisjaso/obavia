# Claims registry
Every user-facing factual claim (UI label, AI message, ad, support macro) must be listed here with its allowed condition and evidence source before use. Tests assert AI output contains only resolvable claims.

| Claim text (EN / ES) | Allowed when | Evidence source | Status |
|---|---|---|---|
| "Available" / "Disponible" | inventory status updated ≤ threshold OR dealer confirmed in-thread | Listing.status + updated_at | planned |
| "Dealer-confirmed price" / "Precio confirmado por el dealer" | dealer-entered price version exists | Deal.terms version | planned |
| "Paperwork signed" / "Documentos firmados" | all required DocumentVersions have SignatureEvidence | Documentation state | planned |
| "Vehicle delivered" / "Vehículo entregado" | DeliveryEvent with evidence class | Delivery state | planned |
| "Registration submitted" / "Registro enviado" | submission evidence uploaded by dealer or integration event | RegistrationCase | planned |
| "Registration in progress" / "Registro en proceso" | RegistrationCase in ready/submitted/returned | RegistrationCase | planned |
| "Financing prequalified" | licensed provider result on file | ProviderSubmission | parked (NL-3) |
| "No hidden fees" | NEVER as platform promise | — | banned |
| "Verified" (bare) | NEVER | — | banned |
| "Nobody is buying cars" | NEVER | — | banned |
| "Does your lot feel slower than it used to?" | ad hypothesis; question form only | — | allowed |
