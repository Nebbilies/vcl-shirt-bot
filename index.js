const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.DirectMessages,
	],
});

client.commands = new Collection();
const getAllCommandFiles = (dirPath, arrayOfFiles) => {
	const files = fs.readdirSync(dirPath);

	arrayOfFiles = arrayOfFiles || [];

	files.forEach((file) => {
		const fullPath = path.join(dirPath, file);
		if (fs.statSync(fullPath).isDirectory()) {
			arrayOfFiles = getAllCommandFiles(fullPath, arrayOfFiles);
		}
		else if (file.endsWith('.js')) {
			arrayOfFiles.push(fullPath);
		}
	});

	return arrayOfFiles;
};

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = getAllCommandFiles(commandsPath);

for (const file of commandFiles) {
	const command = require(file);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	}
	else {
		console.log(`[WARNING] The command ${command} is missing a required "data" or "execute" property.`);
	}
}

client.once('ready', () => {
	console.log('Ohayou~');
});

client.on('messageCreate', (message) => {
	if (!message.content.startsWith('!') || message.author.bot) return;

	const args = message.content.slice(1).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName);

	if (!command) return;

	try {
		command.execute(message, args, auth);
	}
	catch (error) {
		console.error(error);
		message.reply('There was an error executing that command.');
	}
});

client.on('interactionCreate', async (interaction) => {
	if (interaction.isChatInputCommand()) {
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		try {
			await command.execute(interaction);
		}
		catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			}
			else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	}
	else if (interaction.isAutocomplete()) {
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		try {
			await command.autocomplete(interaction);
		}
		catch (error) {
			console.error(error);
		}
	}
});

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// Register all commands
(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(
			Routes.applicationCommands(config.clientId),
			{ body: client.commands.map((command) => command.data.toJSON()) },
		);

		console.log('Successfully reloaded application (/) commands.');
	}
	catch (error) {
		console.error(error);
	}
})();

client.login(config.token);
