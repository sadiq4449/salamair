You are a senior frontend engineer.

STRICT RULES (MUST FOLLOW):

* DO NOT change layout structure
* DO NOT move elements
* DO NOT rename components
* DO NOT modify logic, APIs, or functionality
* DO NOT remove anything
* DO NOT add new sections
* ONLY modify styling (CSS / Tailwind classes)

If any change affects structure or behavior → DO NOT DO IT.

Goal:
Make the UI look like a professional airline business dashboard inspired by SalamAir branding.
Current app works perfectly — only improve visual appearance.

---

1. GLOBAL STYLING (apply everywhere)

* Background: #F8FAFB

* Text: #1F2937

* Primary color: #00A99D

* Secondary: #003B3F

* Borders: #E5E7EB

* Use consistent spacing:

  * padding: p-4 or p-6
  * gap between elements

---

2. CARDS (IMPORTANT)

For all containers/sections:

* bg-white
* rounded-xl
* shadow-sm
* p-5 or p-6
* border border-gray-100

DO NOT change structure — only wrap visually if already a container.

---

3. TABLES

Improve existing tables ONLY with styling:

* Add: w-full bg-white rounded-xl overflow-hidden
* Header:

  * bg-gray-50
  * text-gray-600
  * text-sm font-semibold
* Rows:

  * border-b border-gray-100
  * hover:bg-gray-50
* Cells:

  * px-4 py-3

Add status badge styles (where status already exists):

* Confirmed → bg-green-100 text-green-700
* Pending → bg-yellow-100 text-yellow-700
* Cancelled → bg-red-100 text-red-700

---

4. BUTTONS

Style existing buttons ONLY:

Primary:

* bg-[#00A99D]
* text-white
* rounded-lg
* px-4 py-2
* hover:bg-[#009688]
* transition-all duration-200

Secondary:

* border border-gray-300
* text-gray-700
* rounded-lg
* hover:bg-gray-100

---

5. SIDEBAR (NO CHANGE IN ITEMS)

Only improve look:

* Add spacing between items
* Add hover:
  hover:bg-gray-100
* Active item:
  bg-[#00A99D]/10
  text-[#00A99D]
* Add rounded-lg to items

---

6. TOPBAR

* Add spacing (px-6 py-3)
* Input fields:
  border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00A99D]
* Align items properly

---

7. TYPOGRAPHY

* Titles:
  text-xl font-semibold text-gray-800
* Subtext:
  text-sm text-gray-500

---

8. MICRO-INTERACTIONS

* Add:
  transition-all duration-200
* Smooth hover on buttons, rows, sidebar

---

9. DO NOT:

* Do NOT refactor code structure
* Do NOT introduce new libraries
* Do NOT convert components
* Do NOT change layout

---

FINAL RESULT:

Same exact app.
Same layout.
Same functionality.

BUT:

* Clean
* Modern
* SalamAir-style colors
* Professional SaaS look (not developer UI)
