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
        await channel.send('>w< Trợ lý đặt áo của bạn đây nè~! Mình sẽ hỏi bạn một số thông tin để hoàn tất đơn đặt hàng nhé, Mwah~! (xam lon deo ban)');
        for (const q of questions) {
            await channel.send(q.question);
            while (true) {
                try {
                    const collected = await channel.awaitMessages({
                        filter: m => m.author.id === interaction.user.id,
                        max: 1,
                        // 1 minutes
                        time: 60000,
                        errors: ['time'],
                    });
                    const answer = collected.first().content.trim();
                    if (q.key === 'size') {
                        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
                        if (!validSizes.includes(answer.toUpperCase())) {
                            await channel.send('⚠️ Size không hợp lệ! (XS, S, M, L, XL, XXL).');
                            continue;
                        }
                    }
                    else if (q.key === 'color') {
                        const validColors = ['đỏ', 'đen'];
                        if (!validColors.includes(answer.toLowerCase())) {
                            await channel.send('⚠️ Màu không hợp lệ!');
                            continue;
                        }
                    }
                    else if (q.key === 'phone') {
                        const phoneRegex = /^[0-9]{10}$/;
                        if (!phoneRegex.test(answer)) {
                            await channel.send('⚠️ Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 chữ số.');
                            continue;
                        }
                    }
                    answers[q.key] = answer;
                    break;
                }
                catch (e) {
                    console.error(e);
                    await channel.send('⏰ Hết thời gian trả lời! Vui lòng bắt đầu lại quy trình đặt áo bằng lệnh /order.');
                    return;
                }
            }
        }
        await channel.send({
            "content": "# Xác nhận đơn hàng áo VNOC6\n\n",
            "embeds": [
            {
                "title": "Thông tin ship",
                "color": 8023235,
                "fields": [
                    {
                        "name": "Tên người nhận",
                        "value": answers.name,
                        "inline": true,
                    },
                    {
                        "name": "Số điện thoại",
                        "value": answers.phone,
                        "inline": true,
                    },
                    {
                        "name": "Địa chỉ",
                        "value": answers.address,
                    },
                ],
            },
            {
                "title": "Thông tin đặt áo",
                "fields": [
                    {
                        "name": "Size",
                        "value": answers.size,
                        "inline": true,
                    },
                    {
                        "name": "Màu",
                        "value": answers.color,
                        "inline": true,
                    },
                    {
                        "name": "Custom tên",
                        "value": answers.nickname,
                    },
                    {
                        "name": "Custom quote",
                        "value": answers.quote,
                    },
                    {
                        "name": "Bonus gacha sticker",
                        "value": "5",
                    },
                ],
            },
            {
                "title": "Trạng thái thanh toán",
                "fields": [
                    {
                        "name": "Trạng thái",
                        "value": "Đã thanh toán",
                    },
                    {
                        "name": "Số tiền cần thanh toán",
                        "value": "299.000 VND",
                    },
                ],
                "color": 3066993,
                "footer": {
                    "text": "dùng lệnh /qr để hiển thị mã QR nhận thanh toán áo!",
                },
            },
        ],
            "attachments": [],
        });

        const rows = await getSpreadsheetData(SHEET_NAME);
        console.log(rows);
        // edge case: undefined if no data, hence no rows.length
        let lastId = 0;
        if (/^\d+$/.test(rows[rows.length - 1][0]) === true) {
            lastId = parseInt(rows[rows.length - 1][0]);
        }
        const newRow = [
            (lastId + 1).toString(),
            interaction.user.username,
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