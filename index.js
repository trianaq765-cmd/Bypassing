const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
const express = require('express');

// ═══════════════════════════════════════════════════════
//  🌐 HEALTH CHECK SERVER
// ═══════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 3000;

let botStats = {
    startTime: Date.now(),
    processed: 0,
    success: 0,
    failed: 0
};

app.get('/', (req, res) => {
    const uptime = Math.floor((Date.now() - botStats.startTime) / 1000);
    res.json({
        status: 'online',
        bot: client.user ? client.user.tag : 'Starting...',
        servers: client.guilds ? client.guilds.cache.size : 0,
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        stats: botStats,
        api: 'Powered by voltar.lol'
    });
});

app.listen(PORT, () => {
    console.log(`✅ Health check server running on port ${PORT}`);
});

// ═══════════════════════════════════════════════════════
//  ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════════
const CONFIG = {
    token: process.env.DISCORD_TOKEN,
    prefix: process.env.PREFIX || '!',
    cooldown: parseInt(process.env.COOLDOWN) || 5,
    maxTimeout: parseInt(process.env.TIMEOUT) || 60000, // 60 seconds for voltar
    voltarKey: process.env.VOLTAR_KEY || '', // Optional premium key
    
    // Supported sites (same as userscript)
    supportedSites: [
        'loot-link.com', 'lootdest.com', 'lootdest.org', 'loot-links.com',
        'lootdest.info', 'lootlabs.com', 'loot-labs.com', 'lootlink.org',
        'flux.li', 'mega-guy.com', 'best-links.org', 'megaspremium.com',
        'direct-links.net', 'direct-links.org', 'direct-link.net',
        'linkvertise.com', 'link-to.net', 'up-to-down.net',
        'boost.ink', 'mboost.me', 'bst.gg', 'booo.st',
        'work.ink', 'workink.net', 'workink.one', 'workink.me',
        'sub2unlock.com', 'sub2unlock.io', 'sub2unlock.net', 'sub2unlock.online',
        'social-unlock.com', 'socialwolvez.com', 'sub2get.com', 'sub4unlock.com',
        'rekonise.com', 'adfoc.us', 'cuty.io', 'cety.app', 'v.gd',
        'paster.so', 'paster.gg', 'ytsubme.com'
    ]
};

// Validate token
if (!CONFIG.token) {
    console.error('❌ ERROR: DISCORD_TOKEN tidak ditemukan!');
    console.error('Set di Render Environment Variables');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════
//  🤖 DISCORD CLIENT
// ═══════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const cooldowns = new Map();
const processing = new Set();

// ═══════════════════════════════════════════════════════
//  🎉 BOT READY
// ═══════════════════════════════════════════════════════
client.once('ready', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║                                                    ║');
    console.log(`║  ✅ BOT ONLINE: ${client.user.tag.padEnd(31)} ║`);
    console.log(`║  📊 Servers: ${String(client.guilds.cache.size).padEnd(34)} ║`);
    console.log('║  🔧 Mode: AUTO-BYPASS                              ║');
    console.log('║  ⚡ API: VOLTAR.LOL                                ║');
    console.log(`║  ⏱️  Cooldown: ${CONFIG.cooldown}s ${' '.padEnd(32)} ║`);
    console.log('║                                                    ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    
    client.user.setPresence({
        activities: [{ 
            name: '🔗 Kirim link untuk bypass! | Powered by voltar.lol', 
            type: ActivityType.Watching 
        }],
        status: 'online'
    });
});

// ═══════════════════════════════════════════════════════
//  📨 MESSAGE HANDLER
// ═══════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Check for commands first
    if (message.content.startsWith(CONFIG.prefix)) {
        handleCommands(message);
        return;
    }
    
    // Extract URLs
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.content.match(urlRegex);
    
    if (!urls) return;
    
    // Filter supported URLs
    const bypassableUrls = urls.filter(url => {
        try {
            const hostname = new URL(url).hostname.replace('www.', '');
            return CONFIG.supportedSites.some(site => hostname.includes(site));
        } catch {
            return false;
        }
    });
    
    if (bypassableUrls.length === 0) return;
    
    // Process first URL only (to avoid spam)
    await handleAutoBypass(message, bypassableUrls[0]);
});

