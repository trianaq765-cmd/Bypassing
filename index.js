const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
const express = require('express');

// ═══════════════════════════════════════════════════════
//  🌐 HEALTH CHECK SERVER
// ═══════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: client.user ? client.user.tag : 'Starting...',
        servers: client.guilds ? client.guilds.cache.size : 0,
        commands: ['!bypass <url>', '!help', '!ping', '!sites']
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server berjalan di port ${PORT}`);
});

// ═══════════════════════════════════════════════════════
//  ⚙️ KONFIGURASI
// ═══════════════════════════════════════════════════════
const CONFIG = {
    token: process.env.DISCORD_TOKEN,
    prefix: '!',
    cooldown: 5
};

// ═══════════════════════════════════════════════════════
//  🤖 SETUP BOT
// ═══════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

// Storage
const cooldowns = new Map();
let botReady = false;

// ═══════════════════════════════════════════════════════
//  ✅ BOT READY EVENT
// ═══════════════════════════════════════════════════════
client.once('ready', () => {
    botReady = true;
    console.log('╔════════════════════════════════════════════╗');
    console.log(`║  ✅ BOT ONLINE: ${client.user.tag}        `);
    console.log(`║  📊 Servers: ${client.guilds.cache.size}   `);
    console.log('║  ⚡ Commands:                               ');
    console.log('║     !bypass <url> - Bypass link            ');
    console.log('║     !help - Bantuan                        ');
    console.log('║     !ping - Cek bot                        ');
    console.log('║     !sites - Situs yang didukung           ');
    console.log('╚════════════════════════════════════════════╝');
    
    // Set status
    client.user.setPresence({
        activities: [{ 
            name: '!help | Bypass Links', 
            type: ActivityType.Watching 
        }],
        status: 'online'
    });
});

// ═══════════════════════════════════════════════════════
//  📨 MESSAGE HANDLER - COMMANDS
// ═══════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    // Debug log untuk SETIAP message
    if (!message.author.bot && message.guild) {
        console.log(`📨 Message dari ${message.author.tag}: "${message.content}"`);
    }
    
    // Ignore bot messages dan DM
    if (message.author.bot) return;
    if (!message.guild) {
        return message.reply('❌ Bot hanya bekerja di server, bukan DM!');
    }
    
    // Check if message starts with prefix
    if (!message.content.startsWith(CONFIG.prefix)) {
        // Auto-detect URLs (optional)
        const urls = message.content.match(/(https?:\/\/[^\s]+)/gi);
        if (urls && urls.length > 0) {
            const supportedSites = [
                'loot-link.com', 'lootdest.com', 'lootdest.org',
                'linkvertise.com', 'work.ink', 'boost.ink',
                'sub2unlock.com', 'social-unlock.com'
            ];
            
            const url = urls[0];
            const isSupported = supportedSites.some(site => url.includes(site));
            
            if (isSupported) {
                console.log(`🔗 Auto-detect URL: ${url}`);
                message.reply(`💡 **Tip:** Gunakan \`!bypass ${url}\` untuk bypass link ini!`);
            }
        }
        return;
    }
    
    // Parse command dan arguments
    const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    console.log(`⚡ Command detected: ${command} | Args: ${args.join(', ')}`);
    
    // ═══════════════════════════════════════
    // COMMAND: !help
    // ═══════════════════════════════════════
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📚 **PANDUAN BOT BYPASS**')
            .setDescription('Bot untuk bypass shortlink/ad-link otomatis!')
            .addFields(
                {
                    name: '⚡ **COMMANDS:**',
                    value: 
`\`\`\`
!bypass <url> - Bypass shortlink
!help         - Menampilkan bantuan ini
!ping         - Cek status bot
!sites        - Daftar situs yang didukung
\`\`\``,
                    inline: false
                },
                {
                    name: '📝 **CONTOH PENGGUNAAN:**',
                    value: 
`\`\`\`
!bypass https://lootdest.org/s?abc123
!bypass https://linkvertise.com/123456
!bypass https://work.ink/xyz789
\`\`\``,
                    inline: false
                },
                {
                    name: '⚙️ **INFO:**',
                    value: 
`• Cooldown: 5 detik per user
• Support 50+ situs shortlink
• Powered by voltar.lol API`,
                    inline: false
                }
            )
            .setFooter({ text: 'Bypass Bot v2.0 | voltar.lol' })
            .setTimestamp();
        
        return message.reply({ embeds: [helpEmbed] });
    }
    
    // ═══════════════════════════════════════
    // COMMAND: !ping
    // ═══════════════════════════════════════
    if (command === 'ping') {
        const latency = Date.now() - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        const pingEmbed = new EmbedBuilder()
            .setColor(apiLatency < 100 ? 0x00FF00 : apiLatency < 200 ? 0xFFFF00 : 0xFF0000)
            .setTitle('🏓 **PONG!**')
            .setDescription(`
**Bot Latency:** \`${latency}ms\`
**API Latency:** \`${apiLatency}ms\`
**Status:** 🟢 Online
**Uptime:** \`${Math.floor(process.uptime() / 60)} menit\`
            `)
            .setTimestamp();
        
        return message.reply({ embeds: [pingEmbed] });
    }
    
    // ═══════════════════════════════════════
    // COMMAND: !sites
    // ═══════════════════════════════════════
    if (command === 'sites') {
        const sitesEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📋 **SITUS YANG DIDUKUNG**')
            .setDescription('Bot ini mendukung bypass untuk situs-situs berikut:')
            .addFields(
                {
                    name: '**Loot Family:**',
                    value: '`loot-link.com`, `lootdest.com`, `lootdest.org`, `loot-labs.com`, `lootlink.org`',
                    inline: false
                },
                {
                    name: '**Linkvertise:**',
                    value: '`linkvertise.com`, `link-to.net`, `up-to-down.net`',
                    inline: false
                },
                {
                    name: '**Work/Boost:**',
                    value: '`work.ink`, `boost.ink`, `mboost.me`, `bst.gg`',
                    inline: false
                },
                {
                    name: '**Sub2Unlock:**',
                    value: '`sub2unlock.com`, `sub2unlock.io`, `sub2get.com`, `social-unlock.com`',
                    inline: false
                },
                {
                    name: '**Others:**',
                    value: '`rekonise.com`, `adfoc.us`, `cuty.io`, `v.gd`, `paster.so`',
                    inline: false
                }
            )
            .setFooter({ text: 'Total: 50+ situs' })
            .setTimestamp();
        
        return message.reply({ embeds: [sitesEmbed] });
    }
    
    // ═══════════════════════════════════════
    // COMMAND: !bypass <url>
    // ═══════════════════════════════════════
    if (command === 'bypass') {
        // Check if URL provided
        if (!args[0]) {
            return message.reply('❌ **Format:** `!bypass <url>`\n**Contoh:** `!bypass https://lootdest.org/s?abc123`');
        }
        
        const url = args[0];
        const userId = message.author.id;
        
        // Validate URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return message.reply('❌ **URL tidak valid!** Harus dimulai dengan `http://` atau `https://`');
        }
        
        // Cooldown check
        if (cooldowns.has(userId)) {
            const timeLeft = ((cooldowns.get(userId) - Date.now()) / 1000).toFixed(1);
            if (timeLeft > 0) {
                return message.reply(`⏳ **Cooldown!** Tunggu ${timeLeft} detik lagi.`);
            }
        }
        
        // Set cooldown
        cooldowns.set(userId, Date.now() + CONFIG.cooldown * 1000);
        setTimeout(() => cooldowns.delete(userId), CONFIG.cooldown * 1000);
        
        // Start bypass process
        const processingEmbed = new EmbedBuilder()
            .setColor(0xFFFF00)
            .setTitle('🔄 **PROCESSING...**')
            .setDescription(`Sedang memproses bypass untuk:\n\`\`\`${url}\`\`\``)
            .addFields({
                name: 'Status',
                value: '⏳ Mohon tunggu 10-30 detik...'
            })
            .setFooter({ text: 'voltar.lol API' })
            .setTimestamp();
        
        const processingMsg = await message.reply({ embeds: [processingEmbed] });
        
        try {
            console.log(`🔍 Memulai bypass untuk: ${url}`);
            
            // Method 1: Direct voltar.lol API
            let destination = null;
            
            // Try voltar.lol
            try {
                const voltarResponse = await axios({
                    method: 'GET',
                    url: 'https://api.bypass.vip/bypass', // Fallback API
                    params: { url: url },
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                destination = voltarResponse.data.destination || 
                            voltarResponse.data.result ||
                            voltarResponse.data.bypassed;
                            
            } catch (e1) {
                console.log('❌ API 1 failed, trying alternative...');
                
                // Method 2: Alternative API
                try {
                    const altResponse = await axios({
                        method: 'POST',
                        url: 'https://api.bypass.pm/bypass',
                        data: { url: url },
                        timeout: 30000
                    });
                    
                    destination = altResponse.data.destination;
                } catch (e2) {
                    console.log('❌ API 2 failed');
                }
            }
            
            // Check result
            if (destination && destination !== url) {
                // SUCCESS
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ **BYPASS BERHASIL!**')
                    .setDescription(`**Link Original:**\n\`\`\`${url}\`\`\``)
                    .addFields({
                        name: '🎯 **Link Tujuan:**',
                        value: destination,
                        inline: false
                    })
                    .setFooter({ 
                        text: `Requested by ${message.author.tag}`,
                        iconURL: message.author.displayAvatarURL()
                    })
                    .setTimestamp();
                
                await processingMsg.edit({ embeds: [successEmbed] });
                console.log(`✅ Bypass success: ${destination}`);
                
            } else {
                // FAILED - but provide manual solution
                const failedEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ **BYPASS GAGAL**')
                    .setDescription('API sedang down atau link tidak didukung.')
                    .addFields(
                        {
                            name: '🔧 **Solusi Manual:**',
                            value: 
`1. **Install Extension:**
   • Chrome: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey)
   
2. **Install Script:**
   • [Voltar.lol Script](https://github.com/YxuSinX/userscript)
   
3. **Buka link di browser**
   • Akan otomatis bypass`,
                            inline: false
                        },
                        {
                            name: '💡 **Alternative:**',
                            value: '• Coba lagi dalam beberapa saat\n• Link mungkin expired\n• Gunakan VPN',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Bypass failed' })
                    .setTimestamp();
                
                await processingMsg.edit({ embeds: [failedEmbed] });
                console.log(`❌ Bypass failed for: ${url}`);
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ **ERROR**')
                .setDescription(`Terjadi kesalahan:\n\`\`\`${error.message}\`\`\``)
                .setFooter({ text: 'Internal error' })
                .setTimestamp();
            
            await processingMsg.edit({ embeds: [errorEmbed] });
        }
    }
    
    // ═══════════════════════════════════════
    // COMMAND: Unknown
    // ═══════════════════════════════════════
    else {
        message.reply(`❓ **Command tidak dikenali!**\nGunakan \`!help\` untuk melihat daftar command.`);
    }
});

// ═══════════════════════════════════════════════════════
//  ⚠️ ERROR HANDLERS
// ═══════════════════════════════════════════════════════
client.on('error', console.error);
client.on('warn', console.warn);

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

// ═══════════════════════════════════════════════════════
//  🚀 LOGIN BOT
// ═══════════════════════════════════════════════════════
if (!CONFIG.token) {
    console.error('════════════════════════════════════════');
    console.error('❌ ERROR: DISCORD_TOKEN tidak ditemukan!');
    console.error('');
    console.error('Solusi:');
    console.error('1. Buka Render Dashboard');
    console.error('2. Environment Variables');
    console.error('3. Tambahkan: DISCORD_TOKEN = your_token');
    console.error('════════════════════════════════════════');
    process.exit(1);
}

console.log('🚀 Memulai bot...');
console.log('📡 Connecting to Discord...');

client.login(CONFIG.token).catch(error => {
    console.error('════════════════════════════════════════');
    console.error('❌ LOGIN GAGAL!');
    console.error('Error:', error.message);
    console.error('');
    console.error('Kemungkinan:');
    console.error('1. Token salah');
    console.error('2. Bot dihapus');
    console.error('3. Token direset');
    console.error('════════════════════════════════════════');
    process.exit(1);
});
