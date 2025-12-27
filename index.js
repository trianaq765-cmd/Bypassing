const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
const express = require('express');

// ═══════════════════════════════════════════════════════
//  🌐 HEALTH CHECK SERVER (Prevent Render Sleep)
// ═══════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 3000;

let botStats = {
    startTime: Date.now(),
    messagesProcessed: 0,
    bypassSuccess: 0,
    bypassFailed: 0
};

app.get('/', (req, res) => {
    const uptime = Math.floor((Date.now() - botStats.startTime) / 1000);
    res.json({
        status: 'online',
        bot: client.user ? client.user.tag : 'Starting...',
        servers: client.guilds ? client.guilds.cache.size : 0,
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        stats: {
            processed: botStats.messagesProcessed,
            success: botStats.bypassSuccess,
            failed: botStats.bypassFailed
        }
    });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`✅ Health check server running on port ${PORT}`);
});

// ═══════════════════════════════════════════════════════
//  ⚙️ CONFIGURATION (Auto-load dari Environment)
// ═══════════════════════════════════════════════════════
const CONFIG = {
    token: process.env.DISCORD_TOKEN,
    prefix: process.env.PREFIX || '!',
    cooldown: parseInt(process.env.COOLDOWN) || 5,
    maxTimeout: parseInt(process.env.TIMEOUT) || 45000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
    
    supportedSites: [
        // Loot family
        'loot-link.com', 'lootdest.com', 'loot-links.com', 'lootdest.org',
        'loot-labs.com', 'lootlabs.com', 'links-loot.com', 'lootlink.org',
        'lootlinks.co', 'lootdest.info',
        
        // Linkvertise
        'linkvertise.com', 'link-to.net', 'up-to-down.net', 'direct-link.net',
        
        // Boost family
        'boost.ink', 'mboost.me', 'bst.gg', 'booo.st',
        
        // Work.ink family
        'work.ink', 'workink.net', 'workink.one', 'workink.me',
        
        // Sub2Unlock family
        'sub2unlock.com', 'sub2unlock.io', 'sub2unlock.net', 'sub2unlock.online',
        'sub2unlock.top', 'sub4unlock.pro', 'sub4unlock.com', 'sub2get.com',
        
        // Others
        'rekonise.com', 'socialwolvez.com', 'social-unlock.com',
        'cuty.io', 'cety.app', 'adfoc.us', 'v.gd',
        'paster.so', 'paster.gg', 'direct-links.org'
    ]
};

// Validasi token
if (!CONFIG.token) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ ERROR: DISCORD_TOKEN tidak ditemukan!');
    console.error('');
    console.error('Cara fix:');
    console.error('1. Buka Discord Developer Portal');
    console.error('2. Buat bot baru atau pilih bot existing');
    console.error('3. Copy token dari tab "Bot"');
    console.error('4. Tambahkan di Render Environment Variables:');
    console.error('   DISCORD_TOKEN = your_token_here');
    console.error('═══════════════════════════════════════════════════════');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════
//  🤖 DISCORD CLIENT INITIALIZATION
// ═══════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    presence: {
        status: 'online',
        activities: [{
            name: '🔗 Kirim link untuk bypass!',
            type: ActivityType.Watching
        }]
    }
});

// Storage
const cooldowns = new Map();
const processing = new Set();

// ═══════════════════════════════════════════════════════
//  🎉 BOT READY EVENT
// ═══════════════════════════════════════════════════════
client.once('ready', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║                                                    ║');
    console.log(`║  ✅ BOT ONLINE: ${client.user.tag.padEnd(31)} ║`);
    console.log(`║  📊 Servers: ${String(client.guilds.cache.size).padEnd(34)} ║`);
    console.log(`║  👥 Users: ${String(client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)).padEnd(36)} ║`);
    console.log('║  🔧 Mode: AUTO-BYPASS                              ║');
    console.log(`║  ⏱️  Cooldown: ${CONFIG.cooldown}s ${' '.padEnd(32)} ║`);
    console.log('║                                                    ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🎯 Bot siap menerima link!');
    console.log(`🌐 Health check: http://localhost:${PORT}`);
    console.log('');
});

