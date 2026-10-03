# Facebook Marketplace posting: terms the dealer accepts (DRAFT)

**Status: draft for attorney review. Not legal advice. Do not ship to customers until a Texas-licensed attorney has approved it.**

## What the feature does, and how it's built (why the design matters legally)

Meta allows vehicle listings on Marketplace **only from a real person's own personal profile**:
- partner catalog feeds stopped reaching Marketplace on September 13, 2021;
- business Pages lost vehicle listings on January 30, 2023.

Meta's terms also say not to share account access with anyone else. So the feature is built to keep the **person in control and on their own device**:

1. The listing (photos, title, price, mileage, description) is prepared by Obavia from the car in the Desk.
2. The salesperson opens it on **their own phone or browser, signed in as themselves**. Obavia fills in the Marketplace form in their session. **They review it and tap Post.**
3. **Obavia never asks for, stores or uses anyone's Facebook password,** and never runs a Facebook account from our servers.

This is the industry-standard pattern for dealer Marketplace tools. It keeps the risk with the account owner, where Meta's rules put it. It also keeps Obavia from itself operating accounts it doesn't own.

A waiver the dealer signs protects us from **the dealer**. It does **not** protect us from **Meta** if Obavia itself logs into personal accounts from our servers: Meta has taken legal action against companies that automate access to its platform. The on-device design above is what protects us from Meta. **Keep both: the design and the waiver.**

## The terms (shown in plain words, one screen at a time, before the feature turns on)

**1. What this does.** Obavia prepares each car's Marketplace listing and fills it into Facebook on your device, signed in as you. You review every listing and choose to post it.

**2. It's your account.** Posting happens on your own personal Facebook account, under your control. You're responsible for following Facebook's Terms, Commerce Policies and Marketplace rules, including their limits on how often and how much you list.

**3. Facebook can restrict your account.** Facebook decides, on its own and without notice, whether to limit, remove or ban listings or accounts. That can happen even when you follow every rule. Obavia can't prevent it, reverse it or appeal it for you.

**4. Obavia isn't responsible for Facebook's actions.** To the fullest extent the law allows, Obavia and its owners, employees and suppliers are **not liable** for any restriction, suspension or ban of your Facebook account or listings, or for any lost sales, leads, data or profits that follow. You use this feature at your own choice and risk.

**5. Your listings must be true.** Each listing must match the car on your lot, including price, mileage, title status and condition, and must follow federal and Texas advertising rules. You're responsible for what you post. You agree to indemnify Obavia against claims arising from your listings or your use of your account.

**6. You can turn it off any time.** Turning it off stops Obavia preparing Marketplace listings. Listings already posted stay on your account until you remove them.

**7. Changes.** If these terms change, you'll be asked to agree again before the feature keeps working.

**Agreement.** "I've read this. I understand Facebook may restrict my account, and that Obavia isn't responsible if it does. I want to turn on Marketplace posting." The dealer then types their full name and taps **I Agree**.

## What we record
For each acceptance we record:
- the dealer (TxDMV licence number) and the person (name typed and signed-in user);
- the **terms version** and a hash of the exact text shown;
- the time (in the dealer's time zone), the device and the IP address.

A new terms version requires new acceptance. An account owner can withdraw consent, which switches the feature off.
