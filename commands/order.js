const { SlashCommandBuilder } = require('discord.js');
const { getSpreadsheetData, updateSpreadsheetData } = require('./../modules/spreadsheetFunctions.js');
const serverConfig = require('../server-config.json');

const SHEET_NAME = 'shirt';
const CUSTOM_FONT_DEFAULT = 'Montserrat - Italic';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('order')
        .setDescription('Order a shirt'),
    execute: async (interaction) => {
        if (interaction.channel.type !== 0) {
            return interaction.reply({
                content: '⚠️ Vui lòng sử dụng lệnh trong server!',
                ephemeral: true,
            });
        }
        await interaction.reply({
            content: '📬 Mình đã gửi bạn một tin nhắn riêng, hãy trả lời mình ở đó nhé~!',
            ephemeral: true,
        });
        // check if user has staff role
        const isStaff = serverConfig.staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));
        const isSponsor = serverConfig.sponsorRoles.some(roleId => interaction.member.roles.cache.has(roleId));
        const isDonator = serverConfig.donatorRoles.some(roleId => interaction.member.roles.cache.has(roleId));
        const answers = {};
        const questions = [
            { key: 'name', question: '👤**Tên dầy đủ** của bạn là gì?' },
            { key: 'color', question: '🎨 Bạn chọn màu **đỏ** hay **đen** hay **trắng**? \n (**Disclaimer**: Áo đỏ không có size XXL, XXXL, **+ 20K**, và sẽ là **gacha**, nếu không trúng thì bạn sẽ **được chọn 1 trong 2 màu còn lại**) \n' +
                    'https://s.hoaq.works/0ytJEpLnDa.jpg\n' +
                    'https://s.hoaq.works/IJIEKTrTHg.jpg\n' +
                    'https://s.hoaq.works/EcpLt9jbN8.jpg' },
            { key: 'size', question: `📏 **Size** áo bạn muốn? (M, L, XL, XXL, XXXL) \n (**Lưu ý**: Áo đỏ không có size XXL, XXXL)` },
            { key: 'address', question: '🏠 **Địa chỉ** nhận áo của bạn là gì?' },
            { key: 'phone', question: '📞 **Số điện thoại** của bạn là gì?' },
            { key: 'nickname', question: '🏷️ **Nickname** bạn muốn in trên áo là gì?' },
            { key: 'quote', question: '💬 **Quote** bạn muốn in trên áo là gì? **(+ 20K, Staff miễn phí)** (Nhắn "skip" nếu không có)' },
            { key: 'customFont', question: '✍️ **Custom font** bạn muốn cho quote? (Link đến font, nhắn "skip" để dùng **' +
                    `${CUSTOM_FONT_DEFAULT}**)` },
        ];
        const channel = await interaction.user.createDM();
        await channel.send('>w< Trợ lý đặt áo của bạn đây nè~! Mình sẽ hỏi bạn một số thông tin để hoàn tất đơn đặt hàng nhé, Mwah~! (xam lon deo ban)');
        for (const q of questions) {
            if (q.key === 'customFont') {
                if (answers.quote.toLowerCase() === 'skip') {
                    answers[q.key] = 'skip';
                    continue;
                }
            }
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
                    let answer = collected.first().content.trim();
                    if (q.key === 'size') {
                        const validSizes = answers.color === 'đỏ' ? ['M', 'L', 'XL'] : ['M', 'L', 'XL', 'XXL', 'XXXL'];
                        if (!validSizes.includes(answer.toUpperCase())) {
                            await channel.send(`⚠️ Size không hợp lệ! (M, L, XL${answers.color === 'đỏ' ? '' : ', XXL, XXXL'}).`);
                            continue;
                        }
                    }
                    else if (q.key === 'color') {
                        const validColors = ['đỏ', 'đen', 'trắng'];
                        switch (answer.toLowerCase()) {
                            case 'do':
                                answer = 'đỏ';
                                break;
                            case 'den':
                                answer = 'đen';
                                break;
                            case 'trang':
                                answer = 'trắng';
                                break;
                        }
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
        const rows = await getSpreadsheetData(SHEET_NAME);
        // edge case: undefined if no data, hence no rows.length
        let lastId = 0;
        if (/^\d+$/.test(rows[rows.length - 1][0]) === true) {
            lastId = parseInt(rows[rows.length - 1][0]);
        }
        let price = isStaff ? 199000 : 219000;
        if (answers.color === 'đỏ') {
            price += 20000;
        }
        if (answers.quote.toLowerCase() !== 'skip') {
            if (isStaff === false && isSponsor === false && isDonator === false) {
                price += 20000;
            }
        }
        if (isSponsor) {
            price = Math.round(price * 0.85 / 1000) * 1000;
        } else if (isDonator) {
            price = Math.round(price * 0.95 / 1000) * 1000;
        }
        console.log(answers);
        await channel.send({
            "content": "# Xác nhận đơn hàng áo VNOC6\n\n",
            "embeds": [
            {
                "title": "Thông tin ship",
                "color": 8023235,
                "fields": [
                    {
                        "name": "Order ID",
                        "value": (lastId + 1).toString(),
                        "inline": true,
                    },
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
                        "value": "pending",
                    },
                ],
            },
             {
                "title": "Trạng thái thanh toán",
                "fields": [
                    {
                        "name": "Trạng thái",
                        "value": `:x: Chưa thanh toán`,
                    },
                    {
                        "name": "Số tiền cần thanh toán",
                        "value": price + " VND",
                    },
                ],
                "color": 15548997,
                "footer": {
                    "text": "dùng lệnh /qr để hiển thị mã QR nhận thanh toán áo!",
                },
            },
        ],
            "attachments": [],
        });
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
            'FALSE',
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
            price,
            answers.customFont === 'skip' ? CUSTOM_FONT_DEFAULT : answers.customFont,
            // last updated
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
        ];
        const range = `'${SHEET_NAME}'!A${rows.length + 1}`;
        await updateSpreadsheetData(range, [newRow]);
    },
};