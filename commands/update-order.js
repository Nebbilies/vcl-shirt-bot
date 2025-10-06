const { SlashCommandBuilder } = require('discord.js');
const { getSpreadsheetData, updateSpreadsheetData } = require('./../modules/spreadsheetFunctions.js');
const serverConfig = require('../server-config.json');

const SHEET_NAME = 'shirt';
const CUSTOM_FONT_DEFAULT = 'Montserrat - Italic';
const USERID_COLUMN = 2;
const ORDERID_COLUMN = 0;
const FULLNAME_COLUMN = 3;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update-order')
        .setDescription('Update your shirt order')
        .addStringOption(option =>
            option
                .setName('orderid')
                .setDescription('Your Order ID')
                .setRequired(true)
                .setAutocomplete(true)),
    async autocomplete(interaction) {
        const rows = await getSpreadsheetData(SHEET_NAME);
        const focusedValue = interaction.options.getFocused();
        const filtered = rows.slice(1).filter(row => row[USERID_COLUMN] === interaction.user.id && row[ORDERID_COLUMN].includes(focusedValue));
        await interaction.respond(
            filtered.map(row => {
                return { name: `${row[ORDERID_COLUMN]} - ${row[FULLNAME_COLUMN]}`, value: row[ORDERID_COLUMN] };
            }).slice(0, 25),
        );
    },
    execute: async (interaction) => {
        if (interaction.channel.type !== 0) {
            return interaction.reply({
                content: '⚠️ Vui lòng sử dụng lệnh trong server!',
                ephemeral: true,
            });
        }
        const rows = await getSpreadsheetData(SHEET_NAME);
        const orderId = interaction.options.getString('orderid');
        const orderRow = rows.find((row) => row[ORDERID_COLUMN] === orderId);
        if (!orderRow) {
            return interaction.reply({
                content: ':x: Không tìm thấy ID đơn hàng.',
                ephemeral: true,
            });
        }
        if (orderRow[USERID_COLUMN] !== interaction.user.id) {
            return interaction.reply({
                content: ':x: Bạn không có quyền cập nhật đơn hàng này. Bắt được thằng doxxing ae',
                ephemeral: false,
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
        const answers = {
            name: orderRow[FULLNAME_COLUMN],
            size: orderRow[FULLNAME_COLUMN + 1],
            address: orderRow[FULLNAME_COLUMN + 2],
            phone: orderRow[FULLNAME_COLUMN + 3],
            color: orderRow[FULLNAME_COLUMN + 4],
            nickname: orderRow[FULLNAME_COLUMN + 5],
            quote: orderRow[FULLNAME_COLUMN + 6] === '' ? 'skip' : orderRow[FULLNAME_COLUMN + 6],
            customFont: orderRow[FULLNAME_COLUMN + 9] === '' ? 'skip' : orderRow[FULLNAME_COLUMN + 9],
            status: orderRow[FULLNAME_COLUMN + 7],
            date: orderRow[FULLNAME_COLUMN + 8],
        };
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
        await channel.send('>w< Trợ lý đặt áo của bạn đây nè~! Nhập thông tin mới ở chỗ bạn muốn cập nhật hoặc nhắn **"pass"** để giữ nguyên thông tin cũ nhé (´・ω・)!');
        for (const q of questions) {
            if (q.key === 'customFont') {
                if (answers.quote.toLowerCase() === 'skip') {
                    answers[q.key] = 'skip';
                    continue;
                }
            }
            await channel.send(q.question + ` (Hiện tại: **${answers[q.key]}**)`);
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
                    if (answer.toLowerCase() === 'pass') {
                        break;
                    }
                    if (q.key === 'size') {
                        const validSizes = answers.color === 'đỏ' ? ['M', 'L', 'XL'] : ['M', 'L', 'XL', 'XXL', 'XXXL'];
                        if (!validSizes.includes(answer.toUpperCase())) {
                            await channel.send(`⚠️ Size không hợp lệ! (M, L, XL${answers.color === 'đỏ' ? '' : ', XXL, XXXL'}).`);
                            continue;
                        }
                    }
                    else if (q.key === 'color') {
                        const validColors = ['đỏ', 'đen', 'trắng'];
                        answer = answer.toLowerCase();
                        switch (answer) {
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
                        if (answers.status === 'TRUE' && answers.color === 'đỏ' && (answer === 'đen' || answer === 'trắng')) {
                            await channel.send('⚠️ Bạn đã thanh toán áo đỏ, vui lòng contact hoaq để đổi sang áo đen/trắng!');
                            // no options available, break
                            break;
                        }
                        if (answers.status === 'TRUE' && (answers.color === 'đen' || answers.color === 'trắng') && answer === 'đỏ') {
                            await channel.send('⚠️ Bạn đã thanh toán áo đen/trắng, vui lòng contact hoaq để đổi sang áo đỏ!');
                            continue;
                        }
                        if (!validColors.includes(answer)) {
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
                    else if (q.key === 'quote') {
                        if (answer.status === 'TRUE' && answers.quote.toLowerCase() === 'skip') {
                            await channel.send('⚠️ Bạn đã thanh toán không in quote, vui lòng contact hoaq để in quote!');
                            // no options
                            break;
                        }
                    }
                    else if (q.key === 'customFont') {
                        const urlRegex = /^(https?:\/\/[^\s]+)$/;
                        if (answer.toLowerCase() !== 'skip' && !urlRegex.test(answer)) {
                            await channel.send('⚠️ Link không hợp lệ! Vui lòng nhập đúng định dạng URL hoặc nhắn "skip".');
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
            "content": `# Xác nhận đơn hàng áo VNOC6\n Order ID: ${orderRow[ORDERID_COLUMN]}\n\n`,
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
                    ],
                },
                {
                    "title": "Trạng thái thanh toán",
                    "fields": [
                        {
                            "name": "Trạng thái",
                            "value": answers.status === 'FALSE' ? ':x: Chưa thanh toán' : ':white_check_mark: Đã thanh toán',
                        },
                        {
                            "name": "Số tiền cần thanh toán",
                            "value": price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " VND",
                        },
                    ],
                    "color": answers.status === 'FALSE' ? 15548997 : 3066993,
                    "footer": {
                        "text": "dùng lệnh /qr để hiển thị mã QR nhận thanh toán áo!",
                    },
                },
            ],
            "attachments": [],
        });
        const newRow = [
            orderRow[ORDERID_COLUMN],
            interaction.user.username,
            interaction.user.id,
            answers.name,
            answers.size.toUpperCase(),
            answers.address,
            answers.phone,
            answers.color,
            answers.nickname,
            answers.quote.toLowerCase() === 'skip' ? '' : answers.quote,
            answers.status === 'TRUE' ? 'TRUE' : 'FALSE',
            answers.date,
            price,
            answers.customFont === 'skip' ? CUSTOM_FONT_DEFAULT : answers.customFont,
            new Date().toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }),
        ];
        const range = `${SHEET_NAME}!A${rows.indexOf(orderRow) + 1}`;
        await updateSpreadsheetData(range, [newRow]);
    },
};