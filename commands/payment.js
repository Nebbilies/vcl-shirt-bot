const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const serverConfig = require("../server-config.json");
const { getSpreadsheetData, updateSpreadsheetData } = require('./../modules/spreadsheetFunctions.js');
const { indexToColumn } = require('./../modules/indexToColumn.js');


const ORDERID_COLUMN = 0;
const USERID_COLUMN = 2;
const FULLNAME_COLUMN = 3;
const PAYMENT_STATUS_COLUMN = 10;
const SHEET_NAME = 'shirt';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('payment')
        .setDescription('Change order payment status')
        .addStringOption(option =>
            option
                .setName('orderid')
                .setDescription('Order ID')
                .setRequired(true)
                .setAutocomplete(true),
            )
        .addStringOption(option =>
            option
                .setName('status')
                .setDescription('Payment status')
                .setRequired(true)
                .addChoices(
                    { name: 'Đã thanh toán', value: 'true' },
                    { name: 'Chưa thanh toán', value: 'false' },
                ),
        ),
    async autocomplete(interaction) {
        if (serverConfig.admins.includes(interaction.user.id) === false) {
            return interaction.respond([]);
        }
        const rows = await getSpreadsheetData(SHEET_NAME);
        const focusedValue = interaction.options.getFocused();
        const filtered = rows.slice(1).filter(row => row[ORDERID_COLUMN].includes(focusedValue));
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
        const rows = await getSpreadsheetData(SHEET_NAME);
        const orderId = interaction.options.getString('orderid');
        const orderRow = rows.find((row) => row[ORDERID_COLUMN] === orderId);
        if (!orderRow) {
            return interaction.editReply({
                content: ':x: Order ID not found.',
                ephemeral: true,
            });
        }
        const status = interaction.options.getString('status') === 'true';
        const range = `${SHEET_NAME}!${indexToColumn(PAYMENT_STATUS_COLUMN)}${rows.indexOf(orderRow) + 1}`;
        const ordererId = orderRow[USERID_COLUMN];
        try {
            await updateSpreadsheetData(range, [[status]]);
            const user = await interaction.client.users.fetch(ordererId);
            const embed = new EmbedBuilder()
                .setColor(status ? 3066993 : 15548997)
                .setTitle("Thanh toán áo VNOC6")
                .setFields(
                    {
                        name: "Mã đơn hàng",
                        value: "1",
                        inline: false,
                    },
                    {
                        name: "Trạng thái thanh toán",
                        value: status ? 'Đã thanh toán' : 'Chưa thanh toán',
                        inline: false,
                    },
                );
            await user.send({
                content: `Đơn hàng **\`${orderId}\`** của bạn đã được cập nhật trạng thái thanh toán thành **\`${status ? 'Đã thanh toán' : 'Chưa thanh toán'}\`** :3`,
                embeds: [embed],
            });
            return interaction.editReply({
                content: `:white_check_mark: Đơn hàng **\`${orderId}\`** đã được cập nhật trạng thái thanh toán thành **\`${status ? 'Đã thanh toán' : 'Chưa thanh toán'}\`**.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({
                content: ':x: There was an error while updating the payment status.',
                ephemeral: true,
            });
        }
    },
};