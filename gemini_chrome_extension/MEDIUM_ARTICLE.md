# I Built a Chrome Extension That Lets You Chat With Any Webpage Using Google's Gemini AI

## It takes 5 seconds to get a summary of any article. Here's how I built it in a weekend.

---

Have you ever been 10 minutes into a long article and thought — *"I just want someone to tell me what this says"?*

Or you're reading something technical, and you wish you could just highlight a paragraph and ask, *"What does this actually mean?"*

That's the problem I set out to solve. And the result is **GeminiPage** — a Chrome extension that puts a Google Gemini AI assistant right inside your browser, on any webpage you visit.

No copy-pasting. No switching tabs. No losing your place.

---

## What It Looks Like

When you install GeminiPage, a small glowing **✦** button appears on the right edge of every webpage you visit.

Click it — or press **Ctrl+Shift+G** — and a sleek dark-mode panel slides in from the right side of the screen. It's already read the page. It's already ready to talk about it.

From there, you have five one-click actions at the top:

- **📄 Summarize** — get the entire page in 4–5 sentences
- **🎯 Key Points** — the most important bullet points, extracted instantly
- **✨ Simplify** — explain it like I'm not an expert
- **🔍 Critique** — what's strong, what's weak, what's missing
- **❓ Quiz Me** — 5 questions to test if you actually understood it

Or just type your own question. *"What is the author's main argument?"* *"Are there any numbers I should know?"* *"How does this connect to what I already know about machine learning?"*

The answers stream in word by word — exactly like ChatGPT — powered by **Google Gemini Flash 2.0**.

---

## The Right-Click Trick

My favourite feature is the simplest one.

Highlight any text on the page. Right-click. You'll see **"Ask Gemini about this"** in the menu.

Click it. The panel opens. Gemini explains exactly what you highlighted — in context, with depth, instantly.

I've used this more than any other feature. Reading a paper and hit an unfamiliar term? Highlight it. Found a claim you're skeptical of? Highlight it. Want a simpler explanation of one paragraph without summarizing the whole article? Highlight it.

---

## Why I Built It This Way

There are already AI tools for reading the web. Most of them send you *away* from the page — to a chat interface, a new tab, a separate app.

I had one rule when building this:

> **You should never have to leave the page to understand the page.**

That one constraint shaped everything. The floating panel (not a new tab). The keyboard shortcut (not just a toolbar button). The right-click menu (the fastest possible interaction). The streaming responses (no waiting, no loading spinners).

Every design decision comes back to: *how do we make this feel like the page just got smarter?*

---

## How It Works (Without the Jargon)

You don't need to know how it's built to use it. But if you're curious:

When you open the panel, the extension quietly reads the text content of the page — stripping out ads, navigation menus, and footers to get just the actual content. It then sends that text, along with your question, to Google's Gemini Flash 2.0 API.

Gemini Flash 2.0 is Google's fastest AI model — designed specifically for real-time, low-latency responses. The response doesn't wait to fully generate before showing up. It streams back character by character, which is why it feels so instant.

The extension remembers your conversation too. So if you ask *"summarize this"* and then follow up with *"what's the author's background?"*, it understands the context. It's a real back-and-forth, not a one-shot query.

---

## Setting It Up (Takes 3 Minutes)

**1. Load the extension**
Download the source code, open `chrome://extensions/` in Chrome, turn on Developer Mode, and click "Load unpacked." Select the folder. Done.

**2. Get a free API key**
Go to [Google AI Studio](https://aistudio.google.com/app/apikey) — it's free to sign up. Create an API key and copy it.

**3. Paste it in**
Click the GeminiPage icon in your Chrome toolbar, paste the key, save. That's it.

Visit any webpage. Press `Ctrl+Shift+G`. Start asking questions.

---

## What I Learned Building This

This was my first Chrome extension with a live AI integration, and a few things surprised me.

**The hardest part wasn't the AI.** Google's Gemini API is actually very clean to work with. The hard part was understanding how Chrome extensions work — they run in three separate isolated environments that can only talk to each other through messages. Once that clicked, everything else made sense.

**Streaming responses change everything.** I almost shipped a version without streaming — where it waits for the full answer and shows it all at once. The difference in *feel* is enormous. Streaming makes the same response feel twice as fast, even when it isn't.

**Reading a webpage is messier than it sounds.** A basic grab of all the text on a page gives you navigation menus, cookie banners, footer disclaimers, and ad copy mixed in with the actual content. I had to write logic to strip all of that out and find just the real article text. Websites are noisy.

---

## What's Next

A few things I want to add:

- **Save conversations** as notes you can export
- **PDF support** — analyze a PDF you have open in Chrome
- **Compare two pages** — "how does this article differ from the one I read earlier?"
- **Voice input** — ask your question out loud

---

## Try It Yourself

The full source code is on GitHub. It's about 500 lines of vanilla JavaScript — no frameworks, no build tools, just files you drop into a folder and load.

If you're learning about AI, browser extensions, or just want to see how these tools are built under the hood — the code is a good read. Everything is commented and structured to be easy to follow.

---

*Built as part of the EAG v3 (Emerging AI and GenAI) course — a program exploring how to build real, useful AI applications from scratch.*

*Tags: `AI` `Chrome Extension` `Google Gemini` `Productivity` `Browser Tools` `Side Project`*
