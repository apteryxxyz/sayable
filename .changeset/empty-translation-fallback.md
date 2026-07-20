---
"@saykit/config": patch
---

Keep the fallback string when a locale reports a key as entirely empty.

Catalogue formats with a single value slot per key — JSON, unlike PO's separate `msgid`/`msgstr` — surface an untranslated key as an empty message *and* an empty translation. Record assembly wrote that empty value over the string already resolved from a less specific locale, so an untranslated JSON locale shipped blank strings instead of falling back to the source. Empty values are now skipped.
