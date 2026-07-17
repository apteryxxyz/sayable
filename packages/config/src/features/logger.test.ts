import { afterEach, describe, expect, it, vi } from 'vitest';
import Logger, { useLogger } from './logger.js';

afterEach(() => vi.restoreAllMocks());

describe('Logger', () => {
  it('writes through log/info/warn/error/success/header by default', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger();
    logger.log('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    logger.success('e');
    logger.header('f');
    expect(spy).toHaveBeenCalledTimes(6);
  });

  it('stays silent when quiet', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    new Logger({ quiet: true }).info('nope');
    expect(spy).not.toHaveBeenCalled();
  });

  it('only logs step() when verbose', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    new Logger().step('quiet step');
    expect(spy).not.toHaveBeenCalled();
    new Logger({ verbose: true }).step('loud step');
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe('useLogger', () => {
  it('returns the ambient logger when called with no arguments', () => {
    expect(useLogger()).toBeInstanceOf(Logger);
  });

  it('installs and returns a new logger when given options', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = useLogger({ quiet: true });
    expect(logger).toBeInstanceOf(Logger);
    // The installed logger becomes the ambient one.
    expect(useLogger()).toBe(logger);
    logger.info('x');
    expect(spy).not.toHaveBeenCalled();
  });
});