// ═══════════════════════════════════════════════════════
//  📨 MESSAGE HANDLER - AUTO BYPASS
// ═══════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    // Ignore bots dan DMs
    if (message.author.bot) return;
    if (!message.guild) return;
    
    // Extract URLs dari message
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.content.match(urlRegex);
    
    if (!urls) {
        // Check untuk commands
        handleCommands(message);
        return;
    }
    
    // Filter URL yang didukung
    const bypassableUrls = urls.filter(url => {
        try {
            const hostname = new URL(url).hostname.replace('www.', '');
            return CONFIG.supportedSites.some(site => hostname.includes(site));
        } catch {
            return false;
        }
    });
    
    if (bypassableUrls.length === 0) return;
    
    // Proses setiap URL (max 3 per message untuk avoid spam)
    const urlsToProcess = bypassableUrls.slice(0, 3);
    for (const url of urlsToProcess) {
        await handleAutoBypass(message, url);
    }
    
    if (bypassableUrls.length > 3) {
        message.reply({
            embeds: [createQuickEmbed('⚠️', `Hanya 3 link pertama yang diproses (ditemukan ${bypassableUrls.length})`, 0xFFA500)]
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000));
    }
});

// ═══════════════════════════════════════════════════════
//  🔄 AUTO BYPASS HANDLER
// ═══════════════════════════════════════════════════════
async function handleAutoBypass(message, url) {
    const userId = message.author.id;
    const urlHash = Buffer.from(url).toString('base64').substring(0, 16);
    const processingKey = `${userId}-${urlHash}`;
    
    // Prevent duplicate processing
    if (processing.has(processingKey)) return;
    
    // Cooldown check
    if (cooldowns.has(userId)) {
        const expirationTime = cooldowns.get(userId);
        const timeLeft = (expirationTime - Date.now()) / 1000;
        
        if (timeLeft > 0) {
            return message.reply({
                embeds: [createQuickEmbed('⏳', `Tunggu ${timeLeft.toFixed(1)}s sebelum bypass lagi`, 0xFFA500)]
            }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
        }
    }
    
    // Set flags
    processing.add(processingKey);
    cooldowns.set(userId, Date.now() + CONFIG.cooldown * 1000);
    setTimeout(() => cooldowns.delete(userId), CONFIG.cooldown * 1000);
    
    // Stats
    botStats.messagesProcessed++;
    
    // Reaction feedback
    await message.react('🔄').catch(() => {});
    
    const startTime = Date.now();
    
    try {
        // Bypass process
        const result = await bypassLink(url);
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (result.success) {
            botStats.bypassSuccess++;
            
            // Success embed
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setAuthor({ 
                    name: message.author.tag, 
                    iconURL: message.author.displayAvatarURL() 
                })
                .setTitle('✅ Bypass Berhasil!')
                .setDescription(`**Original Link:**\n\`\`\`${truncate(url, 100)}\`\`\``)
                .addFields({
                    name: '🎯 Link Tujuan',
                    value: result.destination,
                    inline: false
                })
                .setFooter({ text: `Proses ${processingTime}s • Powered by bypass.vip` })
                .setTimestamp();
            
            await message.reply({ 
                embeds: [embed],
                allowedMentions: { repliedUser: false }
            });
            
            await message.reactions.removeAll().catch(() => {});
            await message.react('✅').catch(() => {});
            
            console.log(`✅ Bypass success: ${truncate(url, 50)} → ${truncate(result.destination, 50)} (${processingTime}s)`);
            
        } else {
            botStats.bypassFailed++;
            
            // Error embed
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Bypass Gagal')
                .setDescription(`**Link:** ${truncate(url, 80)}\n\n**Error:** ${result.error}`)
                .setFooter({ text: 'Coba lagi atau link mungkin expired' })
                .setTimestamp();
            
            await message.reply({ 
                embeds: [errorEmbed],
                allowedMentions: { repliedUser: false }
            });
            
            await message.reactions.removeAll().catch(() => {});
            await message.react('❌').catch(() => {});
            
            console.log(`❌ Bypass failed: ${truncate(url, 50)} - ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ Error during bypass:', error);
        
        await message.reply({
            embeds: [createQuickEmbed('⚠️', 'Terjadi kesalahan internal. Coba lagi.', 0xFF6B6B)]
        }).catch(() => {});
        
        await message.reactions.removeAll().catch(() => {});
    } finally {
        processing.delete(processingKey);
    }
}

// ═══════════════════════════════════════════════════════
//  🔑 CORE BYPASS FUNCTION
// ═══════════════════════════════════════════════════════
async function bypassLink(url) {
    console.log(`🔍 Memulai bypass: ${truncate(url, 60)}`);
    
    const apiEndpoints = [
        { url: 'https://api.bypass.vip/bypass', params: { url } },
        { url: 'https://bypass.vip/bypass', params: { url } }
    ];
    
    for (const [index, endpoint] of apiEndpoints.entries()) {
        try {
            console.log(`📡 Trying API ${index + 1}/${apiEndpoints.length}: ${endpoint.url}`);
            
            const response = await axios.get(endpoint.url, {
                params: endpoint.params,
                timeout: CONFIG.maxTimeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://bypass.vip/'
                },
                validateStatus: (status) => status < 500
            });
            
            const data = response.data;
            
            // Handle berbagai format response
            const destination = 
                data.destination || 
                data.result || 
                data.bypassed || 
                data.bypassedUrl ||
                data.final_url ||
                data.url;
            
            if (destination && destination !== url && destination.length > 10) {
                console.log(`✅ API ${index + 1} berhasil`);
                return { success: true, destination };
            }
            
            // Log error dari API
            if (data.error || data.message) {
                console.log(`⚠️ API ${index + 1} error: ${data.error || data.message}`);
                continue;
            }
            
            console.log(`⚠️ API ${index + 1} tidak return destination valid`);
            
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log(`⏱️ API ${index + 1} timeout (${CONFIG.maxTimeout}ms)`);
            } else if (error.response) {
                console.log(`❌ API ${index + 1} HTTP ${error.response.status}: ${error.response.statusText}`);
            } else {
                console.log(`❌ API ${index + 1} error: ${error.message}`);
            }
            continue;
        }
    }
    
    return { 
        success: false, 
        error: 'Semua API endpoint gagal. Link mungkin tidak didukung, expired, atau API sedang down.' 
    };
}

// ═══════════════════════════════════════════════════════
//  📋 COMMAND HANDLER
// ═══════════════════════════════════════════════════════
function handleCommands(message) {
    if (!message.content.startsWith(CONFIG.prefix)) return;
    
    const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    switch (command) {
        case 'help':
            commandHelp(message);
            break;
        case 'sites':
            commandSites(message);
            break;
        case 'ping':
            commandPing(message);
            break;
        case 'stats':
            commandStats(message);
            break;
    }
}

function commandHelp(message) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📚 Panduan Bypass Bot')
        .setDescription('Bot ini **otomatis mendeteksi** dan bypass shortlink dalam chat!')
        .addFields(
            {
                name: '🔗 Cara Pakai',
                value: '```\nKirim link langsung di chat!\n\nContoh:\nhttps://loot-link.com/s?abc123\n\nBot akan otomatis reply dengan link asli.\n```',
                inline: false
            },
            {
                name: '⚡ Commands',
                value: `\`${CONFIG.prefix}help\` - Panduan ini\n\`${CONFIG.prefix}sites\` - Lihat situs yang didukung\n\`${CONFIG.prefix}ping\` - Cek status bot\n\`${CONFIG.prefix}stats\` - Statistik bot`,
                inline: false
            },
            {
                name: '⚙️ Info',
                value: `• Cooldown: ${CONFIG.cooldown} detik per user\n• Timeout: ${CONFIG.maxTimeout/1000} detik\n• Max links per message: 3\n• Servers: ${client.guilds.cache.size}`,
                inline: false
            },
            {
                name: '🌐 Situs Populer',
                value: '`loot-link.com`, `linkvertise.com`, `boost.ink`, `work.ink`, `sub2unlock.com`',
                inline: false
            }
        )
        .setFooter({ text: 'Powered by bypass.vip API' })
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}

function commandSites(message) {
    const sitesPerPage = 20;
    const sitesList = CONFIG.supportedSites
        .slice(0, sitesPerPage)
        .map((site, i) => `${i + 1}. \`${site}\``)
        .join('\n');
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Situs yang Didukung')
        .setDescription(`**Total: ${CONFIG.supportedSites.length} situs**\n\n${sitesList}\n\n... dan ${CONFIG.supportedSites.length - sitesPerPage}+ situs lainnya!`)
        .setFooter({ text: 'Kirim link dari situs ini untuk auto bypass' })
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}

function commandPing(message) {
    const ping = Date.now() - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);
    const uptime = process.uptime();
    
    const embed = new EmbedBuilder()
        .setColor(apiPing < 100 ? 0x00FF00 : apiPing < 200 ? 0xFFA500 : 0xFF0000)
        .setTitle('🏓 Pong!')
        .addFields(
            { name: '📨 Bot Latency', value: `${ping}ms`, inline: true },
            { name: '🌐 API Latency', value: `${apiPing}ms`, inline: true },
            { name: '⏱️ Uptime', value: formatUptime(uptime), inline: true }
        )
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}

function commandStats(message) {
    const uptime = process.uptime();
    const totalMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('📊 Statistik Bot')
        .addFields(
            { name: '🤖 Bot', value: client.user.tag, inline: true },
            { name: '🌐 Servers', value: String(client.guilds.cache.size), inline: true },
            { name: '👥 Users', value: String(client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)), inline: true },
            { name: '⏱️ Uptime', value: formatUptime(uptime), inline: true },
            { name: '💾 Memory', value: `${totalMemory} MB`, inline: true },
            { name: '🔄 Processed', value: String(botStats.messagesProcessed), inline: true },
            { name: '✅ Success', value: String(botStats.bypassSuccess), inline: true },
            { name: '❌ Failed', value: String(botStats.bypassFailed), inline: true },
            { name: '📈 Success Rate', value: botStats.messagesProcessed > 0 ? `${((botStats.bypassSuccess / botStats.messagesProcessed) * 100).toFixed(1)}%` : 'N/A', inline: true }
        )
        .setFooter({ text: `Node.js ${process.version}` })
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}

