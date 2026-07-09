function randomMs(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
}

function setupLeaveRejoin(bot, createBot) {
    let jumpTimer = null
    let jumpOffTimer = null
    let reconnectTimer = null
    let reconnectAttempts = 0
    let reconnecting = false

    function cleanup() {
        if (jumpTimer) clearTimeout(jumpTimer)
        if (jumpOffTimer) clearTimeout(jumpOffTimer)
        if (reconnectTimer) clearTimeout(reconnectTimer)
        jumpTimer = null
        jumpOffTimer = null
        reconnectTimer = null
    }

    function scheduleNextJump() {
        if (!bot.entity) return
        bot.setControlState("jump", true)
        jumpOffTimer = setTimeout(() => {
            bot.setControlState("jump", false)
        }, 300)
        jumpTimer = setTimeout(scheduleNextJump, randomMs(20000, 300000))
    }

    function reconnect(reason) {
        if (reconnecting) return
        reconnecting = true
        cleanup()
        reconnectAttempts++
        let delay = randomMs(2000, 10000)
        if (reconnectAttempts > 3)
            delay += 5000
        delay = Math.min(delay, 15000)
        console.log(`[AFK] Disconnected (${reason}), reconnecting in ${Math.round(delay / 1000)}s...`)
        reconnectTimer = setTimeout(() => {
            reconnecting = false
            try {
                createBot()
            } catch (err) {
                console.log("[AFK] createBot error:", err)
                reconnect("createBot-error")
            }
        }, delay)
    }

    bot.once("spawn", () => {
        reconnectAttempts = 0
        reconnecting = false
        cleanup()
        console.log("[AFK] Connected.")
        scheduleNextJump()
    })

    // ANY end event (kick, disconnect, crash, network drop) -> always reconnect.
    // There is no code path in this module that ever calls bot.quit()/bot.end(),
    // so the bot can never leave the server on its own.
    bot.on("end", (reason) => {
        cleanup()
        reconnect(`end:${reason}`)
    })

    bot.on("error", (err) => {
        console.log("[AFK] Error:", err.message)
    })

    bot.on("kicked", (reason) => {
        console.log("[AFK] Kicked:", reason)
        // "end" fires right after this and handles reconnect — no need to duplicate here
    })
}

module.exports = setupLeaveRejoin
