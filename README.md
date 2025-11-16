# Last Chess.com Game

This Obsidian plugin lets you quickly pull your latest game from Chess.com and insert it directly into your daily note. Since everyone formats their notes differently, the plugin provides flexible templating options so you can display game data exactly the way you like it.

---

## Setup

Getting started is simple:

1. Enter your Chess.com username in the plugin settings.
2. Configure your preferred **date** and **time** formats.

Supported tokens:
`yyyy`, `MM`, `dd`, `HH`, `hh`, `mm`, `ss`, `a` (AM/PM)

---

## How to Use

Inside any note—typically a daily note—run one of the provided commands from the **Command Palette**. The plugin will fetch your most recent game of that type and insert the formatted result at your cursor.

Available commands:

* **Last Blitz played by…**
* **Last Rapid played by…**
* **Last Daily played by…**
* **Last Bullet played by…**
* **Last game played by… (any type)** — Inserts the most recent game regardless of format.

If you like following other players, you can also use:

* **Lookup user…** — Fetch and insert the latest game for any Chess.com username.

---

## Templates

The plugin supports two template types:

### **1. Default Template**

Used for *your own* games.
Format this however you prefer—most users won’t need their own name or Chess.com profile URL, since you already know who you are.

### **2. Lookup Template**

Used when reviewing *other players’* games.
This template includes all player-specific information so you can clearly see who played and how they performed.

---

Insert any handlebars from the list below into your template fields.
These will be replaced with real game data when the plugin inserts your game.

---

## Available Handlebars

### **Metadata**

* `{{rated}}` — "Rated" or "Unrated"
* `{{rules}}` — Game rules from Chess.com (e.g., “chess”)
* `{{start_date}}` — Game start date (using your date format)
* `{{end_date}}` — Game end date
* `{{start_time}}` — Start time (using your time format)
* `{{end_time}}` — End time
* `{{moves}}` — Number of full moves (best-effort PGN parsing)
* `{{time}}` — Duration

    * Daily → `"N days"`
    * Other → `HH:MM`
* `{{url}}` — Link to the game on Chess.com
* `{{game_type}}` — Bullet, Blitz, Rapid, or Daily

---

### **Player Data**

#### White

* `{{white}}` — Name
* `{{white_url}}` — Profile URL
* `{{white_rating}}` — Rating at end of game
* `{{white_result}}` — Result (Won/Lost/Drew)

#### Black

* `{{black}}` — Name
* `{{black_url}}` — Profile URL
* `{{black_rating}}` — Rating at end of game
* `{{black_result}}` — Result (Won/Lost/Drew)

---

### **Winner / Loser**

* `{{winner}}`, `{{winner_url}}`, `{{winner_rating}}`
* `{{loser}}`, `{{loser_url}}`, `{{loser_rating}}`

---

### **Focus vs. Foe**

*(Helpful when inserting your own games or when looking up another user)*

* **Focus** (the player you’re requesting—yourself or a lookup username):
  `{{focus}}`, `{{focus_url}}`, `{{focus_rating}}`, `{{focus_result}}`

* **Foe** (the opponent of `focus`):
  `{{foe}}`, `{{foe_url}}`, `{{foe_rating}}`, `{{foe_result}}`

---

### **Rating Delta**

* `{{rating_change}}` — Rating change for `focus` since their previous game of the same `{{game_type}}`.
  Example: `+12`, `-5`, `0`
  If unavailable → `N/A`

---

## Examples

### Default template example (your own latest game)

```
- {{end_date}} - [{{focus_result}} a {{game_type}} game]({{url}}) against [{{foe}}]({{foe_url}})<sup>{{foe_rating}}</sup> rating is now {{rating_change}}/{{focus_rating}}
```

### Lookup template example (another player's game)

```
- {{end_date}} - [{{white}}]({{white_url}}) ({{white_result}}) vs [{{black}}]({{black_url}}) ({{black_result}}) in {{moves}} moves
```

