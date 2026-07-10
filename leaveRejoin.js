function randomMs(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
}
function setupLeaveRejoin(bot, createBot) {
    // Timers
    let jumpTimer = null
    let jumpOffTimer = null
    let reconnectTimer = null
    // State
    let stopped = false
    let reconnectAttempts = 0
    let lastLogAt = 0
    function logThrottled(msg, minGapMs = 2000) {
        const now = Date.now()
        if (now - lastLogAt >= minGapMs) {
            lastLogAt = now
            console.log(msg)
        }
    }
    function cleanup() {
        stopped = true
        if (jumpTimer) clearTimeout(jumpTimer)
        if (jumpOffTimer) clearTimeout(jumpOffTimer)
        if (reconnectTimer) clearTimeout(reconnectTimer)
        jumpTimer = jumpOffTimer = reconnectTimer = null
    }
    function scheduleNextJump() {
        if (stopped || !bot.entity) return
        bot.setControlState('jump', true)
        jumpOffTimer = setTimeout(() => {
            bot.setControlState('jump', false)
        }, 300)
        // random jump 20s -> 5m
        const nextJump = randomMs(20000, 5 * 60 * 1000)
        jumpTimer = setTimeout(scheduleNextJump, nextJump)
    }
    function scheduleReconnect(reason = 'end') {
        if (stopped) return
        // FAST RECONNECT: 2s -> 10s
        let delay = randomMs(2000, 10000)
        reconnectAttempts++
        if (reconnectAttempts > 3) {
            delay += 5000
        }
        delay = Math.min(delay, 15000)
        logThrottled(`[AFK] Rejoin scheduled in ${Math.round(delay / 1000)}s (reason: ${reason}, attempt: ${reconnectAttempts})`)
        reconnectTimer = setTimeout(() => {
            if (stopped) return
            try {
                if (typeof createBot === 'function') createBot()
            } catch (e) {
                console.log('[AFK] createBot error:', e?.message || e)
                scheduleReconnect('createBot-error')
            }
        }, delay)
    }
    bot.once('spawn', () => {
        // reset attempt counter on successful connect
        reconnectAttempts = 0
        // clear any old timers
        cleanup()
        stopped = false
        scheduleNextJump()
    })
    // Connection ended, kicked, or errored — this is the only time we rejoin.
    bot.on('end', () => {
        cleanup()
        scheduleReconnect('end')
    })
    bot.on('kicked', (reason) => {
        cleanup()
        scheduleReconnect('kicked')
    })
    bot.on('error', (err) => {
        cleanup()
        scheduleReconnect('error')
    })
}
module.exports = setupLeaveRejoin
