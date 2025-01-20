const express = require("express");
const Logger = require("../Logger");
const os = require("os");
const spawn = require("child_process").spawn;
const Tools = require("../utils/Tools");

class SystemRouter {
    /**
     *
     * @param {object} options
     */
    constructor(options) {
        this.router = express.Router({mergeParams: true});

        this.initRoutes();
    }


    initRoutes() {
        this.router.get("/host/info", async (req, res) => {
            const systemStats = await Tools.GET_SYSTEM_STATS();

            res.json({
                hostname: os.hostname(),
                arch: os.arch(),
                uptime: Math.floor(os.uptime()),
                ...systemStats,
            });
        });

        this.router.get("/runtime/info", (req, res) => {
            res.json({
                uptime: Math.floor(process.uptime()),
                argv: process.argv,
                execArgv: process.execArgv,
                execPath: process.execPath,
                uid: typeof process.getuid === "function" ? process.geteuid() : -1,
                gid: typeof process.getegid === "function" ? process.getegid() : -1,
                pid: process.pid,
                versions: process.versions,
                env: process.env
            });
        });

        this.router.get("/play/:format/:filename", (req, res) => {
            const format = req.params.format.replace(/[^a-zA-Z0-9_-]/g, "");

            let command;
            if (format === "wav") {
                command = "aplay";
            } else if (format === "ogg") {
                command = "ogg123";
            } else {
                return res.status(400).send("Unsupported audio format");
            }

            const filename = req.params.filename.replace(/[^a-zA-Z0-9_-]/g, "");
            const filepath = `/data/audio/${filename}.wav`;

            const player = spawn(command, ["-q", filepath]);

            const timer = setTimeout(() => {
                player.removeAllListeners("close");
                
                Logger.info("Playing audio file:", filepath);
                res.sendStatus(200);
            }, 500);

            player.on("error", (err) => {
                Logger.error("Error playing audio:", err);
                res.status(500).send(err.toString());
            });

            player.on("close", (code) => {
                clearTimeout(timer);
                

                if (code === 0) {
                    Logger.info("Played audio file:", filepath);
                    res.sendStatus(200);
                    
                } else {
                    Logger.error("Error playing audio:", code);
                    res.status(500).send(code.toString());
                }
                
            });
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = SystemRouter;
