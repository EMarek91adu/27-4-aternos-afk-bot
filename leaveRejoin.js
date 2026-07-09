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

        cleanup()

        console.log("[AFK] Connected.")
        scheduleNextJump()
    })

    bot.on("end", () => {
        reconnect("end")
    })

    bot.on("error", (err) => {
        console.log("[AFK] Error:", err.message)
    })

    bot.on("kicked", (reason) => {
        console.log("[AFK] Kicked:", reason)
        reconnect("kicked")
    })
}

module.exports = setupLeaveRejoin