// ═══════════════════════════════════════════════════════
//  🔄 AUTO BYPASS HANDLER
// ═══════════════════════════════════════════════════════
async function handleAutoBypass(message, url) {
    const userId = message.author.id;
    const urlHash = Buffer.from(url).toString('base64').substring(0, 16);
    const processingKey = `${userId}-${urlHash}`;
    
    // Check if already processing
    if (processing.has(processingKey)) return;
    
    // Cooldown check
    if (cooldowns.has(userId)) {
        const timeLeft = ((cooldowns.get(userId) - Date.now()) / 1000).toFixed(1);
        if (timeLeft > 0) {
            return message.reply({
                embeds: [createQuickEmbed('⏳', `Tunggu ${timeLeft}s sebelum bypass lagi`, 0xFFA500)]
            }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
        }
    }
    
    // Set flags
    processing.add(processingKey);
    cooldowns.set(userId, Date.now() + CONFIG.cooldown * 1000);
    setTimeout(() => cooldowns.delete(userId), CONFIG.cooldown * 1000);
    
    // Stats
    botStats.processed++;
    
    // React for feedback
    await message.react('🔄').catch(() => {});
    
    const startTime = Date.now();
    
    try {
        // Call voltar.lol bypass
        const result = await bypassWithVoltar(url);
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (result.success) {
            botStats.success++;
            
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
                .setFooter({ 
                    text: `Proses ${processingTime}s • Powered by voltar.lol`,
                    iconURL: 'https://i.imgur.com/AeFbszq.png'
                })
                .setTimestamp();
            
            await message.reply({ 
                embeds: [embed],
                allowedMentions: { repliedUser: false }
            });
            
            await message.reactions.removeAll().catch(() => {});
            await message.react('✅').catch(() => {});
            
            console.log(`✅ Bypass success: ${truncate(url, 50)} (${processingTime}s)`);
            
        } else {
            botStats.failed++;
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Bypass Gagal')
                .setDescription(`**Link:** ${truncate(url, 80)}\n\n**Error:** ${result.error}`)
                .addFields({
                    name: '💡 Solusi',
                    value: '• Coba lagi dalam beberapa saat\n• Link mungkin expired\n• Gunakan `!manual` untuk panduan bypass manual',
                    inline: false
                })
                .setFooter({ text: 'voltar.lol API' })
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
        console.error('Error during bypass:', error);
        
        await message.reply({
            embeds: [createQuickEmbed('⚠️', 'Terjadi kesalahan internal', 0xFF6B6B)]
        }).catch(() => {});
        
        await message.reactions.removeAll().catch(() => {});
    } finally {
        processing.delete(processingKey);
    }
}

// ═══════════════════════════════════════════════════════
//  🔑 VOLTAR.LOL BYPASS FUNCTION
// ═══════════════════════════════════════════════════════
async function bypassWithVoltar(url) {
    console.log(`🔍 Starting voltar.lol bypass: ${truncate(url, 60)}`);
    
    try {
        // Step 1: Submit URL to voltar.lol
        console.log('📡 Submitting to voltar.lol API...');
        
        const voltarUrl = `https://voltar.lol/userscript.html`;
        const params = {
            url: encodeURIComponent(url),
            time: 10, // Wait time
            key: CONFIG.voltarKey // Premium key if available
        };
        
        // Build full URL
        const apiUrl = `${voltarUrl}?url=${params.url}&time=${params.time}&key=${params.key}`;
        
        // First request to get redirect URL
        const response = await axios.get(apiUrl, {
            timeout: CONFIG.maxTimeout,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': url
            },
            validateStatus: (status) => status < 500
        });
        
        // Check if we got a redirect parameter
        if (response.request && response.request.res) {
            const finalUrl = response.request.res.responseUrl || response.request.path;
            
            if (finalUrl && finalUrl.includes('redirect=')) {
                const redirectMatch = finalUrl.match(/redirect=([^&]+)/);
                if (redirectMatch && redirectMatch[1]) {
                    const destination = decodeURIComponent(redirectMatch[1]);
                    
                    // Validate destination
                    if (destination && !destination.includes('voltar.lol')) {
                        console.log(`✅ Voltar bypass successful!`);
                        return { success: true, destination };
                    }
                }
            }
        }
        
        // Alternative: Try direct API endpoint
        console.log('📡 Trying alternative voltar endpoint...');
        
        const altResponse = await axios.post('https://voltar.lol/api/bypass', 
            { url: url },
            {
                timeout: CONFIG.maxTimeout,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'VoltarBot/1.0'
                }
            }
        );
        
        if (altResponse.data) {
            const dest = altResponse.data.destination || 
                        altResponse.data.bypassed || 
                        altResponse.data.result ||
                        altResponse.data.url;
            
            if (dest && dest !== url) {
                console.log(`✅ Voltar alt endpoint success!`);
                return { success: true, destination: dest };
            }
        }
        
        // If Fluxus detected
        if (url.includes('flux.li')) {
            return { 
                success: false, 
                error: 'Flux.li memiliki anti-bypass. Gunakan manual bypass.' 
            };
        }
        
        return { 
            success: false, 
            error: 'Tidak dapat extract link dari voltar.lol. API mungkin berubah.' 
        };
        
    } catch (error) {
        console.error('Voltar API error:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            return { success: false, error: 'Timeout - bypass memerlukan waktu lebih lama' };
        }
        
        if (error.response && error.response.status === 429) {
            return { success: false, error: 'Rate limited - terlalu banyak request' };
        }
        
        return { success: false, error: `API Error: ${error.message}` };
    }
}

// ═══════════════════════════════════════════════════════
//  📋 COMMAND HANDLER
// ═══════════════════════════════════════════════════════
function handleCommands(message) {
    const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    switch (command) {
        case 'help':
            commandHelp(message);
            break;
        case 'sites':
            commandSites(message);
            break;
        case 'stats':
            commandStats(message);
            break;
        case 'manual':
            commandManual(message);
            break;
        case 'ping':
            commandPing(message);
            break;
    }
}

