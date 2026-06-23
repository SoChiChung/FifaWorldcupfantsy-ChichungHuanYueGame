/**
 * Promise pool with fixed concurrency and exponential backoff retry.
 *
 * @param {Array}        tasks       - Array of async functions (each callable and retryable)
 * @param {Object}       opts
 * @param {number}       opts.concurrency - Max concurrent tasks (default 8)
 * @param {number}       opts.retries     - Max retries per task (default 3)
 * @param {number[]}     opts.backoff     - Backoff delays in ms (default [1000, 2000, 4000])
 * @param {Function}     opts.onProgress  - Called after each task completes: (done, total)
 * @param {Function}     opts.onRetry     - Called on retry: (taskIndex, attempt, error)
 * @returns {Promise<Array>} results in original order; failed tasks are null
 */
async function pool(tasks, opts = {}) {
  const {
    concurrency = 8,
    retries = 3,
    backoff = [1000, 2000, 4000],
    onProgress,
    onRetry
  } = opts;

  const results = new Array(tasks.length).fill(null);
  let running = 0;
  let nextIndex = 0;
  let done = 0;

  return new Promise((resolve) => {
    function maybeReport() {
      if (onProgress) onProgress(done, tasks.length);
      if (done === tasks.length) resolve(results);
    }

    function run(index) {
      if (index >= tasks.length) return;

      running++;

      async function attempt(taskIndex, triesLeft) {
        try {
          results[taskIndex] = await tasks[taskIndex]();
        } catch (err) {
          const spent = retries - triesLeft + 1;
          if (triesLeft > 0) {
            if (onRetry) onRetry(taskIndex, spent, err);
            const delay = backoff[spent - 1] || backoff[backoff.length - 1];
            await new Promise(r => setTimeout(r, delay));
            return attempt(taskIndex, triesLeft - 1);
          }
          results[taskIndex] = null;
        }
      }

      attempt(index, retries).finally(() => {
        running--;
        done++;
        maybeReport();

        while (running < concurrency && nextIndex < tasks.length) {
          run(nextIndex++);
        }
      });
    }

    // Start initial batch
    while (running < concurrency && nextIndex < tasks.length) {
      run(nextIndex++);
    }

    if (tasks.length === 0) resolve([]);
  });
}

module.exports = { pool };
