# League Features Guide (v3) — How to Use the App

This guide explains how to use all league features built from the v3 product spec: **Trade Block**, **Trade Offers**, **Free Agency**, **Tera Captains**, **midnight transaction execution**, and **weekly roster view**. Use the dashboard and sidebar to reach each feature.

---

## 1. Trade Block

**What it is:** A way to mark Pokémon on your roster as “available for trade” so other coaches can see them and make offers.

**How to use it in the app:**

1. Go to **My League Team** in the sidebar, then open **Trade Block** (or go to **Dashboard → Trade Block**).
2. On the Trade Block page you’ll see:
   - **Your trade block** — Add or remove Pokémon from your block. You can add a short note (e.g. “Looking for speed control”).
   - **League trade block** — A list of every coach’s listed Pokémon so you can browse who’s open to trades.
3. To add a Pokémon to your block: select it from your roster and add an optional note. To remove: take it off your block.
4. Pokémon on the block are **not** moved until a trade is agreed, approved by league management, and executed (see below).

**In-app:** [Trade Block](/dashboard/trade-block) (sidebar: My League Team → Trade Block).

---

## 2. Trade Offers (Make, Respond, Approve)

**What it is:** You can propose a trade (up to 3 Pokémon each side), the other coach can accept or reject, and approved trades go to league management before execution.

**How to use it:**

- **Make an offer**
  1. From **Trade Block**, find another team’s listed Pokémon (or go to their roster from **My League Team** / league views).
  2. Click **Trade** (or “Make offer”) to open the trade modal.
  3. Select up to **3 Pokémon** you’re offering and up to **3** you’re requesting. The app shows both teams’ **point budgets** and highlights **Tera Captains** (e.g. gold/reverse) so both sides see budget and Tera impact.
  4. Submit the offer. The other coach is notified (in-app and/or via Discord).

- **Respond to an offer**
  1. When someone sends you an offer, you’ll see it on the **Trade Block** page and/or in **Dashboard** under “Trade offer(s) to respond to.”
  2. Open the offer and choose **Accept** or **Reject**. If you reject, the offering coach is notified. If you accept, the trade goes to **league management** for approval.

- **League management (commissioner/admin)**
  1. Pending approvals appear in **Admin → Trades** (or the admin trades view).
  2. **Approve** or **Deny**. Approved trades are **scheduled** for the next **12:00 AM Monday EST** execution; rosters do not change until then.

**In-app:** [Trade Block](/dashboard/trade-block); [Admin → Trades](/admin/trades) (for commissioners).

---

## 3. Free Agency (Add/Drop)

**What it is:** You can drop a rostered Pokémon and add one from the **free agency pool** (draft-eligible but not on any team). Moves are first-come, first-serve and execute at midnight Monday EST.

**How to use it:**

1. Go to **My League Team** in the sidebar, then **Free Agency** (or **Dashboard → Free Agency**).
2. You’ll see:
   - **Free agency pool** — Pokémon not on any roster (or scheduled to be dropped). Available Pokémon are shown normally; claimed or rostered ones may be grayed out or marked “Rostered” / “Scheduled.”
   - **Submit add/drop** — Pick the Pokémon you’re **dropping** and the one you’re **adding**. The app checks your **draft budget** (120 pts) and **transaction cap** (see below). If valid, the move is submitted as a **pending transaction**.
3. Your move does **not** apply immediately. It runs at **12:00 AM Monday EST** with all other trades and free agency moves. Until then, your **current week roster is unchanged**; the pool and “next week” view reflect scheduled changes.

**Transaction cap:** Each team has a **season limit of 10 transactions** (trades + free agency combined). The app will not let you submit if you don’t have enough remaining. Use the dashboard or Free Agency page to see how many you have left.

**In-app:** [Free Agency](/dashboard/free-agency) (or My League Team → Free Agency).

---

## 4. Tera Captains

**What it is:** Some Pokémon can be designated Tera Captains (using Tera budget). In trades they’re shown with a **gold/reverse highlight** so both sides see the impact.

**In the app:**

