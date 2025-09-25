const { SlashCommandBuilder } = require('discord.js');
require('../../auth.js');
const SHEET_NAME = 'shirt';
const { getSpreadsheetData } = require('./../modules/spreadsheetFunctions.js');
// hardcode af
const ORDERID_COLUMN = 0;
const FULLNAME_COLUMN = 2;

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
        const subcommand = interaction.options.getSubcommand();
        const rows = await getSpreadsheetData(SHEET_NAME);
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
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'orderid') {
            const orderId = interaction.options.getString('orderid');
            const rows = await getSpreadsheetData(SHEET_NAME);
            const orderRow = rows.find((row) => row[ORDERID_COLUMN] === orderId);
            if (!orderRow) {
                return interaction.reply({
                    content: ':x: Order ID not found.',
                    ephemeral: true,
                });
            }
            let response = `**Order Details for Order ID ${orderId}:**\n`;
            response += `👤 **Full Name:** ${orderRow[2]}\n`;
            response += `📏 **Size:** ${orderRow[3]}\n`;
            response += `🏠 **Address:** ${orderRow[4]}\n`;
            response += `📞 **Phone:** ${orderRow[5]}\n`;
            response += `🎨 **Color:** ${orderRow[6]}\n`;
            response += `🏷️ **Nickname:** ${orderRow[7]}\n`;
            response += `💬 **Quote:** ${orderRow[8] || 'N/A'}\n`;

            return interaction.reply({
                content: response,
            });
        }
    },
};