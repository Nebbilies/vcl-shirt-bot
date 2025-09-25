const { SlashCommandBuilder } = require('discord.js');
require('../../auth.js');
const SHEET_NAME = 'shirt';
const { getSpreadsheetData, updateSpreadsheetData } = require('./../modules/spreadsheetFunctions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('order')
        .setDescription('Order a shirt'),
    execute: async (interaction) => {
        await interaction.reply({
            content: '📬 Mình đã gửi bạn một tin nhắn riêng, hãy trả lời mình ở đó nhé~!',
            ephemeral: true,
        });
        const questions = [
            { key: 'name', question: '👤**Tên dầy đủ** của bạn là gì?' },
            { key: 'size', question: '📏 **Size** áo bạn muốn? (XS, S, M, L, XL, XXL)' },
            { key: 'address', question: '🏠 **Địa chỉ** nhận áo của bạn là gì?' },
            { key: 'phone', question: '📞 **Số điện thoại** của bạn là gì?' },
            { key: 'color', question: '🎨 Bạn chọn màu **đỏ** hay **đen**?' },
            { key: 'nickname', question: '🏷️ **Nickname** bạn muốn in trên áo là gì?' },
            { key: 'quote', question: '💬 **Quote** bạn muốn in trên áo là gì? (Nhắn "skip" nếu không có)' },
        ];

        const channel = await interaction.user.createDM();
        const answers = {};
        await channel.send('>w< Trợ lý đặt áo của bạn đây nè~! Mình sẽ hỏi bạn một số thông tin để hoàn tất đơn đặt hàng nhé, Mwah~!');
        for (const q of questions) {
            await channel.send(q.question);
            try {
                const collected = await channel.awaitMessages({
                    filter: m => m.author.id === interaction.user.id,
                    max: 1,
                    time: 60000,
                });

                answers[q.key] = collected.first().content;
            }
             catch (e) {
                return await channel.send('⏰ TwT Mình đợi bạn hơi lâu quá, bạn có thể thử lại lệnh `/order` nhé!');
            }
        }
        await channel.send('UwU~ Cảm ơn bạn đã đặt áo! Chúng mình đã ghi nhận thông tin của bạn rồi nhé!');

        const rows = await getSpreadsheetData(SHEET_NAME);
        console.log(rows);
        // edge case: undefined if no data, hence no rows.length
        let lastId = 0;
        if (/^\d+$/.test(rows[rows.length - 1][0]) === true) {
            lastId = parseInt(rows[rows.length - 1][0]);
        }
        const newRow = [
            (lastId + 1).toString(),
            interaction.user.id,
            answers.name,
            answers.size.toUpperCase(),
            answers.address,
            answers.phone,
            answers.color,
            answers.nickname,
            answers.quote.toLowerCase() === 'skip' ? '' : answers.quote,
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
        ];
        const range = `'${SHEET_NAME}'!A${rows.length + 1}`;
        await updateSpreadsheetData(range, [newRow]);
    },
};