function commandHelp(message) {
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('📚 Panduan Bypass Bot')
        .setDescription('Bot ini menggunakan **voltar.lol API** untuk bypass shortlink!')
        .addFields(
            {
                name: '🔗 Cara Pakai',
                value: '```Kirim link langsung di chat:\nhttps://lootdest.org/s?abc123```',
                inline: false
            },
            {
                name: '⚡ Commands',
                value: [
                    `\`${CONFIG.prefix}help\` - Panduan ini`,
                    `\`${CONFIG.prefix}sites\` - Daftar situs yang didukung`,
                    `\`${CONFIG.prefix}stats\` - Statistik bot`,
                    `\`${CONFIG.prefix}manual\` - Cara bypass manual`,
                    `\`${CONFIG.prefix}ping\` - Cek status bot`
                ].join('\n'),
                inline: false
            },
            {
                name: '⚙️ Info',
                value: `• API: voltar.lol\n• Cooldown: ${CONFIG.cooldown}s\n• Timeout: ${CONFIG.maxTimeout/1000}s\n• Sites: ${CONFIG.supportedSites.length}+`,
                inline: false
            }
        )
        .setFooter({ 
            text: 'Powered by voltar.lol', 
            iconURL: 'https://i.imgur.com/AeFbszq.png' 
        })
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}

function commandSites(message) {
    const sitesChunks = [];
    const chunkSize = 20;
    
    for (let i = 0; i < CONFIG.supportedSites.length; i += chunkSize) {
        sitesChunks.push(CONFIG.supportedSites.slice(i, i + chunkSize));
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('📋 Situs yang Didukung')
        .setDescription(`**Total: ${CONFIG.supportedSites.length} situs**`)
        .addFields(
            sitesChunks.map((chunk, index) => ({
                name: `Part ${index + 1}`,
                value: chunk.map(s => `\`${s}\``).join(', '),
                inline: false
            }))
        )
        .setFooter({ text: 'voltar.lol API supports all these sites' })
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}

function commandStats(message) {
    const uptime = process.uptime();
    const successRate = botStats.processed > 0 
        ? ((botStats.success / botStats.processed) * 100).toFixed(1)
        : 'N/A';
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📊 Statistik Bot')
        .addFields(
            { name: '🤖 Bot', value: client.user.tag, inline: true },
            { name: '🌐 Servers', value: String(client.guilds.cache.size), inline: true },
            { name: '⏱️ Uptime', value: formatUptime(uptime), inline: true },
            { name: '🔄 Processed', value: String(botStats.processed), inline: true },
            { name: '✅ Success', value: String(botStats.success), inline: true },
            { name: '❌ Failed', value: String(botStats.failed), inline: true },
            { name: '📈 Success Rate', value: `${successRate}%`, inline: true },
            { name: '⚡ API', value: 'voltar.lol', inline: true },
            { name: '💾 Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
        )
        .setFooter({ text: 'voltar.lol bypasser' })
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}

function commandManual(message) {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🔧 Cara Bypass Manual')
        .setDescription('Jika bot gagal, gunakan cara manual:')
        .addFields(
            {
                name: '📱 Via Browser (PC/Mobile)',
                value: [
                    '1. Install extension Tampermonkey',
                    '2. Install script voltar.lol:',
                    '`https://github.com/YxuSinX/userscript`',
                    '3. Buka shortlink → auto bypass'
                ].join('\n'),
                inline: false
            },
            {
                name: '🌐 Via Website',
                value: [
                    '1. Buka: https://voltar.lol',
                    '2. Paste shortlink',
                    '3. Klik bypass',
                    '4. Tunggu proses'
                ].join('\n'),
                inline: false
            },
            {
                name: '💡 Tips',
                value: [
                    '• Gunakan AdBlock',
                    '• Disable JavaScript untuk skip ads',
                    '• Gunakan VPN jika diblokir',
                    '• Coba incognito mode'
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'Manual bypass guide' })
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}

function commandPing(message) {
    const ping = Date.now() - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);
    
    const embed = new EmbedBuilder()
        .setColor(apiPing < 100 ? 0x00FF00 : apiPing < 200 ? 0xFFA500 : 0xFF0000)
        .setTitle('🏓 Pong!')
        .addFields(
            { name: 'Bot Latency', value: `${ping}ms`, inline: true },
            { name: 'API Latency', value: `${apiPing}ms`, inline: true },
            { name: 'Status', value: '🟢 Online', inline: true }
        )
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
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// ═══════════════════════════════════════════════════════
//  ⚠️ ERROR HANDLERS
// ═══════════════════════════════════════════════════════
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// ═══════════════════════════════════════════════════════
//  🚀 START BOT
// ═══════════════════════════════════════════════════════
console.log('🚀 Starting Discord Bypass Bot...');
console.log('⚡ Using voltar.lol API');
console.log('');

client.login(CONFIG.token).catch((error) => {
    console.error('❌ Failed to login:', error.message);
    process.exit(1);
});