// ═══════════════════════════════════════════════════════
//  🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════
function createQuickEmbed(emoji, text, color) {
    return new EmbedBuilder()
        .setColor(color)
        .setDescription(`${emoji} ${text}`)
        .setTimestamp();
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

// ═══════════════════════════════════════════════════════
//  ⚠️ ERROR HANDLERS
// ═══════════════════════════════════════════════════════
process.on('unhandledRejection', (error) => {
    console.error('═══════════════════════════════════════');
    console.error('❌ Unhandled Promise Rejection:');
    console.error(error);
    console.error('═══════════════════════════════════════');
});

process.on('uncaughtException', (error) => {
    console.error('═══════════════════════════════════════');
    console.error('❌ Uncaught Exception:');
    console.error(error);
    console.error('═══════════════════════════════════════');
    console.error('⚠️ Bot akan restart...');
    process.exit(1);
});

client.on('error', (error) => {
    console.error('❌ Discord Client Error:', error);
});

client.on('warn', (warning) => {
    console.warn('⚠️ Discord Client Warning:', warning);
});

// ═══════════════════════════════════════════════════════
//  🚀 START BOT
// ═══════════════════════════════════════════════════════
console.log('🚀 Starting Discord Bypass Bot...');
console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📦 Node.js: ${process.version}`);
console.log('');

client.login(CONFIG.token).catch((error) => {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ FAILED TO LOGIN!');
    console.error('');
    console.error('Possible causes:');
    console.error('1. Invalid DISCORD_TOKEN');
    console.error('2. Token expired atau direset');
    console.error('3. Bot deleted dari Developer Portal');
    console.error('');
    console.error('Error detail:');
    console.error(error.message);
    console.error('═══════════════════════════════════════════════════════');
    process.exit(1);
});
