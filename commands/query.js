const { SlashCommandBuilder } = require('discord.js');
const SHEET_NAME = 'shirt';
const serverConfig = require('../server-config.json');
const { getSpreadsheetData } = require('./../modules/spreadsheetFunctions.js');
// hardcode af
const ORDERID_COLUMN = 0;
const FULLNAME_COLUMN = 3;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('query')
        .setDescription('Query shirt orders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('orderid')
                .setDescription('Query shirt orders by Order ID')
                .addStringOption(
                    option =>
                        option
                            .setName('orderid')
                            .setDescription('Order ID')
                            .setRequired(true)
                            .setAutocomplete(true)),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('name')
                .setDescription('Query shirt orders by full name')
                .addStringOption(
                    option =>
                        option
                            .setName('name')
                            .setDescription('Full Name of the buyer')
                            .setRequired(true)
                            .setAutocomplete(true)),
        ),
    async autocomplete(interaction) {
        if (serverConfig.admins.includes(interaction.user.id) === false) {
            return interaction.respond([]);
        }
        const subcommand = interaction.options.getSubcommand();
        const raw_rows = await getSpreadsheetData(SHEET_NAME);
        // Remove header
        const rows = raw_rows.slice(1);
        const focusedValue = interaction.options.getFocused();
        let filtered;
        if (subcommand === 'orderid') {
            focusedValue !== '' ? filtered = rows.filter(row => row[ORDERID_COLUMN] === focusedValue) : filtered = rows;
        }
        else {
            filtered = rows.filter(row => row[FULLNAME_COLUMN].includes(focusedValue));
        }
        await interaction.respond(
            filtered.map(row => {
                return { name: `${row[ORDERID_COLUMN]} - ${row[FULLNAME_COLUMN]}`, value: row[ORDERID_COLUMN] };
            }).slice(0, 25),
        );
    },
    async execute(interaction) {
        await interaction.deferReply();
        if (serverConfig.admins.includes(interaction.user.id) === false) {
            return interaction.editReply({
                content: ':x: Bạn không có quyền doxxing (ーー゛).',
                ephemeral: true,
            });
        }
        const subcommand = interaction.options.getSubcommand();
        const rows = await getSpreadsheetData(SHEET_NAME);
        let orderRow;
        if (subcommand === 'orderid') {
            const orderId = interaction.options.getString('orderid');
            orderRow = rows.find((row) => row[ORDERID_COLUMN] === orderId);
            if (!orderRow) {
                return interaction.editReply({
                    content: ':x: Order ID not found.',
                    ephemeral: true,
                });
            }
        } else {
            const orderId = interaction.options.getString('name');
            // dung r ko nham dau
            orderRow = rows.find((row) => row[ORDERID_COLUMN] === orderId);
            if (!orderRow) {
                return interaction.editReply({
                    content: ':x: Name not found.',
                    ephemeral: true,
                });
            }
        }
            const start = FULLNAME_COLUMN;
            const answers = {
                name: orderRow[start],
                phone: orderRow[start + 3],
                address: orderRow[start + 2],
                size: orderRow[start + 1],
                color: orderRow[start + 4],
                nickname: orderRow[start + 5],
                status: orderRow[start + 7],
                quote: orderRow[start + 6],
                price: orderRow[start + 9],
            };
            return interaction.editReply({
                "content": `# Đơn hàng áo VNOC6\n\n Order ID: ${orderRow[0]}\n\n`,
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
                                "value": `${answers.status === 'FALSE' ? ':x: Chưa thanh toán' : ':white_check_mark: Đã thanh toán'}`,
                            },
                            {
                                "name": "Số tiền cần thanh toán",
                                "value": answers.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " VND",
                            },
                        ],
                        "color": answers.status === 'FALSE' ? 15548997 : 65280,
                        "footer": {
                            "text": "dùng lệnh /qr để hiển thị mã QR nhận thanh toán áo!",
                        },
                    },
                ],
                "attachments": [],
            });
    },
};