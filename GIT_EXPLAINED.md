# Git, explained

A crash course for anyone joining this repo who hasn't used git before.
The goal: enough mental model that you understand what's happening,
then **let Claude Code do the actual typing.**

> **The big idea:** you don't need to memorise git commands. You need
> to know what each step is *for*, so when you tell Claude *"make a
> new branch for the spacing fix"* you can tell whether the thing it
> did was the right thing.
>
> Throughout this guide, the **"Ask Claude"** lines are the primary
> thing to look at. The commands underneath are just so you can sanity-check what
> Claude is doing, and so you know what to expect on screen.

---

## 1. Mental model (5 sentences)

- **A repo** is a folder of code plus a complete history of every change
  ever made to it. This repo lives on GitLab; you'll have a copy on
  your laptop.
- **A branch** is a parallel "sandbox" copy of the code. Sandbox just means
  you can play around with it freely without directly messing up the real
  codebase. You make changes on your own branch so you don't disturb
  `main` (the canonical version).
- **A commit** is a saved snapshot of your changes with a short message
  explaining what you did. Commits live on branches.
- **Push** means uploading your branch to GitLab so others can see it.
  **Pull** means downloading new changes from GitLab.
- **Merge** means folding your branch's changes back into `main`,
  usually via a **Merge Request** (MR) so someone reviews them first.

That's it. Everything else is variations on those five ideas.

---

## 2. One-time setup

You only do this once per machine.