- When you **make or view a trade**, any Tera Captain in the offer or request is clearly marked (e.g. gold background or badge).
- After a trade is **approved**, the receiving coach has a **48-hour Tera assignment window** to assign Tera types (if applicable). You may get a Discord or in-app reminder for this window; the roster and trade details will indicate when Tera must be set.
- **Dropping a Tera Captain:** Tera Captains can be dropped. If you drop one and add another in the same transaction, it counts as **1 transaction**. If you add a non-Tera Pokémon and later promote them to Tera Captain, that’s **1 for the add + 3 for Tera** (1 per Tera type, up to 3).

**In-app:** Trade Block and Trade Offer modals; My League Team **Roster** (where Tera status is shown).

---

## 5. When Do Trades and Free Agency Execute? (12:00 AM Monday EST)

**Rule:** All trades and free agency moves run at **12:00 AM Monday Eastern**. Nothing changes rosters “live.”

- **During the week:** You submit trades and add/drops; they appear as **pending** or **scheduled**.
- **At midnight Monday:** A system job runs and applies all approved/scheduled transactions. After that, **current week** becomes the new week and rosters reflect the new state.
- **Why:** So every team has the same deadline and no one gets an advantage by timing. The **current week’s roster is locked** until that run.

You’ll see “Scheduled” or “Pending” in the app and (if configured) a Discord summary after the run.

---

## 6. Weekly Roster View (Current vs Future Weeks)

**What it is:** Your roster can change after trades/FA run. The app uses **weekly roster snapshots** so the “current week” is locked and “future weeks” can show scheduled changes.

**How to use it:**

1. Go to **My League Team → Roster** (or the league team roster page).
2. Use the **week selector** to choose a week.
   - **Current week** — Shows the locked roster for this week (no mid-week changes).
   - **Future weeks** — Reflect scheduled trades and free agency that run on or before that week’s Monday midnight.
3. This lets you **prep for next week** knowing that your opponent’s roster (and yours) may update only at the Monday boundary.

**In-app:** [My League Team → Roster](/dashboard/league-team/roster) (with week selector).

---

## 7. Draft Budget and Tera Budget

- **Draft budget:** 120 points per team. When you add a Pokémon (draft or free agency), their point value is deducted from this budget. The app enforces this at submission; you can’t submit if the move would exceed 120.
- **Tera budget:** 15 points for Tera Captains. A Pokémon that costs 8 draft points and is named a Tera Captain uses **8 from draft** and **8 from Tera** (not 16 from draft). Both budgets are shown where relevant (roster, trade modal, free agency).

---

## 8. Post-Draft Grace Period (First 5 Days)

For **Monday–Friday** right after the draft, teams can add, drop, and promote/demote Tera Captains more freely (within draft and Tera budgets). Transaction cap still applies over the season; the grace period only relaxes *when* you can make certain moves. After that window, normal rules and the midnight Monday execution apply.

---

## 9. Quick Reference — Where to Find Everything

| Feature | Where in the app |
|--------|-------------------|
| Trade Block (yours + league) | [Trade Block](/dashboard/trade-block) or My League Team → Trade Block |
| Make / respond to trade offers | [Trade Block](/dashboard/trade-block) page; [Dashboard](/dashboard) (“trade offer(s) to respond to”) |
| Commissioner approve/deny trades | [Admin → Trades](/admin/trades) |
| Free Agency (pool + add/drop) | [Free Agency](/dashboard/free-agency) or My League Team → Free Agency |
| Roster by week | **My League Team → Roster** (week selector) |
| Draft planning / draft board | [Draft](/dashboard/draft) |
| Weekly matches / schedule | **Dashboard → Weekly Matches** |
| Teams (Showdown, library, builder) | [Teams](/dashboard/teams) (My Teams, Library, Create, Upload, Builder) |
| Settings, theme, guides | **Dashboard → Settings** |
| Guides and references | [Settings → Guides](/dashboard/settings?tab=guides) |

---

## 10. References (Docs and Reports)

- **Dashboard guide** — In **Settings → Guides**: overview, sidebar, teams, league, draft, weekly matches.
- **Discord integration** — [DISCORD-SERVER-INTEGRATION-REPORT.md](./DISCORD-SERVER-INTEGRATION-REPORT.md): webhooks, bot commands, channel map.
- **Discord server map** — [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md): channel list and IDs.
- **Product spec (v3)** — [CHATGPT-V3-UPDATE.md](../CHATGPT-V3-UPDATE.md): league rules and transaction economy (for context; this guide is the user-facing “how to use” summary).
