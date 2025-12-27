const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');

// ═══════════════════════════════════════════════════════
//  🌐 HEALTH CHECK
// ═══════════════════════════════════════════════════════
const app = express();
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(process.env.PORT || 3000);

// ═══════════════════════════════════════════════════════
//  🤖 BOT SETUP
// ═══════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = '!';
const cooldowns = new Map();

// ═══════════════════════════════════════════════════════
//  ✅ BOT READY
// ═══════════════════════════════════════════════════════
client.once('ready', () => {
    console.log('════════════════════════════════════════');
    console.log(`✅ BOT ONLINE: ${client.user.tag}`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    console.log('════════════════════════════════════════');
    
    client.user.setActivity('!help | Work.ink Bypass', { type: ActivityType.Watching });
});

// ═══════════════════════════════════════════════════════
//  📨 MESSAGE HANDLER
// ═══════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Auto-detect work.ink links
    if (message.content.includes('work.ink') || message.content.includes('workink.net')) {
        const urls = message.content.match(/(https?:\/\/[^\s]+)/gi);
        if (urls) {
            const workinkUrl = urls.find(u => u.includes('work.ink') || u.includes('workink.net'));
            if (workinkUrl) {
                return sendBypassGuide(message, workinkUrl);
            }
        }
    }
    
    // Commands
    if (!message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // !help
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📚 **WORK.INK BYPASS BOT**')
            .setDescription('Bot untuk membantu bypass link work.ink')
            .addFields(
                {
                    name: '⚡ **Commands:**',
                    value: 
`\`!help\` - Tampilkan bantuan
\`!bypass <url>\` - Bypass work.ink link
\`!install\` - Cara install userscript
\`!ping\` - Cek status bot`,
                    inline: false
                },
                {
                    name: '🔗 **Auto-Detect:**',
                    value: 'Kirim link work.ink langsung = Bot otomatis kasih panduan!',
                    inline: false
                }
            )
            .setFooter({ text: 'Work.ink Bypass Bot' })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
    
    // !ping
    if (command === 'ping') {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🏓 **PONG!**')
            .setDescription(`**Latency:** \`${Date.now() - message.createdTimestamp}ms\`\n**Status:** 🟢 Online`)
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
    
    // !install
    if (command === 'install') {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📥 **CARA INSTALL USERSCRIPT**')
            .setDescription('Ikuti langkah berikut untuk auto-bypass work.ink di browser:')
            .addFields(
                {
                    name: '**STEP 1: Install Tampermonkey**',
                    value: 
`**Chrome:** [Klik Disini](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
**Firefox:** [Klik Disini](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
**Edge:** [Klik Disini](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)`,
                    inline: false
                },
                {
                    name: '**STEP 2: Install Script**',
                    value: '[🔗 INSTALL WORK.INK SCRIPT](https://github.com/ron12373/BaconButPro/raw/main/Workink.user.js)\n\nKlik link di atas → Klik "Install"',
                    inline: false
                },
                {
                    name: '**STEP 3: Selesai!**',
                    value: 'Buka link work.ink di browser → Script akan **AUTO BYPASS**!',
                    inline: false
                }
            )
            .setFooter({ text: 'Setelah install, bypass otomatis!' })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
    
    // !bypass <url>
    if (command === 'bypass') {
        if (!args[0]) {
            return message.reply('❌ **Format:** `!bypass <url>`\n**Contoh:** `!bypass https://work.ink/abc123`');
        }
        
        const url = args[0];
        
        // Validate URL
        if (!url.includes('work.ink') && !url.includes('workink.net')) {
            return message.reply('❌ **URL tidak valid!** Bot ini hanya support:\n• `work.ink`\n• `workink.net`');
        }
        
        // Cooldown
        const userId = message.author.id;
        if (cooldowns.has(userId)) {
            const timeLeft = ((cooldowns.get(userId) - Date.now()) / 1000).toFixed(1);
            if (timeLeft > 0) {
                return message.reply(`⏳ Tunggu ${timeLeft}s`);
            }
        }
        cooldowns.set(userId, Date.now() + 5000);
        setTimeout(() => cooldowns.delete(userId), 5000);
        
        return sendBypassGuide(message, url);
    }
});

// ═══════════════════════════════════════════════════════
//  📤 BYPASS GUIDE FUNCTION
// ═══════════════════════════════════════════════════════
async function sendBypassGuide(message, url) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🔓 **WORK.INK BYPASS GUIDE**')
        .setDescription(`**Link Detected:**\n\`\`\`${url}\`\`\``)
        .addFields(
            {
                name: '⚡ **CARA CEPAT (Recommended):**',
                value:
`**1.** Install Tampermonkey extension di browser
**2.** Install script: [KLIK DISINI](https://github.com/ron12373/BaconButPro/raw/main/Workink.user.js)
**3.** Buka link work.ink di browser
**4.** Script akan AUTO BYPASS! ✨`,
                inline: false
            },
            {
                name: '🔧 **CARA MANUAL:**',
                value:
`**1.** Buka link di browser
**2.** Tunggu countdown selesai
**3.** Klik semua tombol yang diminta
**4.** Dapatkan link tujuan`,
                inline: false
            },
            {
                name: '💡 **TIPS:**',
                value:
`• Gunakan **AdBlock** untuk skip iklan
• Buka di **Incognito** jika diblokir
• Jangan klik iklan popup`,
                inline: false
            }
        )
        .addFields({
            name: '🔗 **LINKS:**',
            value:
`[📥 Install Script](https://github.com/ron12373/BaconButPro/raw/main/Workink.user.js)
[📂 Script GitHub](https://github.com/ron12373/BaconButPro)
[🦊 Tampermonkey Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)`,
            inline: false
        })
        .setFooter({ 
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL()
        })
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ═══════════════════════════════════════════════════════
//  🚀 LOGIN
// ═══════════════════════════════════════════════════════
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('❌ DISCORD_TOKEN tidak ada!');
    process.exit(1);
}

client.login(token);