> **Ask Claude:**
> *"Clone the rcloud-prototype repo from GitLab
> (https://gitlab.com/your-group/rcloud-prototype)
> into my current folder, install its dependencies, and set my git name
> to "Your Name" and email to your.email@rapsodo.com."*

What Claude will run, roughly:

```bash
git clone https://gitlab.com/your-group/rcloud-prototype.git
cd rcloud-prototype
npm install
git config --global user.name "Your Name"
git config --global user.email "your.email@rapsodo.com"
```

---

## 3. The workflow you'll do every time

Every change, even a one-line tweak, follows the same six steps.
**At each step, just ask Claude.**

### Step 1: Start from a fresh `main`

> **Ask Claude:** *"Get me onto main with the latest from GitLab, and
> let me know if I need to install anything new."*

> **What's happening:** Claude switches you to the `main` branch,
> downloads any new changes others have pushed, and tells you if any
> new bits of code came along that need installing. If they did, just
> say yes when Claude offers to install them. Skipping this step is
> the #1 cause of messy merges, so always start here.

What Claude runs:
```bash
git checkout main
git pull
```

### Step 2: Make a branch for your change

Branch names on this repo should follow the pattern **`your-name/short-description`**.
For example, `alex/fix-spelling` or `jordan/new-hero-card`. The name
prefix tells everyone whose branch it is at a glance.

> **Ask Claude:** *"Create a new branch called yourname/short-description
> and switch to it."* (replace with your actual name and description)

> **What's happening:** Claude makes a new sandbox branch off `main`
> and switches you onto it. Keep the description short and kebab-case
> (lowercase-with-hyphens).

What Claude runs:
```bash
git checkout -b jordan/update-copy
```

### Step 3: Make your changes

This is the fun bit, just describe what you want to Claude, or edit
files directly. Nothing git-related yet, git is only watching.

> **Ask Claude:** *"Show me what I've changed since I branched off main."*

> **What's happening:** Claude lists which files have changed and
> shows you exactly what's different inside them, so you can confirm
> nothing crept in by accident.

What Claude runs:
```bash
git status
git diff
```

### Step 4: See your change running

> **Ask Claude:** *"Start the dev server so I can see my changes in
> the browser."*

> **What's happening:** Claude starts up a local version of the site
> on your laptop and gives you a link (usually `http://localhost:3000`)
> to open in your browser. As you edit files, the browser refreshes
> automatically so you can see your changes live. When you're done,
> tell Claude to stop the server. **Always look at your change in the
> browser before committing**, if it doesn't look the way you expect,
> fix it before moving on.

What Claude runs:
```bash
npm run dev
```

### Step 5: Save a snapshot (commit)

> **Ask Claude:** *"Stage everything I changed and commit it with a
> succinct, sensible message."*

> **What's happening:** Claude bundles your changes into a labelled
> snapshot stored locally. The message should finish the sentence
> *"This commit will…"*, e.g. *"Fix typo on home page"*, not
> *"typo"*. Claude will usually write a good message; tweak it if
> not.

What Claude runs:
```bash
git add .
git commit -m "Fix typo on home page"
```

### Step 6: Push your branch to GitLab

> **Ask Claude:** *"Push my branch to GitLab and give me the merge
> request link."*

> **What's happening:** Claude uploads your branch to GitLab so others
> can see it. GitLab prints a URL, that's your **Merge Request**
> page. **Click it.**

What Claude runs:
```bash
git push -u origin yourname/fix-spelling
```

### Step 7: Open a Merge Request, get a review, merge

On the MR page in GitLab.com:

1. Give it a title and short description (*what* you changed and *why*).
2. Assign a reviewer (the repo owner).
3. Wait for approval, they may leave comments asking for tweaks.
4. To address any comments: edit locally, then **just ask Claude**:
   *"Commit my latest changes and push them to the same branch."*
   New commits automatically appear on the same MR.
5. Once approved, click **Merge** on GitLab.

> **What's happening:** the MR is a conversation about your change
> before it joins `main`. Reviewing catches issues; merging is the
> final "this is good, ship it."

---

## 4. When something looks weird

> **Ask Claude:** *"Explain what just happened in plain English."*

This is the single most useful thing you can ask. A 30-second
explanation now saves a tangled mess later.

Other unstuck-me phrasings that work well:

- *"I'm lost, what branch am I on and what state is my repo in?"*
- *"I switched branches and lost my changes, can you find them?"*
- *"Something broke after the last command. Walk me through what
  happened and how to undo it."*

---

## 5. The three things to never do

1. **Never let Claude `git push --force` to `main`.** That can
   overwrite other people's work permanently. If Claude ever asks to
   force-push to `main`, say **no** and ask it to explain why.
2. **Never commit secrets**, passwords, API keys, `.env` files. If
   you accidentally do, tell the repo owner immediately; we'll need to rotate
   the secret.
3. **Never `rm -rf` anything git-related** (`.git/`, `node_modules`,
   the repo folder) without asking Claude to explain first.

When in doubt: **stop, don't type anything, and ask Claude *"is this
safe?"*.** Git makes recoverable mistakes recoverable, but only if
you don't pile more commands on top.

---

## 6. Using Claude Code well

**a. Tell Claude what you want, not the command.**

| Don't say | Do say |
|---|---|
| *"Run git checkout -b…"* | *"Make me a new branch for fixing the header spacing."* |
| *"Run git stash pop…"* | *"I switched branches and lost my changes, can you find them?"* |
| *"Run git rebase…"* | *"My branch is behind main, catch it up."* |

**b. Before Claude runs anything that pushes, force-pushes, or
deletes, it'll ask permission.** Read the command. If you don't
understand it, say *"explain that first"*. Never click yes on autopilot.

**c. If you're confused, say *"explain what just happened"* before
moving on.**

---

## 7. The cheat sheet

If you'd rather type, here's the full sequence, but honestly, just
asking Claude *"do the usual workflow to push a branch called X"*
gets you the same place.

```bash
# Start of day, get the latest
git checkout main && git pull

# Start a new piece of work
git checkout -b your-name/what-it-is

# See what you've changed
git status
git diff

# See it in the browser (Ctrl+C to stop)
npm run dev

# Save a snapshot
git add .
git commit -m "Sensible message"

# Upload to GitLab
git push -u origin your-name/what-it-is

# Switch back to main and clean up after a merge
git checkout main && git pull
git branch -d your-name/what-it-is
```

That's 90% of git. Welcome aboard.
