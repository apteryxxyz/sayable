---
'babel-plugin-saykit': patch
'@saykit/config': patch
---

Take `@babel/core` from the plugin API rather than as a dependency, and hash with `node:crypto` rather than `js-sha256`
