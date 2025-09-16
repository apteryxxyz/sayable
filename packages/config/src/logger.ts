// log.ts
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BRIGHT = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

export default {
  log: (msg: string) => console.log(msg),

  info: (msg: string) => console.log(`${BLUE}ℹ${RESET} ${msg}`),

  success: (msg: string) => console.log(`${GREEN}✔${RESET} ${msg}`),

  warn: (msg: string) => console.warn(`${YELLOW}⚠${RESET} ${msg}`),

  error: (msg: string) => console.error(`${RED}✖${RESET} ${msg}`),

  debug: (msg: string) =>
    console.debug(`${CYAN}🐛${RESET} ${DIM}${msg}${RESET}`),

  header: (msg: string) => console.log(`\n${BRIGHT}${msg}${RESET}`),

  step: (msg: string) => console.log(`${DIM}→ ${msg}${RESET}`),
};
