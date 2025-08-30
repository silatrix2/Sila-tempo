const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function updateCommand(sock, chatId, message) {
    try {
        // Send initial update notification
        await sock.sendMessage(chatId, {
            text: "╔══════════════════════════╗\n" +
                  "║     🔄 *UPDATE SYSTEM*     ║\n" +
                  "╠══════════════════════════╣\n" +
                  "║ Starting update process...\n" +
                  "║ Please don't turn off the bot\n" +
                  "╚══════════════════════════╝",
            react: { text: '⏳', key: message.key }
        });

        // Step 1: Get latest code from GitHub
        await sock.sendMessage(chatId, {
            text: "⬇️ *STEP 1/4:* Downloading latest code..."
        });

        const gitPull = () => new Promise((resolve, reject) => {
            exec('git pull origin main', (error, stdout, stderr) => {
                if (error) reject(`Git pull failed: ${error.message}`);
                resolve(stdout);
            });
        });

        const pullOutput = await gitPull();
        console.log('[UPDATE] Git pull output:', pullOutput);

        // Step 2: Install dependencies
        await sock.sendMessage(chatId, {
            text: "📦 *STEP 2/4:* Installing dependencies..."
        });

        const installDeps = () => new Promise((resolve, reject) => {
            exec('npm install', (error, stdout, stderr) => {
                if (error) reject(`Dependency install failed: ${error.message}`);
                resolve(stdout);
            });
        });

        const installOutput = await installDeps();
        console.log('[UPDATE] NPM install output:', installOutput);

        // Step 3: Get update information
        await sock.sendMessage(chatId, {
            text: "ℹ️ *STEP 3/4:* Fetching update details..."
        });

        const getUpdateInfo = async () => {
            try {
                const response = await axios.get(
                    'https://api.github.com/repos/AiOfLautech/God-s-Zeal-Xmd/commits?per_page=1'
                );
                
                if (response.data && response.data[0]) {
                    const commit = response.data[0];
                    return {
                        message: commit.commit.message,
                        author: commit.commit.author.name,
                        date: new Date(commit.commit.author.date).toLocaleString(),
                        url: commit.html_url
                    };
                }
                return null;
            } catch (error) {
                console.error('Update info error:', error);
                return null;
            }
        };

        const updateInfo = await getUpdateInfo();

        // Step 4: Prepare restart
        await sock.sendMessage(chatId, {
            text: "🚀 *STEP 4/4:* Preparing to restart...\n" +
                  "The bot will restart automatically",
            react: { text: '⚠️', key: message.key }
        });

        // Create restart script
        const restartScript = `
        #!/bin/bash
        echo "Restarting bot..."
        sleep 2
        # Add your restart command here (pm2, node, etc)
        # Example: pm2 restart your-bot-name
        node index.js
        npm start
        `;

        const scriptPath = path.join(__dirname, 'restart-bot.sh');
        fs.writeFileSync(scriptPath, restartScript);
        fs.chmodSync(scriptPath, '755');  // Make executable

        // Create update report
        const updateReport = 
            "╔══════════════════════════════╗\n" +
            "║      ✅ *UPDATE COMPLETE*      ║\n" +
            "╠══════════════════════════════╣\n" +
            (updateInfo ? 
            `║ *Commit:* ${updateInfo.message.split('\n')[0]}\n` +
            `║ *Author:* ${updateInfo.author}\n` +
            `║ *Date:* ${updateInfo.date}\n` +
            `║ *Link:* ${updateInfo.url}\n` : 
            "║ Latest updates installed\n") +
            "╠══════════════════════════════╣\n" +
            "║ Bot restarting now...\n" +
            "║ Should be back in 10 seconds\n" +
            "╚══════════════════════════════╝";

        await sock.sendMessage(chatId, { text: updateReport });

        // Execute restart script (asynchronous)
        exec(`sh ${scriptPath}`, (error) => {
            if (error) {
                console.error('Restart failed:', error);
            } else {
                console.log('Bot restart initiated');
                process.exit(0); // Ensure process exits
            }
        });

        // Wait a moment before exiting
        setTimeout(() => process.exit(0), 3000);

    } catch (error) {
        console.error('Update Command Error:', error);
        
        const errorBox = 
            "╔══════════════════════════════╗\n" +
            "║      ❌ *UPDATE FAILED*        ║\n" +
            "╠══════════════════════════════╣\n" +
            "║ Error: " + error.message.slice(0, 50) + "\n" +
            "║ \n" +
            "║ Possible solutions:\n" +
            "║ 1. Check git permissions\n" +
            "║ 2. Verify network connection\n" +
            "║ 3. Update manually\n" +
            "╚══════════════════════════════╝";

        await sock.sendMessage(chatId, {
            text: errorBox,
            react: { text: '❌', key: message.key }
        });
    }
}

module.exports = updateCommand;
