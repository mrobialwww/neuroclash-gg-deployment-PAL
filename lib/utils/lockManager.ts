/**
 * In-memory lock store for battle room generation
 * Key: `${game_room_id}_${round_number}`
 * Value: { locked: boolean, timestamp: number, requestId: string }
 */
const locks = new Map<
    string,
    { locked: boolean; timestamp: number; requestId: string }
>();

export const lockManager = {
    /**
     * Try to acquire a lock for an operation
     * Returns true if lock was acquired, false if already locked
     */
    tryAcquireLock(
        lockKey: string,
        requestId: string,
        timeoutMs: number = 30000,
    ): { acquired: boolean; existingLock?: any } {
        const lock = locks.get(lockKey);
        const now = Date.now();

        // Check if lock is expired
        if (lock && now - lock.timestamp > timeoutMs) {
            console.log(
                `[LockManager][${requestId}] Lock expired for ${lockKey}, removing...`,
            );
            locks.delete(lockKey);
        }

        // Try to acquire lock
        const existingLock = locks.get(lockKey);
        if (!existingLock) {
            locks.set(lockKey, {
                locked: true,
                timestamp: now,
                requestId: requestId,
            });
            console.log(
                `[LockManager][${requestId}] ✅ Lock acquired for ${lockKey}`,
            );
            return { acquired: true };
        } else {
            console.log(
                `[LockManager][${requestId}] ⚠️ Lock already held for ${lockKey} by ${existingLock.requestId}`,
            );
            return { acquired: false, existingLock };
        }
    },

    /**
     * Release a lock for battle room generation
     */
    releaseLock(lockKey: string, requestId: string) {
        const lock = locks.get(lockKey);
        if (lock && lock.requestId === requestId) {
            locks.delete(lockKey);
            console.log(
                `[LockManager][${requestId}] 🔓 Lock released for ${lockKey}`,
            );
        }
    },
};
