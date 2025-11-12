const { SlashCommandBuilder } = require('discord.js');
const { getSpreadsheetData } = require('./../modules/spreadsheetFunctions.js');

const SHEET_NAME = 'shirt';
const DESIGN_COLUMN = 15;
const USERID_COLUMN = 2;
const ORDERID_COLUMN = 0;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('preview')
        .setDescription('Get design previews for your orders'),
    execute: async (interaction) => {
        const rows = await getSpreadsheetData(SHEET_NAME);
        const userOrders = rows.filter(row => row[USERID_COLUMN] === interaction.user.id);
        if (userOrders.length === 0) {
            return interaction.editReply({
                content: ':x: Bạn chưa đặt áo nào cả!',
                ephemeral: true,
            });
        }

        await interaction.reply({
            content: '📬 Kiểm tra trong DM của bạn nhé!',
            ephemeral: true,
        });

        let previewMessage = '**## Đây là các thiết kế áo của bạn:**\n\n';
        userOrders.forEach((order) => {
            const designLink = order[DESIGN_COLUMN];
            previewMessage += `Mã đơn hàng:** ${order[ORDERID_COLUMN]} **\n`;
            previewMessage += designLink ? `${designLink}\n\n` : 'Chưa có thiết kế đính kèm.\n\n';
        });
        const channel = await interaction.user.createDM();
        await channel.send(previewMessage);
    },
};