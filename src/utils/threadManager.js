const { logger } = require("./logger");

const activeThreads = new Map();
const userCooldown = new Map();

const THREAD_COOLDOWN_MS = 30 * 1000;
const THREAD_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupWorker = null;

function canCreateThread(userId) {
  const session = activeThreads.get(userId);
  if (session) {
    return false;
  }

  const now = Date.now();
  const lastCreatedAt = userCooldown.get(userId) || 0;
  return now - lastCreatedAt >= THREAD_COOLDOWN_MS;
}

function getCooldownRemainingMs(userId) {
  const lastCreatedAt = userCooldown.get(userId) || 0;
  const elapsed = Date.now() - lastCreatedAt;
  return Math.max(0, THREAD_COOLDOWN_MS - elapsed);
}

function setActiveThread(userId, threadId) {
  const now = Date.now();

  activeThreads.set(userId, {
    threadId,
    lastActive: now
  });

  userCooldown.set(userId, now);
}

function getActiveThread(userId) {
  return activeThreads.get(userId) || null;
}

function updateActivity(userId) {
  const session = activeThreads.get(userId);
  if (!session) {
    return;
  }

  session.lastActive = Date.now();
}

function removeThread(userId) {
  activeThreads.delete(userId);
}

function removeThreadById(threadId) {
  for (const [userId, session] of activeThreads.entries()) {
    if (session.threadId === threadId) {
      activeThreads.delete(userId);
      return;
    }
  }
}

async function cleanupInactiveThreads(client) {
  if (cleanupWorker) {
    return cleanupWorker;
  }

  cleanupWorker = setInterval(async () => {
    const now = Date.now();

    for (const [userId, session] of activeThreads.entries()) {
      if (now - session.lastActive < THREAD_INACTIVITY_TIMEOUT_MS) {
        continue;
      }

      try {
        const thread = await client.channels.fetch(session.threadId);

        if (thread?.isThread() && !thread.archived) {
          await thread.setArchived(true, "Auto-archived due to inactivity.");
          logger.info("Archived inactive thread", {
            userId,
            threadId: session.threadId
          });
        }
      } catch (error) {
        logger.warn("Failed to archive inactive thread", {
          userId,
          threadId: session.threadId,
          error: error.message
        });
      }

      activeThreads.delete(userId);
    }
  }, CLEANUP_INTERVAL_MS);

  if (typeof cleanupWorker.unref === "function") {
    cleanupWorker.unref();
  }

  logger.info("Started thread cleanup worker", {
    intervalMs: CLEANUP_INTERVAL_MS,
    inactivityTimeoutMs: THREAD_INACTIVITY_TIMEOUT_MS
  });

  return cleanupWorker;
}

module.exports = {
  canCreateThread,
  getCooldownRemainingMs,
  setActiveThread,
  getActiveThread,
  updateActivity,
  removeThread,
  removeThreadById,
  cleanupInactiveThreads
};
