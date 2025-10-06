const { SlashCommandBuilder } = require('discord.js');
const qrImagePath = 'assets/qr.jpg';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qr')
        .setDescription('Get the QR code for payment'),
    async execute(interaction) {
        await interaction.reply({
            content: '📬 QR chuyển khoản đã được gửi trong DM!',
            ephemeral: true,
        });
        const channel = await interaction.user.createDM();
        await channel.send({
            content: 'QR để bạn chuyển khoản thanh toán nè~! Cảm ơn bạn đã ủng hộ VCL <3' +
                '\n **NỘI DUNG CHUYỂN KHOẢN** theo format: `VNOC6 SHIRT - [Họ tên]`',
            files: [qrImagePath],
        });
    },
};