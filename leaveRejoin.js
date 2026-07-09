function randomMs(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
}

function setupLeaveRejoin(bot, createBot) {
    let jumpTimer = null
    let jumpOffTimer = null
    let reconnectTimer = null
    let reconnectAttempts = 0
    let reconnecting = false
    let manualDisconnect = false // true only when WE tell the bot to leave

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
        // Random jump every 20 seconds to 5 minutes
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
        manualDisconnect = false
        cleanup()
        console.log("[AFK] Connected.")
        scheduleNextJump()
    })

    bot.on("end", (reason) => {
        cleanup()
        if (manualDisconnect) {
            console.log("[AFK] Left intentionally, not reconnecting.")
            return
        }
        reconnect(`end:${reason}`)
    })

    bot.on("error", (err) => {
        console.log("[AFK] Error:", err.message)
    })

    bot.on("kicked", (reason) => {
        console.log("[AFK] Kicked:", reason)
        // "end" will fire right after this, and manualDisconnect is false,
        // so it will reconnect on its own. No need to call reconnect() here too.
    })

    // Call this from your own code whenever YOU want the bot to leave
    // on purpose (e.g. a !leave command). This guarantees no auto-rejoin.
    function leaveIntentionally(reason) {
        manualDisconnect = true
        cleanup()
        bot.quit(reason || "disconnect.quitting")
    }

    return { leaveIntentionally }
}

module.exports = setupLeaveRejoin
